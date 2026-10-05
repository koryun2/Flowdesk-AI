from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import workspace
from organizations.models import Membership


class WorkspaceSettingsTests(APITestCase):
    def setUp(self):
        self.client, self.user, self.organization = workspace()

    def test_analysis_is_off_until_saved(self):
        response = self.client.get(reverse("workspace-settings"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["auto_analyze_tickets"])
        self.assertTrue(response.data["require_agent_approval"])
        self.assertEqual(response.data["analysis_model"], "gemma-4-26b-a4b-it")

    def test_saved_settings_stay_on_the_workspace(self):
        saved = self.client.patch(
            reverse("workspace-settings"),
            {
                "auto_analyze_tickets": True,
                "require_agent_approval": False,
                "analysis_model": "gemini-3.6-flash",
            },
            format="json",
        )
        self.organization.refresh_from_db()
        again = self.client.get(reverse("workspace-settings"))

        self.assertEqual(saved.status_code, status.HTTP_200_OK)
        self.assertTrue(self.organization.auto_analyze_tickets)
        self.assertFalse(self.organization.require_agent_approval)
        self.assertEqual(self.organization.analysis_model, "gemini-3.6-flash")
        self.assertEqual(again.data["analysis_model"], "gemini-3.6-flash")

    def test_agents_cannot_change_settings(self):
        agent_client, _agent, _organization = workspace(
            role=Membership.Role.AGENT,
            email="agent@example.com",
            slug="agent-labs",
        )
        response = agent_client.patch(
            reverse("workspace-settings"),
            {"auto_analyze_tickets": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_workspace_name_and_usage_are_stored(self):
        renamed = self.client.patch(
            reverse("workspace-settings"),
            {"name": "Flowdesk Labs", "slug": "flowdesk-labs"},
            format="json",
        )
        usage = self.client.get(reverse("workspace-usage"))

        self.organization.refresh_from_db()
        self.assertEqual(renamed.status_code, status.HTTP_200_OK)
        self.assertEqual(self.organization.name, "Flowdesk Labs")
        self.assertEqual(self.organization.slug, "flowdesk-labs")
        self.assertEqual(usage.data["actions_this_month"], 0)
