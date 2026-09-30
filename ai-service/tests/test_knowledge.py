import json
import unittest
from unittest.mock import patch
from urllib.error import URLError

from app.config import Settings
from app.knowledge import answer_from_sources, embed_text, embed_texts


class KnowledgeServiceTests(unittest.TestCase):
    def test_local_embeddings_are_normalized(self):
        vector = embed_text("Customers should export datasets above 50,000 rows")
        self.assertEqual(len(vector), 128)
        norm = sum(value * value for value in vector) ** 0.5
        self.assertAlmostEqual(norm, 1, places=2)
        self.assertEqual(
            embed_texts(["export dataset"], Settings(_env_file=None, gemini_api_key=None))[1],
            "flowdesk-local-embed",
        )

    def test_answer_uses_the_matching_source_sentence(self):
        answer = answer_from_sources(
            "How should customers export datasets over 50,000 rows?",
            [
                {
                    "title": "Export limits",
                    "excerpt": (
                        "Customers should export datasets above 50,000 rows through the background export endpoint. "
                        "Export links remain active for 24 hours."
                    ),
                    "relevance": 0.8,
                }
            ],
        )
        self.assertIn("24 hours", answer)

    def test_gemini_embedding_shape_is_checked(self):
        payload = {"embeddings": [{"values": [0.1] * 128}]}
        response = _body(payload)
        with patch("app.gemini.request.urlopen", return_value=response):
            vectors, model = embed_texts(
                ["export"],
                Settings(
                    _env_file=None,
                    gemini_api_key="test-key",
                    gemini_embedding_model="gemini-embedding-001",
                ),
            )
        self.assertEqual(model, "gemini-embedding-001")
        self.assertEqual(len(vectors[0]), 128)

    def test_gemini_errors_fall_back_for_answers(self):
        from app.knowledge import answer_question

        with patch("app.gemini.request.urlopen", side_effect=URLError("down")):
            answer, model = answer_question(
                "How do exports work?",
                [
                    {
                        "title": "Export limits",
                        "excerpt": "Export links remain active for 24 hours.",
                        "relevance": 0.9,
                    }
                ],
                Settings(_env_file=None, gemini_api_key="test-key"),
            )
        self.assertEqual(model, "flowdesk-local")
        self.assertIn("24 hours", answer)


def _body(payload):
    class Response:
        def read(self):
            return json.dumps(payload).encode()

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

    return Response()


if __name__ == "__main__":
    unittest.main()
