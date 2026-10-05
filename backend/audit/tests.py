from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import workspace


class NotificationTests(APITestCase):
    def setUp(self):
        self.client, self.user, self.organization = workspace()
        self.customer = self.client.post(
            reverse("customer-list"),
            {"name": "Marcus Lee", "email": "marcus@lumon.co", "company": "Lumon"},
            format="json",
        ).data

    def test_ticket_creation_notifies_workspace_members(self):
        ticket = self.client.post(
            reverse("ticket-list"),
            {
                "title": "CSV export fails above 50k rows",
                "description": "Large exports time out and block the finance reconciliation.",
                "priority": "urgent",
                "customer_id": self.customer["id"],
            },
            format="json",
        )
        listing = self.client.get(reverse("notifications"))
        notification = listing.data["results"][0]
        read = self.client.post(reverse("notification-read", args=[notification["id"]]))
        again = self.client.get(reverse("notifications"))

        self.assertEqual(ticket.status_code, status.HTTP_201_CREATED)
        self.assertEqual(listing.data["unread_count"], 1)
        self.assertEqual(notification["title"], "New ticket")
        self.assertEqual(notification["detail"], "CSV export fails above 50k rows")
        self.assertEqual(notification["link"], f"/tickets/{ticket.data['id']}")
        self.assertEqual(read.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(again.data["unread_count"], 0)
        self.assertTrue(again.data["results"][0]["read"])
