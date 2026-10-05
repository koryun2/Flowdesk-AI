import json
import unittest
from unittest.mock import patch
from urllib.error import URLError

from app.agent import plan_locally, plan_message
from app.config import Settings


class LocalAgentPlannerTests(unittest.TestCase):
    def test_export_search_stays_a_read(self):
        plan = plan_locally("Find unresolved export bugs")
        self.assertEqual(plan["tool_calls"][0]["name"], "search_tickets")
        self.assertEqual(plan["tool_calls"][0]["arguments"]["query"], "export")
        self.assertEqual(plan["tool_calls"][0]["arguments"]["status"], "open")

    def test_urgent_today_limits_the_search(self):
        plan = plan_locally("Summarize urgent tickets from today")
        arguments = plan["tool_calls"][0]["arguments"]
        self.assertEqual(plan["tool_calls"][0]["name"], "search_tickets")
        self.assertEqual(arguments["priority"], "urgent")
        self.assertEqual(arguments["created_within_days"], 1)

    def test_at_risk_customers_use_get_customer(self):
        plan = plan_locally("Which customers are at risk?")
        self.assertEqual(plan["tool_calls"][0]["name"], "get_customer")
        self.assertEqual(plan["tool_calls"][0]["arguments"]["health"], "at_risk")

    def test_docs_search_the_knowledge_base(self):
        plan = plan_locally("Search docs for API rate limits")
        self.assertEqual(plan["tool_calls"][0]["name"], "search_knowledge_base")
        self.assertIn("rate limits", plan["tool_calls"][0]["arguments"]["question"])

    def test_close_prepares_an_update(self):
        plan = plan_locally("Close FD-1284")
        call = plan["tool_calls"][0]
        self.assertEqual(call["name"], "update_ticket")
        self.assertEqual(call["arguments"]["ticket"], "FD-1284")
        self.assertEqual(call["arguments"]["status"], "closed")

    def test_create_names_the_customer(self):
        plan = plan_locally("Create a ticket for Lumon about CSV exports timing out")
        call = plan["tool_calls"][0]
        self.assertEqual(call["name"], "create_ticket")
        self.assertEqual(call["arguments"]["customer"], "Lumon")
        self.assertIn("CSV exports", call["arguments"]["title"])

    def test_internal_note_is_a_comment(self):
        plan = plan_locally("Add an internal note to FD-1284 that the worker timeout was raised")
        call = plan["tool_calls"][0]
        self.assertEqual(call["name"], "add_ticket_comment")
        self.assertEqual(call["arguments"]["ticket"], "FD-1284")
        self.assertTrue(call["arguments"]["is_internal"])
        self.assertIn("worker timeout", call["arguments"]["body"])

    def test_gemini_failure_uses_the_local_planner(self):
        with patch("app.gemini.request.urlopen", side_effect=URLError("down")):
            plan = plan_message(
                "Find unresolved export bugs",
                Settings(_env_file=None, gemini_api_key="test-key"),
            )
        self.assertEqual(plan["model_name"], "flowdesk-local-agent")
        self.assertEqual(plan["tool_calls"][0]["name"], "search_tickets")

    def test_gemini_plan_drops_empty_arguments(self):
        payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": json.dumps(
                            {
                                "tool_calls": [
                                    {
                                        "name": "search_tickets",
                                        "arguments": {
                                            "query": "export",
                                            "status": "open",
                                            "priority": "",
                                            "question": "",
                                            "customer": "",
                                            "health": "",
                                            "ticket": "",
                                            "title": "",
                                            "description": "",
                                            "body": "",
                                            "is_internal": False,
                                            "created_within_days": 0,
                                        },
                                    }
                                ],
                                "reply": "",
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
            plan = plan_message(
                "Find unresolved export bugs",
                Settings(_env_file=None, gemini_api_key="test-key"),
            )
        self.assertEqual(
            plan["tool_calls"][0]["arguments"],
            {"query": "export", "status": "open"},
        )
        self.assertEqual(plan["model_name"], "gemma-4-26b-a4b-it")

    def test_customer_count_lists_the_roster(self):
        plan = plan_locally("How many customers do we have?")
        self.assertEqual(plan["tool_calls"][0]["name"], "get_customer")
        self.assertEqual(plan["tool_calls"][0]["arguments"]["scope"], "all")

    def test_gemini_customer_question_is_not_a_ticket_search(self):
        plan = plan_message(
            "How many customers we have?",
            Settings(_env_file=None, gemini_api_key=None),
        )
        self.assertEqual(plan["tool_calls"], [{"name": "get_customer", "arguments": {"scope": "all"}}])

    def test_search_phrase_keeps_the_useful_keyword(self):
        plan = plan_locally("Find unresolved export bugs")
        self.assertEqual(plan["tool_calls"][0]["arguments"]["query"], "export")

    def test_short_follow_up_lists_customers(self):
        plan = plan_message(
            "all",
            Settings(_env_file=None, gemini_api_key=None),
            "Say which customer to look up.",
        )
        self.assertEqual(plan["tool_calls"][0]["arguments"]["scope"], "all")

    def test_gemini_plan_sees_the_recent_conversation_and_model(self):
        with patch("app.agent.generate_json", return_value={"tool_calls": [], "reply": "ok"}) as generate:
            plan = plan_message(
                "update the second one",
                Settings(_env_file=None, gemini_api_key="test-key", gemini_model="gemma-4-26b-a4b-it"),
                "Assistant: FD-1284 CSV export",
                "gemini-3.6-flash",
            )

        user_text = generate.call_args.args[1]
        self.assertIn("FD-1284", user_text)
        self.assertIn("update the second one", user_text)
        self.assertEqual(plan["model_name"], "gemini-3.6-flash")
