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

    def test_chunks_from_one_document_are_cited_once(self):
        paragraph = (
            "Koryun Hayryan builds TypeScript interfaces for the support workspace "
            "and lists React with PostgreSQL. "
        )
        created = self.client.post(
            reverse("document-list"),
            {
                "title": "Resume",
                "source_type": "text",
                "content": (paragraph + "\n") * 8,
            },
            format="json",
        )
        other = self.client.post(
            reverse("document-list"),
            {
                "title": "Billing and subscription FAQ",
                "source_type": "text",
                "content": (
                    "Invoices are billed monthly. Customers download invoices from the billing page."
                ),
            },
            format="json",
        )
        answer = self.client.post(
            reverse("document-ask"),
            {"question": "What does Koryun Hayryan build with TypeScript?"},
            format="json",
        )
        both = self.client.post(
            reverse("document-ask"),
            {"question": "What TypeScript work does Koryun Hayryan list, and where do customers download invoices?"},
            format="json",
        )

        self.assertGreaterEqual(created.data["chunk_count"], 2)
        self.assertEqual(answer.status_code, status.HTTP_200_OK)
        self.assertEqual(len(answer.data["sources"]), 1)
        self.assertEqual(answer.data["sources"][0]["document_id"], created.data["id"])
        self.assertEqual(answer.data["sources"][0]["title"], "Resume")
        titles = {source["title"] for source in both.data["sources"]}
        self.assertIn("Billing and subscription FAQ", titles)
        self.assertEqual(len(titles), len(both.data["sources"]))
        self.assertNotEqual(other.data["id"], created.data["id"])

    def test_section_questions_use_that_section_without_the_model(self):
        created = self.client.post(
            reverse("document-list"),
            {
                "title": "Resume",
                "source_type": "text",
                "content": (
                    "Koryun Hayryan\n"
                    "Software Developer\n"
                    "PROFILE\n"
                    "Support tools developer.\n"
                    "TECHNICAL SKILLS\n"
                    "TypeScript, React, and PostgreSQL.\n"
                    "WORK EXPERIENCE\n"
                    "Frontend Developer at Example Studio.\n"
                    "EDUCATION\n"
                    "Bachelor's Degree in Economics Yerevan State University\n"
                    "ADDITIONAL TRAINING\n"
                    "Python and Django coursework.\n"
                ),
            },
            format="json",
        )
        from knowledge.models import KnowledgeChunk

        sections = set(
            KnowledgeChunk.objects.filter(document_id=created.data["id"]).values_list(
                "section", flat=True
            )
        )
        with patch(
            "knowledge.services.request_answer",
            side_effect=AssertionError("section lookup should not call the model"),
        ):
            education = self.client.post(
                reverse("document-ask"),
                {"question": "What is Koryun Hayryan's education?"},
                format="json",
            )
            experience = self.client.post(
                reverse("document-ask"),
                {"question": "What is Koryun Hayryan's professional experience?"},
                format="json",
            )
        with patch(
            "knowledge.services.request_answer",
            return_value=("His degree supports the frontend work.", "gemma-4-26b-a4b-it"),
        ) as synthesized:
            complex_question = self.client.post(
                reverse("document-ask"),
                {
                    "question": "How does Koryun Hayryan's experience complement his education?",
                },
                format="json",
            )

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertIn("education", sections)
        self.assertIn("experience", sections)
        self.assertEqual(education.status_code, status.HTTP_200_OK)
        self.assertIn("Yerevan State University", education.data["answer"])
        self.assertNotIn("Frontend Developer", education.data["answer"])
        self.assertEqual(len(education.data["sources"]), 1)
        self.assertEqual(experience.status_code, status.HTTP_200_OK)
        self.assertIn("Frontend Developer", experience.data["answer"])
        self.assertNotIn("Yerevan State University", experience.data["answer"])
        self.assertEqual(complex_question.status_code, status.HTTP_200_OK)
        self.assertEqual(complex_question.data["answer"], "His degree supports the frontend work.")
        excerpts = " ".join(source["excerpt"] for source in synthesized.call_args.args[1])
        self.assertIn("Frontend Developer", excerpts)
        self.assertIn("Yerevan State University", excerpts)
        self.assertEqual(len(complex_question.data["sources"]), 1)

    def test_source_title_can_be_renamed_without_reindexing(self):
        created = self.client.post(
            reverse("document-list"),
            {
                "title": "Export limits and large dataset guide",
                "source_type": "text",
                "content": EXPORT_GUIDE,
            },
            format="json",
        )
        from knowledge.models import KnowledgeChunk

        before = list(
            KnowledgeChunk.objects.filter(document_id=created.data["id"]).values_list(
                "content", flat=True
            )
        )
        renamed = self.client.patch(
            reverse("document-detail", args=[created.data["id"]]),
            {"title": "Large export guide"},
            format="json",
        )
        short = self.client.patch(
            reverse("document-detail", args=[created.data["id"]]),
            {"title": "No"},
            format="json",
        )
        viewer_client, viewer, _organization = workspace(
            role=Membership.Role.VIEWER,
            email="rename-viewer@example.com",
            slug="rename-viewer",
        )
        Membership.objects.filter(user=viewer).update(organization=self.organization)
        forbidden = viewer_client.patch(
            reverse("document-detail", args=[created.data["id"]]),
            {"title": "Viewer rename"},
            format="json",
        )
        after = list(
            KnowledgeChunk.objects.filter(document_id=created.data["id"]).values_list(
                "content", flat=True
            )
        )

        self.assertEqual(renamed.status_code, status.HTTP_200_OK)
        self.assertEqual(renamed.data["title"], "Large export guide")
        self.assertEqual(renamed.data["chunk_count"], created.data["chunk_count"])
        self.assertEqual(before, after)
        self.assertEqual(short.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

    def test_drafting_text_is_not_returned_with_the_citation(self):
        self.client.post(
            reverse("document-list"),
            {
                "title": "export-limits.md",
                "source_type": "text",
                "content": EXPORT_GUIDE,
            },
            format="json",
        )
        draft = (
            "* Question: How do exports work?\n"
            "* Constraints: Use only the sources.\n"
            "* Draft 1: Invent a new export step.\n"
            "* Check against constraints: Looks fine.\n"
            "* Self-Correction during drafting: Kept the invented step.\n"
        )
        with patch(
            "knowledge.services.request_answer",
            return_value=(draft, "gemma-4-26b-a4b-it"),
        ):
            answer = self.client.post(
                reverse("document-ask"),
                {"question": "How should customers export datasets over 50,000 rows?"},
                format="json",
            )

        self.assertEqual(answer.status_code, status.HTTP_200_OK)
        self.assertNotIn("Draft", answer.data["answer"])
        self.assertNotIn("Self-Correction", answer.data["answer"])
        self.assertNotIn("Check against constraints", answer.data["answer"])
        self.assertIn("24 hours", answer.data["answer"])
        source = answer.data["sources"][0]
        self.assertEqual(source["title"], "export-limits.md")
        self.assertIn("document_id", source)
        self.assertIn("excerpt", source)
        self.assertGreater(source["relevance"], 0.15)
        self.assertNotIn("answer", source)

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
