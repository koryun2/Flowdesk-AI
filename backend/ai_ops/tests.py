from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import workspace
from organizations.models import Membership

from .models import AgentAction, AgentConversation


ANALYSIS = {
    "category": "bug",
    "priority": "urgent",
    "summary": "Large CSV exports time out above 50,000 rows.",
    "sentiment": "negative",
    "suggested_tags": ["bug", "export"],
    "confidence": 0.86,
    "model_name": "flowdesk-local",
    "prompt_version": "ticket-analysis-v1",
}


class AgentApiTests(APITestCase):
    def setUp(self):
        self.client, self.user, self.organization = workspace()
        self.analysis = patch(
            "ai_ops.services.request_ticket_analysis",
            return_value=ANALYSIS,
        )
        self.analysis.start()
        self.addCleanup(self.analysis.stop)
        self.customer = self.client.post(
            reverse("customer-list"),
            {"name": "Marcus Lee", "email": "marcus@lumon.co", "company": "Lumon"},
            format="json",
        ).data
        self.ticket = self.client.post(
            reverse("ticket-list"),
            {
                "title": "CSV export fails above 50k rows",
                "description": "Large exports time out and block the finance reconciliation.",
                "priority": "urgent",
                "customer_id": self.customer["id"],
            },
            format="json",
        ).data

    def test_search_uses_workspace_tickets(self):
        with self._plan(
            [{"name": "search_tickets", "arguments": {"query": "export", "status": "open"}}]
        ):
            response = self.client.post(
                reverse("agent-turn"),
                {"message": "Find unresolved export bugs"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.ticket["key"], response.data["content"])
        self.assertIn(f"/tickets/{self.ticket['id']}", response.data["content"])
        self.assertEqual(response.data["tool_calls"][0]["name"], "search_tickets")
        self.assertEqual(response.data["tool_calls"][0]["status"], "completed")
        self.assertEqual(AgentAction.objects.count(), 0)

    def test_ticket_update_waits_for_approval(self):
        with self._plan(
            [
                {
                    "name": "update_ticket",
                    "arguments": {"ticket": self.ticket["key"], "status": "resolved"},
                }
            ]
        ):
            proposed = self.client.post(
                reverse("agent-turn"),
                {"message": f"Resolve {self.ticket['key']}"},
                format="json",
            )
        action_id = proposed.data["tool_calls"][0]["id"]
        unchanged = self.client.get(reverse("ticket-detail", args=[self.ticket["id"]]))
        approved = self.client.post(reverse("agent-action", args=[action_id, "approve"]))
        updated = self.client.get(reverse("ticket-detail", args=[self.ticket["id"]]))
        repeat = self.client.post(reverse("agent-action", args=[action_id, "approve"]))

        self.assertEqual(proposed.data["tool_calls"][0]["status"], "approval_required")
        self.assertEqual(unchanged.data["status"], "new")
        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        self.assertEqual(approved.data["status"], "completed")
        self.assertEqual(updated.data["status"], "resolved")
        self.assertEqual(repeat.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_leaves_the_ticket_unchanged(self):
        with self._plan(
            [
                {
                    "name": "add_ticket_comment",
                    "arguments": {
                        "ticket": self.ticket["key"],
                        "body": "The worker timeout was raised.",
                        "is_internal": True,
                    },
                }
            ]
        ):
            proposed = self.client.post(
                reverse("agent-turn"),
                {"message": f"Add an internal note to {self.ticket['key']} that the worker timeout was raised"},
                format="json",
            )
        action_id = proposed.data["tool_calls"][0]["id"]
        cancelled = self.client.post(reverse("agent-action", args=[action_id, "cancel"]))
        detail = self.client.get(reverse("ticket-detail", args=[self.ticket["id"]]))

        self.assertEqual(cancelled.data["status"], "cancelled")
        self.assertEqual(detail.data["comments"], [])

    def test_create_ticket_is_validated_on_approval(self):
        with self._plan(
            [
                {
                    "name": "create_ticket",
                    "arguments": {
                        "customer": "Lumon",
                        "title": "Webhook retries stop",
                        "description": "Billing webhooks are not retried after the second failure.",
                        "priority": "high",
                    },
                }
            ]
        ):
            proposed = self.client.post(
                reverse("agent-turn"),
                {"message": "Create a ticket for Lumon about webhook retries"},
                format="json",
            )
        approved = self.client.post(
            reverse("agent-action", args=[proposed.data["tool_calls"][0]["id"], "approve"])
        )
        listing = self.client.get(reverse("ticket-list"), {"search": "Webhook retries"})

        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        self.assertIn("Created [FD-", approved.data["result"])
        self.assertIn("](/tickets/", approved.data["result"])
        self.assertEqual(listing.data["count"], 1)
        self.assertEqual(listing.data["results"][0]["source"], "agent")

    def test_unknown_ticket_is_not_stored_for_approval(self):
        with self._plan(
            [{"name": "update_ticket", "arguments": {"ticket": "FD-9999", "status": "closed"}}]
        ):
            response = self.client.post(
                reverse("agent-turn"),
                {"message": "Close FD-9999"},
                format="json",
            )

        self.assertEqual(response.data["tool_calls"][0]["status"], "completed")
        self.assertIn("not in this workspace", response.data["content"])
        self.assertEqual(AgentAction.objects.count(), 0)

    def test_viewers_can_search_but_cannot_change_tickets(self):
        viewer_client, viewer, _organization = workspace(
            role=Membership.Role.VIEWER,
            email="viewer@example.com",
            slug="viewer-labs",
        )
        Membership.objects.filter(user=viewer).update(organization=self.organization)
        with self._plan(
            [{"name": "search_tickets", "arguments": {"query": "export", "status": "open"}}]
        ):
            allowed = viewer_client.post(
                reverse("agent-turn"),
                {"message": "Find unresolved export bugs"},
                format="json",
            )
        with self._plan(
            [
                {
                    "name": "update_ticket",
                    "arguments": {"ticket": self.ticket["key"], "status": "closed"},
                }
            ]
        ):
            blocked = viewer_client.post(
                reverse("agent-turn"),
                {"message": f"Close {self.ticket['key']}"},
                format="json",
            )
            owner_proposal = self.client.post(
                reverse("agent-turn"),
                {"message": f"Close {self.ticket['key']}"},
                format="json",
            )

        self.assertEqual(allowed.status_code, status.HTTP_200_OK)
        self.assertIn(self.ticket["key"], allowed.data["content"])
        self.assertIn("agent needs", blocked.data["content"])
        self.assertEqual(AgentAction.objects.filter(actor=viewer).count(), 0)
        self.assertEqual(owner_proposal.status_code, status.HTTP_200_OK)
        self.assertEqual(owner_proposal.data["tool_calls"][0]["status"], "approval_required")

    def test_other_workspaces_cannot_approve_an_action(self):
        with self._plan(
            [
                {
                    "name": "update_ticket",
                    "arguments": {"ticket": self.ticket["key"], "status": "closed"},
                }
            ]
        ):
            proposed = self.client.post(
                reverse("agent-turn"),
                {"message": f"Close {self.ticket['key']}"},
                format="json",
            )
        outsider, _user, _organization = workspace(email="outsider@example.com", slug="outside")
        hidden = outsider.post(
            reverse("agent-action", args=[proposed.data["tool_calls"][0]["id"], "approve"])
        )
        self.assertEqual(hidden.status_code, status.HTTP_404_NOT_FOUND)

    def test_knowledge_tool_returns_the_cited_answer(self):
        with (
            self._plan(
                [
                    {
                        "name": "search_knowledge_base",
                        "arguments": {"question": "How do exports over 50,000 rows work?"},
                    }
                ]
            ),
            patch(
                "ai_ops.agent_service.answer_question",
                return_value={
                    "answer": "Export links remain active for 24 hours.",
                    "sources": [{"title": "Export limits"}],
                },
            ),
        ):
            response = self.client.post(
                reverse("agent-turn"),
                {"message": "Search docs for export limits"},
                format="json",
            )

        self.assertIn("24 hours", response.data["content"])
        self.assertIn("Export limits", response.data["content"])
        self.assertEqual(response.data["tool_calls"][0]["name"], "search_knowledge_base")

    def test_phrase_search_still_finds_the_keyword(self):
        with self._plan(
            [{"name": "search_tickets", "arguments": {"query": "export bugs", "status": "open"}}]
        ):
            response = self.client.post(
                reverse("agent-turn"),
                {"message": "Find unresolved export bugs"},
                format="json",
            )

        self.assertIn(self.ticket["key"], response.data["content"])
        self.assertIn("about export bugs", response.data["content"])

    def test_customer_roster_counts_the_workspace(self):
        with self._plan([{"name": "get_customer", "arguments": {"scope": "all"}}]):
            response = self.client.post(
                reverse("agent-turn"),
                {"message": "How many customers do we have?"},
                format="json",
            )

        self.assertIn("1 customer", response.data["content"])
        self.assertIn("Marcus Lee", response.data["content"])

    def test_empty_ticket_search_asks_for_a_subject(self):
        with self._plan([{"name": "search_tickets", "arguments": {}}]):
            response = self.client.post(
                reverse("agent-turn"),
                {"message": "all"},
                format="json",
            )

        self.assertIn("which tickets", response.data["content"])
        self.assertNotIn(self.ticket["key"], response.data["content"])

    def test_conversations_are_kept(self):
        with self._plan([{"name": "get_customer", "arguments": {"scope": "all"}}]):
            first = self.client.post(
                reverse("agent-turn"),
                {"message": "How many customers do we have?"},
                format="json",
            )
            second = self.client.post(
                reverse("agent-turn"),
                {
                    "message": "all of them",
                    "conversation_id": first.data["conversation_id"],
                },
                format="json",
            )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["conversation_id"], second.data["conversation_id"])
        listing = self.client.get(reverse("agent-conversations"))
        detail = self.client.get(
            reverse("agent-conversation", args=[first.data["conversation_id"]])
        )

        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 1)
        self.assertEqual(listing.data[0]["title"], "How many customers do we have?")
        self.assertEqual(
            [item["role"] for item in detail.data["messages"]],
            ["user", "assistant", "user", "assistant"],
        )
        self.assertEqual(detail.data["messages"][0]["content"], "How many customers do we have?")
        self.assertEqual(detail.data["messages"][2]["content"], "all of them")

    def test_unknown_conversation_is_rejected(self):
        with self._plan([]):
            response = self.client.post(
                reverse("agent-turn"),
                {
                    "message": "Find unresolved export bugs",
                    "conversation_id": "00000000-0000-0000-0000-000000000000",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AgentConversation.objects.count(), 0)

    def test_follow_up_sends_saved_messages_and_the_workspace_model(self):
        self.organization.analysis_model = "gemini-3.6-flash"
        self.organization.save(update_fields=["analysis_model"])
        seen = []

        def capture(message, prior="", model=""):
            seen.append({"message": message, "prior": prior, "model": model})
            return {
                "tool_calls": [{"name": "get_customer", "arguments": {"scope": "all"}}],
                "reply": "",
                "model_name": model,
            }

        with patch("ai_ops.agent_service.request_plan", side_effect=capture):
            first = self.client.post(
                reverse("agent-turn"),
                {"message": "How many customers do we have?"},
                format="json",
            )
            self.client.post(
                reverse("agent-turn"),
                {
                    "message": "list the second one",
                    "conversation_id": first.data["conversation_id"],
                    "prior": "client prior that should be ignored",
                },
                format="json",
            )

        self.assertEqual(seen[0]["prior"], "")
        self.assertEqual(seen[0]["model"], "gemini-3.6-flash")
        self.assertIn("How many customers do we have?", seen[1]["prior"])
        self.assertNotIn("client prior", seen[1]["prior"])
        self.assertEqual(seen[1]["model"], "gemini-3.6-flash")

    def _plan(self, calls, reply=""):
        return patch(
            "ai_ops.agent_service.request_plan",
            return_value={"tool_calls": calls, "reply": reply, "model_name": "test-agent"},
        )
