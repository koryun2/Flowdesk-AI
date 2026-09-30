from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import workspace
from organizations.models import Membership


class CustomerApiTests(APITestCase):
    def setUp(self):
        self.client, self.user, self.organization = workspace()
        self.analysis = patch(
            "ai_ops.services.request_ticket_analysis",
            return_value={
                "category": "bug",
                "priority": "high",
                "summary": "Large exports stop responding.",
                "sentiment": "negative",
                "suggested_tags": ["bug", "export"],
                "confidence": 0.8,
                "model_name": "flowdesk-local",
                "prompt_version": "ticket-analysis-v1",
            },
        )
        self.analysis.start()
        self.addCleanup(self.analysis.stop)

    def test_create_list_search_and_pagination(self):
        self._create("Northstar Labs", "amelia@northstar.io")
        self._create("Cedar Finance", "owen@cedar.finance")

        listed = self.client.get(reverse("customer-list"), {"search": "cedar"})
        ordered = self.client.get(reverse("customer-list"), {"ordering": "-name"})
        page = self.client.get(reverse("customer-list"), {"page_size": 1})
        summary = self.client.get(reverse("customer-summary"))

        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(listed.data["count"], 1)
        self.assertEqual(listed.data["results"][0]["company"], "Cedar Finance")
        self.assertEqual(ordered.data["results"][0]["name"], "Owen Wright")
        self.assertEqual(page.data["count"], 2)
        self.assertEqual(len(page.data["results"]), 1)
        self.assertEqual(summary.data["total"], 2)

    def test_duplicate_email_and_cross_workspace_lookup(self):
        created = self._create("Northstar Labs", "amelia@northstar.io")
        duplicate = self._create("Other", "Amelia@northstar.io")
        outsider, _, _ = workspace(email="outsider@example.com", slug="outside")

        hidden = outsider.get(reverse("customer-detail", args=[created.data["id"]]))
        anonymous = APITestCase.client_class().get(reverse("customer-list"))

        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(hidden.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(anonymous.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_viewer_can_read_but_cannot_create(self):
        client, _, _ = workspace(
            role=Membership.Role.VIEWER,
            email="viewer@example.com",
            slug="viewer-labs",
        )
        response = client.post(
            reverse("customer-list"),
            {"name": "Blocked", "email": "blocked@example.com", "company": "Blocked"},
            format="json",
        )
        listing = client.get(reverse("customer-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(listing.status_code, status.HTTP_200_OK)

    def test_customer_with_tickets_cannot_be_deleted(self):
        customer = self._create("Northstar Labs", "amelia@northstar.io")
        ticket = self.client.post(
            reverse("ticket-list"),
            {
                "title": "Export timeout",
                "description": "Large exports stop responding.",
                "customer_id": customer.data["id"],
            },
            format="json",
        )
        blocked = self.client.delete(reverse("customer-detail", args=[customer.data["id"]]))

        self.assertEqual(ticket.status_code, status.HTTP_201_CREATED)
        self.assertEqual(blocked.status_code, status.HTTP_409_CONFLICT)

    def _create(self, company, email, name=None):
        return self.client.post(
            reverse("customer-list"),
            {
                "name": name or email.split("@")[0].title() + " Wright"
                if "owen" in email
                else "Amelia Rodriguez",
                "email": email,
                "company": company,
                "plan": "Enterprise",
            },
            format="json",
        )
