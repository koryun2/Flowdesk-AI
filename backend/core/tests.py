from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.db import OperationalError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from organizations.models import Membership


class WorkspaceFlowTests(APITestCase):
    def setUp(self):
        self.analysis = patch(
            "ai_ops.services.request_ticket_analysis",
            return_value={
                "category": "bug",
                "priority": "urgent",
                "summary": "Exports above 50,000 rows time out.",
                "sentiment": "negative",
                "suggested_tags": ["bug"],
                "confidence": 0.8,
                "model_name": "flowdesk-local",
                "prompt_version": "ticket-analysis-v1",
            },
        )
        self.analysis.start()
        self.addCleanup(self.analysis.stop)

    def test_register_login_and_ticket_flow(self):
        registered = self.client.post(
            reverse("auth-register"),
            {
                "name": "Ada Lovelace",
                "email": "ada@example.com",
                "password": "Flowdesk-Test-Pass-91",
                "workspace_name": "Analytical Engines",
            },
            format="json",
        )
        self.assertEqual(registered.status_code, status.HTTP_201_CREATED)
        access = registered.data["access"]
        refresh = self.client.post(
            reverse("auth-token-refresh"),
            {"refresh": registered.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        customer = self.client.post(
            reverse("customer-list"),
            {
                "name": "Marcus Lee",
                "email": "marcus@lumon.co",
                "company": "Lumon",
                "plan": "Growth",
            },
            format="json",
        )
        self.assertEqual(customer.status_code, status.HTTP_201_CREATED)

        short_ticket = self.client.post(
            reverse("ticket-list"),
            {
                "title": "Bug",
                "description": "Too short",
                "customer_id": customer.data["id"],
            },
            format="json",
        )
        self.assertEqual(short_ticket.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", short_ticket.data)

        ticket = self.client.post(
            reverse("ticket-list"),
            {
                "title": "CSV export fails",
                "description": "Exports above 50,000 rows time out.",
                "priority": "urgent",
                "customer_id": customer.data["id"],
            },
            format="json",
        )
        self.assertEqual(ticket.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ticket.data["key"], "FD-1001")

        comment = self.client.post(
            reverse("ticket-comments", args=[ticket.data["id"]]),
            {"body": "Reproduced with a large file.", "is_internal": True},
            format="json",
        )
        listing = self.client.get(reverse("ticket-list"), {"search": "FD-1001", "priority": "urgent"})
        volume = self.client.get(reverse("ticket-volume"), {"days": 7})

        self.assertEqual(comment.status_code, status.HTTP_201_CREATED)
        self.assertEqual(listing.data["count"], 1)
        self.assertEqual(len(volume.data["points"]), 7)

    def test_anonymous_requests_are_rejected_and_docs_stay_public(self):
        tickets = self.client.get(reverse("ticket-list"))
        health = self.client.get(reverse("health-check"))
        schema = self.client.get(reverse("schema"))

        self.assertEqual(tickets.status_code, status.HTTP_401_UNAUTHORIZED)
        ready = self.client.get(reverse("ready-check"))

        self.assertEqual(health.status_code, status.HTTP_200_OK)
        self.assertEqual(ready.status_code, status.HTTP_200_OK)
        self.assertEqual(ready.data["database"], "ok")
        self.assertEqual(schema.status_code, status.HTTP_200_OK)
        self.assertIn("/api/v1/tickets/", schema.content.decode())

    def test_readiness_reports_a_database_outage(self):
        with patch("core.views.connection.cursor", side_effect=OperationalError("down")):
            response = self.client.get(reverse("ready-check"))
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_production_settings_reject_development_defaults(self):
        from config.production import validate_production_settings

        with self.assertRaises(ImproperlyConfigured):
            validate_production_settings(
                environment="production",
                debug=False,
                secret_key="unsafe-development-key",
                allowed_hosts=["localhost"],
            )
        validate_production_settings(
            environment="development",
            debug=True,
            secret_key="unsafe-development-key",
            allowed_hosts=["localhost"],
        )

    def test_viewer_cannot_create_tickets(self):
        from core.testing import workspace

        client, _, _ = workspace(
            role=Membership.Role.VIEWER,
            email="viewer@example.com",
            slug="viewer-labs",
        )
        response = client.post(
            reverse("ticket-list"),
            {
                "title": "Viewer ticket",
                "description": "Viewers should not be able to create this.",
                "customer_id": "00000000-0000-0000-0000-000000000000",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
