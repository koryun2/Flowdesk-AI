from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ai_ops.client import AnalysisError
from core.testing import workspace
from organizations.models import Membership


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


class TicketApiTests(APITestCase):
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
            {
                "name": "Marcus Lee",
                "email": "marcus@lumon.co",
                "company": "Lumon",
            },
            format="json",
        ).data

    def test_create_filters_search_and_pagination(self):
        urgent = self._create("CSV export fails", "urgent")
        self._create("Billing receipt", "low")
        listing = self.client.get(
            reverse("ticket-list"),
            {"priority": "urgent", "search": "FD-%s" % urgent.data["number"]},
        )
        by_priority = self.client.get(reverse("ticket-list"), {"ordering": "-priority"})
        page = self.client.get(reverse("ticket-list"), {"page_size": 1, "page": 2})
        invalid = self.client.get(reverse("ticket-list"), {"ordering": "password"})
        summary = self.client.get(reverse("ticket-summary"))

        self.assertEqual(urgent.status_code, status.HTTP_201_CREATED)
        self.assertEqual(urgent.data["key"], "FD-1001")
        self.assertEqual(listing.data["count"], 1)
        self.assertEqual(by_priority.data["results"][0]["priority"], "urgent")
        self.assertEqual(page.data["count"], 2)
        self.assertEqual(len(page.data["results"]), 1)
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(summary.data["open"], 2)
        self.assertEqual(summary.data["urgent"], 1)

    def test_customer_and_assignee_must_belong_to_workspace(self):
        outsider, outsider_user, _ = workspace(email="outsider@example.com", slug="outside")
        foreign_customer = outsider.post(
            reverse("customer-list"),
            {"name": "Private", "email": "private@example.com", "company": "Private"},
            format="json",
        )
        cross_customer = self._create(
            "Cross tenant",
            "high",
            customer_id=foreign_customer.data["id"],
        )
        cross_assignee = self._create("Wrong assignee", "low", assignee_id=str(outsider_user.id))
        hidden = outsider.get(reverse("ticket-detail", args=[self._create("Visible", "low").data["id"]]))

        self.assertEqual(cross_customer.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(cross_assignee.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(hidden.status_code, status.HTTP_404_NOT_FOUND)

    def test_comments_resolution_and_role_rules(self):
        ticket = self._create("CSV export fails", "urgent")
        comment = self.client.post(
            reverse("ticket-comments", args=[ticket.data["id"]]),
            {"body": "Reproduced with 72k rows.", "is_internal": True},
            format="json",
        )
        other = self._create("Second ticket", "low")
        wrong_parent = self.client.post(
            reverse("ticket-comments", args=[other.data["id"]]),
            {"body": "Reply", "parent": comment.data["comments"][0]["id"]},
            format="json",
        )
        empty = self.client.post(
            reverse("ticket-comments", args=[ticket.data["id"]]),
            {"body": "   "},
            format="json",
        )
        resolved = self.client.patch(
            reverse("ticket-detail", args=[ticket.data["id"]]),
            {"status": "resolved"},
            format="json",
        )
        reopened = self.client.patch(
            reverse("ticket-detail", args=[ticket.data["id"]]),
            {"status": "investigating"},
            format="json",
        )
        viewer, _, _ = workspace(
            role=Membership.Role.VIEWER,
            email="viewer@example.com",
            slug="viewer-labs",
        )
        forbidden = viewer.post(
            reverse("ticket-list"),
            {
                "title": "Viewer ticket",
                "description": "Viewers should not create tickets.",
                "customer_id": self.customer["id"],
            },
            format="json",
        )
        agent, _, _ = workspace(
            role=Membership.Role.AGENT,
            email="agent@example.com",
            slug="agent-labs",
        )
        # Agent belongs to a different workspace, so deletion is checked with an admin below.
        admin_client, _, _ = workspace(
            role=Membership.Role.ADMIN,
            email="admin@example.com",
            slug="admin-labs",
        )
        agent_ticket = agent.post(
            reverse("customer-list"),
            {"name": "Agent Customer", "email": "agent-customer@example.com", "company": "Agent Co"},
            format="json",
        )
        created = agent.post(
            reverse("ticket-list"),
            {
                "title": "Agent created ticket",
                "description": "Agents can create and update tickets.",
                "customer_id": agent_ticket.data["id"],
            },
            format="json",
        )
        agent_delete = agent.delete(reverse("ticket-detail", args=[created.data["id"]]))
        admin_customer = admin_client.post(
            reverse("customer-list"),
            {"name": "Admin Customer", "email": "admin-customer@example.com", "company": "Admin Co"},
            format="json",
        )
        admin_ticket = admin_client.post(
            reverse("ticket-list"),
            {
                "title": "Admin ticket",
                "description": "Admins can delete tickets.",
                "customer_id": admin_customer.data["id"],
            },
            format="json",
        )
        admin_delete = admin_client.delete(
            reverse("ticket-detail", args=[admin_ticket.data["id"]])
        )

        self.assertEqual(comment.status_code, status.HTTP_201_CREATED)
        self.assertTrue(comment.data["comments"][0]["is_internal"])
        self.assertEqual(wrong_parent.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(empty.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsNotNone(resolved.data["resolved_at"])
        self.assertIsNone(reopened.data["resolved_at"])
        self.assertEqual(reopened.data["status"], "investigating")
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(agent_delete.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(admin_delete.status_code, status.HTTP_204_NO_CONTENT)

    def test_creation_skips_analysis_by_default(self):
        created = self._create("CSV export fails above 50k rows", "urgent")
        detail = self.client.get(reverse("ticket-detail", args=[created.data["id"]]))

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(detail.data["analysis"])

    def test_creation_stores_structured_analysis(self):
        self.organization.auto_analyze_tickets = True
        self.organization.save(update_fields=["auto_analyze_tickets"])
        created = self._create("CSV export fails above 50k rows", "urgent")
        detail = self.client.get(reverse("ticket-detail", args=[created.data["id"]]))
        analysis = detail.data["analysis"]

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(analysis["status"], "completed")
        self.assertEqual(analysis["category"], "bug")
        self.assertEqual(analysis["priority"], "urgent")
        self.assertEqual(analysis["sentiment"], "negative")
        self.assertEqual(analysis["suggested_tags"], ["bug", "export"])
        self.assertEqual(analysis["confidence"], 0.86)
        self.assertEqual(analysis["model_name"], "flowdesk-local")
        self.assertTrue(analysis["summary"])
        self.assertIn(
            "analyzed ticket",
            [item["action"] for item in detail.data["activity"]],
        )

    def test_analysis_failure_still_creates_the_ticket(self):
        self.organization.auto_analyze_tickets = True
        self.organization.save(update_fields=["auto_analyze_tickets"])
        with patch(
            "ai_ops.services.request_ticket_analysis",
            side_effect=AnalysisError("AI service is unavailable."),
        ):
            created = self._create("CSV export fails above 50k rows", "urgent")
        detail = self.client.get(reverse("ticket-detail", args=[created.data["id"]]))
        retry = self.client.post(reverse("ticket-analyze", args=[created.data["id"]]))

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(detail.data["analysis"]["status"], "failed")
        self.assertEqual(retry.status_code, status.HTTP_200_OK)
        self.assertEqual(retry.data["analysis"]["status"], "completed")
        self.assertEqual(retry.data["analysis"]["category"], "bug")

    def test_viewers_cannot_request_analysis(self):
        ticket = self._create("CSV export fails above 50k rows", "urgent")
        viewer_client, viewer, _organization = workspace(
            role=Membership.Role.VIEWER,
            email="viewer@example.com",
            slug="viewer-labs",
        )
        Membership.objects.filter(user=viewer).update(organization=self.organization)
        forbidden = viewer_client.post(reverse("ticket-analyze", args=[ticket.data["id"]]))

        self.assertEqual(ticket.status_code, status.HTTP_201_CREATED)
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

    def test_volume_report_counts_created_tickets(self):
        self._create("CSV export fails", "urgent")
        report = self.client.get(reverse("ticket-volume"), {"days": 7})
        invalid = self.client.get(reverse("ticket-volume"), {"days": 2})

        self.assertEqual(report.status_code, status.HTTP_200_OK)
        self.assertEqual(len(report.data["points"]), 7)
        self.assertGreaterEqual(sum(point["created"] for point in report.data["points"]), 1)
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_tags_and_members(self):
        tag = self.client.post(
            reverse("tag-list"),
            {"name": "export", "color": "#4f46e5"},
            format="json",
        )
        duplicate = self.client.post(
            reverse("tag-list"),
            {"name": "Export", "color": "#112233"},
            format="json",
        )
        ticket = self._create("Tagged", "high", tag_ids=[tag.data["id"]])
        filtered = self.client.get(reverse("ticket-list"), {"tag": tag.data["id"]})
        members = self.client.get(reverse("workspace-members"))

        self.assertEqual(tag.status_code, status.HTTP_201_CREATED)
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(filtered.data["count"], 1)
        self.assertEqual(ticket.data["tags"][0]["name"], "export")
        self.assertEqual(members.data[0]["email"], self.user.email)

    def _create(self, title, priority, customer_id=None, assignee_id=None, tag_ids=None):
        payload = {
            "title": title,
            "description": "Enough detail to reproduce the customer issue.",
            "priority": priority,
            "customer_id": customer_id or self.customer["id"],
        }
        if assignee_id is not None:
            payload["assignee_id"] = assignee_id
        if tag_ids is not None:
            payload["tag_ids"] = tag_ids
        return self.client.post(reverse("ticket-list"), payload, format="json")
