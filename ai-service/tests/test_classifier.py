import json
import unittest
from unittest.mock import patch
from urllib.error import URLError

from app.classifier import build_analysis, classify_locally, classify_with_gemini
from app.config import Settings
from app.schemas import TicketAnalysisRequest


class LocalClassifierTests(unittest.TestCase):
    def test_export_failure_is_an_urgent_bug(self):
        analysis = classify_locally(
            TicketAnalysisRequest(
                title="CSV export fails above 50k rows",
                description="Every large export times out and blocks the finance reconciliation.",
                customer_name="Marcus Lumon",
                customer_company="Lumon",
            )
        )

        self.assertEqual(analysis.category, "bug")
        self.assertEqual(analysis.priority, "urgent")
        self.assertEqual(analysis.sentiment, "negative")
        self.assertEqual(analysis.suggested_tags, ["bug", "export"])
        self.assertGreaterEqual(analysis.confidence, 0.5)
        self.assertLessEqual(analysis.confidence, 0.9)
        self.assertEqual(analysis.model_name, "flowdesk-local")
        self.assertIn("CSV export fails", analysis.summary)

    def test_invoice_issue_is_billing(self):
        analysis = classify_locally(
            TicketAnalysisRequest(
                title="Invoice shows the previous plan",
                description="The latest invoice still lists Growth after the subscription upgrade.",
            )
        )

        self.assertEqual(analysis.category, "billing")
        self.assertEqual(analysis.suggested_tags, ["billing"])
        self.assertEqual(analysis.sentiment, "neutral")

    def test_feature_request_stays_medium(self):
        analysis = classify_locally(
            TicketAnalysisRequest(
                title="Please add audit history",
                description="We would like a downloadable history of membership changes.",
            )
        )

        self.assertEqual(analysis.category, "feature_request")
        self.assertEqual(analysis.priority, "medium")
        self.assertIn("feature", analysis.suggested_tags)

    def test_missing_api_key_uses_the_local_classifier(self):
        analysis = build_analysis(
            TicketAnalysisRequest(
                title="Thanks for the quick help",
                description="The onboarding guide was excellent and the team is unblocked.",
            ),
            Settings(_env_file=None, gemini_api_key=None),
        )

        self.assertEqual(analysis.model_name, "flowdesk-local")
        self.assertEqual(analysis.sentiment, "positive")
        self.assertIn("onboarding", analysis.suggested_tags)


class GeminiClassifierTests(unittest.TestCase):
    def test_structured_response_is_validated(self):
        payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": json.dumps(
                                    {
                                        "category": "bug",
                                        "priority": "high",
                                        "summary": "Webhook retries stop after the second failure.",
                                        "sentiment": "negative",
                                        "suggested_tags": ["bug", "api"],
                                        "confidence": 0.91,
                                    }
                                )
                            }
                        ]
                    }
                }
            ]
        }
        class Response:
            def read(self):
                return json.dumps(payload).encode()

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, traceback):
                return False

        with patch("app.gemini.request.urlopen", return_value=Response()):
            analysis = classify_with_gemini(
                TicketAnalysisRequest(
                    title="Webhook retries stop",
                    description="Billing webhooks are not retried after the second 500 response.",
                ),
                Settings(_env_file=None, gemini_api_key="test-key", gemini_model="gemma-4-26b-a4b-it"),
            )

        self.assertEqual(analysis.category, "bug")
        self.assertEqual(analysis.suggested_tags, ["bug", "api"])
        self.assertEqual(analysis.model_name, "gemma-4-26b-a4b-it")
        self.assertEqual(analysis.confidence, 0.91)

    def test_provider_errors_are_reported(self):
        with patch("app.gemini.request.urlopen", side_effect=URLError("down")):
            with self.assertRaises(RuntimeError):
                classify_with_gemini(
                    TicketAnalysisRequest(
                        title="Webhook retries stop",
                        description="Billing webhooks are not retried after the second failure.",
                    ),
                    Settings(_env_file=None, gemini_api_key="test-key"),
                )


if __name__ == "__main__":
    unittest.main()
