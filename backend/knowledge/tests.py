from unittest.mock import patch
from urllib.error import URLError

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.testing import workspace
from knowledge.client import KnowledgeAIError
from organizations.models import Membership


EXPORT_GUIDE = (
    "Customers should export datasets above 50,000 rows through the background export endpoint, "
    "then poll the job until a signed download URL is returned. Export links remain active for 24 hours. "
    "Smaller exports can download immediately."
)


class KnowledgeApiTests(APITestCase):
    def setUp(self):
        self.client, self.user, self.organization = workspace()
        self.embeddings = patch(
            "knowledge.services.request_embeddings",
            side_effect=KnowledgeAIError("AI service is unavailable."),
        )
        self.answers = patch(
            "knowledge.services.request_answer",
            side_effect=KnowledgeAIError("AI service is unavailable."),
        )
        self.embeddings.start()
        self.answers.start()
        self.addCleanup(self.embeddings.stop)
        self.addCleanup(self.answers.stop)

    def test_text_document_is_chunked_and_answers_with_a_source(self):
        created = self.client.post(
            reverse("document-list"),
            {
                "title": "Export limits and large dataset guide",
                "source_type": "text",
                "content": EXPORT_GUIDE,
            },
            format="json",
        )
        summary = self.client.get(reverse("document-summary"))
        answer = self.client.post(
            reverse("document-ask"),
            {"question": "How should customers export datasets over 50,000 rows?"},
            format="json",
        )

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["status"], "ready")
        self.assertGreaterEqual(created.data["chunk_count"], 1)
        self.assertEqual(summary.data["documents"], 1)
        self.assertEqual(summary.data["chunks"], created.data["chunk_count"])
        self.assertIn("24 hours", answer.data["answer"])
        self.assertEqual(answer.data["sources"][0]["title"], "Export limits and large dataset guide")
        self.assertGreater(answer.data["sources"][0]["relevance"], 0.15)

    def test_duplicate_content_private_urls_and_workspace_isolation(self):
        payload = {
            "title": "Roles",
            "source_type": "text",
            "content": "Workspace roles are viewer, agent, admin, and owner. Agents update tickets and add sources.",
        }
        first = self.client.post(reverse("document-list"), payload, format="json")
        duplicate = self.client.post(reverse("document-list"), payload, format="json")
        short = self.client.post(
            reverse("document-list"),
            {"title": "Too short", "source_type": "text", "content": "Not enough."},
            format="json",
        )
        private = self.client.post(
            reverse("document-list"),
            {
                "title": "Local docs",
                "source_type": "url",
                "source_url": "http://127.0.0.1/secret",
            },
            format="json",
        )
        outsider, _user, _organization = workspace(email="outsider@example.com", slug="outside")
        hidden = outsider.get(reverse("document-detail", args=[first.data["id"]]))

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(short.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(private.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(hidden.status_code, status.HTTP_404_NOT_FOUND)

    def test_markdown_upload_and_viewer_permissions(self):
        upload = SimpleUploadedFile(
            "auth.md",
            b"API requests authenticate with a bearer token issued for the workspace. Send it on every request.",
            content_type="text/markdown",
        )
        created = self.client.post(
            reverse("document-list"),
            {"title": "API authentication", "source_type": "file", "file": upload},
            format="multipart",
        )
        viewer_client, viewer, _organization = workspace(
            role=Membership.Role.VIEWER,
            email="viewer@example.com",
            slug="viewer-labs",
        )
        Membership.objects.filter(user=viewer).update(organization=self.organization)
        listing = viewer_client.get(reverse("document-list"))
        forbidden = viewer_client.post(
            reverse("document-list"),
            {
                "title": "Blocked notes",
                "source_type": "text",
                "content": "Viewers can read knowledge but cannot add a new source to the workspace.",
            },
            format="json",
        )
        answer = viewer_client.post(
            reverse("document-ask"),
            {"question": "How do API requests authenticate?"},
            format="json",
        )

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["file_name"], "auth.md")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(answer.status_code, status.HTTP_200_OK)
        self.assertIn("bearer token", answer.data["answer"])

    def test_remote_embeddings_are_stored(self):
        vector = [0.0] * 128
        vector[0] = 1.0
        with patch(
            "knowledge.services.request_embeddings",
            return_value=([vector], "text-embedding-3-small"),
        ):
            created = self.client.post(
                reverse("document-list"),
                {
                    "title": "Billing notes",
                    "source_type": "text",
                    "content": "Invoices show the plan that was active during the billing period after an upgrade.",
                },
                format="json",
            )
        detail_model = created.data["status"]
        from knowledge.models import KnowledgeChunk

        chunk = KnowledgeChunk.objects.get(document_id=created.data["id"])
        self.assertEqual(detail_model, "ready")
        self.assertEqual(chunk.embedding_model, "text-embedding-3-small")
        self.assertEqual(chunk.embedding[0], 1.0)

    def test_url_import_reads_public_html(self):
        class Response:
            headers = {"Content-Type": "text/html; charset=utf-8"}

            def read(self, _limit):
                return (
                    b"<html><body><p>Webhook deliveries retry after a failed response. "
                    b"Confirm the endpoint returns a success status and the signing secret matches.</p></body></html>"
                )

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

        with (
            patch("knowledge.services._public_http_url", return_value="https://docs.example.com/hooks"),
            patch("knowledge.services.request.urlopen", return_value=Response()),
        ):
            created = self.client.post(
                reverse("document-list"),
                {
                    "title": "Webhooks troubleshooting",
                    "source_type": "url",
                    "source_url": "https://docs.example.com/hooks",
                },
                format="json",
            )

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["status"], "ready")
        self.assertGreaterEqual(created.data["chunk_count"], 1)

    def test_unreachable_url_is_rejected(self):
        with (
            patch("knowledge.services._public_http_url", return_value="https://docs.example.com/missing"),
            patch("knowledge.services.request.urlopen", side_effect=URLError("down")),
        ):
            created = self.client.post(
                reverse("document-list"),
                {
                    "title": "Missing page",
                    "source_type": "url",
                    "source_url": "https://docs.example.com/missing",
                },
                format="json",
            )
        self.assertEqual(created.status_code, status.HTTP_400_BAD_REQUEST)
