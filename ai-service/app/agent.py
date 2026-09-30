import logging
import re

from .config import Settings
from .gemini import generate_json


logger = logging.getLogger("flowdesk.agent")

LOCAL_AGENT_MODEL = "flowdesk-local-agent"
TOOL_NAMES = (
    "search_tickets",
    "get_customer",
    "search_knowledge_base",
    "create_ticket",
    "update_ticket",
    "add_ticket_comment",
)

PLAN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "tool_calls": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": {"type": "string", "enum": list(TOOL_NAMES)},
                    "arguments": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "query": {"type": "string"},
                            "status": {"type": "string"},
                            "priority": {"type": "string"},
                            "question": {"type": "string"},
                            "customer": {"type": "string"},
                            "health": {"type": "string"},
                            "ticket": {"type": "string"},
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "body": {"type": "string"},
                            "is_internal": {"type": "boolean"},
                            "created_within_days": {"type": "integer"},
                            "scope": {"type": "string"},
                        },
                        "required": [
                            "query",
                            "status",
                            "priority",
                            "question",
                            "customer",
                            "health",
                            "ticket",
                            "title",
                            "description",
                            "body",
                            "is_internal",
                            "created_within_days",
                            "scope",
                        ],
                    },
                },
                "required": ["name", "arguments"],
            },
        },
        "reply": {"type": "string"},
    },
    "required": ["tool_calls", "reply"],
}


def plan_message(message: str, settings: Settings, prior: str = "") -> dict:
    if settings.gemini_api_key:
        try:
            plan = plan_with_gemini(message, settings)
        except RuntimeError as exc:
            logger.warning("Falling back to the local agent planner: %s", exc)
            plan = plan_locally(message)
    else:
        plan = plan_locally(message)
    return _revise_plan(message, prior, plan)


def plan_locally(message: str) -> dict:
    text = message.lower()
    if _is_comment(text):
        calls = [{"name": "add_ticket_comment", "arguments": _comment_args(message, text)}]
    elif _is_create(text):
        calls = [{"name": "create_ticket", "arguments": _create_args(message, text)}]
    elif _is_update(text):
        calls = [{"name": "update_ticket", "arguments": _update_args(message, text)}]
    elif _wants_customer_roster(text):
        calls = [{"name": "get_customer", "arguments": {"scope": "all"}}]
    else:
        calls = []
        if _is_ticket_search(text):
            calls.append({"name": "search_tickets", "arguments": _ticket_search_args(text)})
        if _is_customer_lookup(text):
            calls.append({"name": "get_customer", "arguments": _customer_args(message, text)})
        if _is_knowledge(text):
            calls.append(
                {"name": "search_knowledge_base", "arguments": {"question": message.strip()}}
            )
    if not calls:
        return {
            "tool_calls": [],
            "reply": (
                "Ask me to search tickets, look up a customer, search the knowledge base, "
                "or prepare a ticket change for approval."
            ),
            "model_name": LOCAL_AGENT_MODEL,
        }
    return {"tool_calls": calls[:4], "reply": "", "model_name": LOCAL_AGENT_MODEL}


def plan_with_gemini(message: str, settings: Settings) -> dict:
    try:
        content = generate_json(
            (
                "Choose Flowdesk tools for an operations request. "
                "Use search_tickets for ticket questions. Put one keyword in query, such as export, not the whole sentence. "
                "Use get_customer with scope all to count or list customers. "
                "Use get_customer with health at_risk for at-risk customers, or query for one named customer. "
                "Use search_knowledge_base for documentation questions. "
                "Use create_ticket, update_ticket, and add_ticket_comment only when the user asks to change data. "
                "Leave unused argument strings empty, is_internal false, and created_within_days 0. "
                "Do not invent ticket numbers. Put ticket keys such as FD-1284 in the ticket field."
            ),
            message,
            PLAN_SCHEMA,
            settings,
        )
    except RuntimeError as exc:
        raise RuntimeError("The language model did not return a tool plan.") from exc
    calls = []
    for call in (content.get("tool_calls") or [])[:4]:
        name = call.get("name")
        arguments = call.get("arguments") or {}
        if name not in TOOL_NAMES or not isinstance(arguments, dict):
            continue
        calls.append({"name": name, "arguments": _drop_empty(arguments)})
    return {
        "tool_calls": calls,
        "reply": str(content.get("reply") or ""),
        "model_name": settings.gemini_model,
    }


SEARCH_FILLER = {
    "bug",
    "bugs",
    "ticket",
    "tickets",
    "unresolved",
    "open",
    "find",
    "show",
    "the",
    "and",
    "for",
    "please",
    "any",
    "about",
    "issue",
    "issues",
    "problem",
    "problems",
}
ROSTER_FOLLOWUPS = {"all", "everyone", "all of them", "list them", "show all", "every one"}


def _revise_plan(message: str, prior: str, plan: dict) -> dict:
    text = message.lower().strip()
    if _wants_customer_roster(text, prior):
        plan["tool_calls"] = [{"name": "get_customer", "arguments": {"scope": "all"}}]
        plan["reply"] = ""
        return plan
    revised = []
    for call in plan.get("tool_calls") or []:
        if call.get("name") != "search_tickets":
            revised.append(call)
            continue
        arguments = dict(call.get("arguments") or {})
        query = str(arguments.get("query") or "")
        if query and not re.search(r"\bFD-\d+\b", query, re.I):
            keywords = _search_keywords(query)
            if keywords:
                arguments["query"] = keywords
        revised.append({"name": "search_tickets", "arguments": arguments})
    plan["tool_calls"] = revised
    return plan


def _wants_customer_roster(text: str, prior: str = "") -> bool:
    phrases = (
        "how many customer",
        "number of customer",
        "count of customer",
        "list customer",
        "all customer",
        "customers we have",
        "customer list",
        "our customers",
        "every customer",
    )
    if any(phrase in text for phrase in phrases):
        return True
    return text in ROSTER_FOLLOWUPS and "customer" in prior.lower()


def _search_keywords(query: str) -> str:
    words = re.findall(r"[a-z0-9]+", query.lower())
    kept = [word for word in words if word not in SEARCH_FILLER and len(word) > 2]
    if not kept:
        return query.strip()
    return " ".join(kept[:3])


def _drop_empty(arguments: dict) -> dict:
    cleaned = {}
    for key, value in arguments.items():
        if value in ("", 0, None, False) and key != "is_internal":
            continue
        if key == "is_internal" and value is False:
            continue
        cleaned[key] = value
    return cleaned


def _ticket_search_args(text: str) -> dict:
    arguments: dict = {}
    if "export" in text or "csv" in text:
        arguments["query"] = "export"
    elif "billing" in text or "invoice" in text:
        arguments["query"] = "billing"
    elif "webhook" in text:
        arguments["query"] = "webhook"
    elif "bug" in text:
        arguments["query"] = "bug"
    if "urgent" in text:
        arguments["priority"] = "urgent"
    elif "high priority" in text:
        arguments["priority"] = "high"
    if any(word in text for word in ("unresolved", "open", "investigating")):
        arguments["status"] = "open"
    if "today" in text:
        arguments["created_within_days"] = 1
    if not arguments:
        arguments["status"] = "open"
    return arguments


def _customer_args(message: str, text: str) -> dict:
    if "at risk" in text or "at-risk" in text:
        return {"health": "at_risk"}
    if "critical" in text:
        return {"health": "critical"}
    named = re.search(r"\b(?:customer|for)\s+([A-Za-z][\w&.-]*(?:\s+[A-Za-z][\w&.-]*)?)", message)
    query = named.group(1).strip() if named else ""
    return {"query": query} if query else {"health": "at_risk"}


def _create_args(message: str, text: str) -> dict:
    customer_match = re.search(r"\bfor\s+(.+?)(?:\s+about\b|$)", message, re.I)
    about = re.search(r"\babout\s+(.+)$", message, re.I)
    title = about.group(1).strip(" .") if about else "Customer request from the agent"
    description = message.strip()
    if len(description) < 15:
        description = f"{description} Reported through the operations agent."
    priority = "medium"
    if "urgent" in text:
        priority = "urgent"
    elif "high" in text:
        priority = "high"
    elif "low" in text:
        priority = "low"
    return {
        "title": title[:240],
        "description": description[:4000],
        "customer": customer_match.group(1).strip() if customer_match else "",
        "priority": priority,
    }


def _update_args(message: str, text: str) -> dict:
    arguments = {"ticket": _ticket_label(message)}
    if _has_word(text, "close") or _has_word(text, "closed"):
        arguments["status"] = "closed"
    elif _has_word(text, "resolve") or _has_word(text, "resolved"):
        arguments["status"] = "resolved"
    elif _has_word(text, "reopen") or _has_word(text, "investigating"):
        arguments["status"] = "investigating"
    elif _has_word(text, "waiting"):
        arguments["status"] = "waiting"
    if "urgent" in text:
        arguments["priority"] = "urgent"
    elif "high priority" in text:
        arguments["priority"] = "high"
    return arguments


def _comment_args(message: str, text: str) -> dict:
    body_match = re.search(r"\b(?:that|saying|:)\s+(.+)$", message, re.I)
    body = body_match.group(1).strip() if body_match else message.strip()
    return {
        "ticket": _ticket_label(message),
        "body": body[:4000],
        "is_internal": "internal" in text or "note" in text,
    }


def _ticket_label(message: str) -> str:
    match = re.search(r"\bFD-\d+\b", message, re.I)
    return match.group(0).upper() if match else ""


def _has_word(text: str, word: str) -> bool:
    return re.search(rf"\b{re.escape(word)}\b", text) is not None


def _is_comment(text: str) -> bool:
    return any(_has_word(text, word) for word in ("comment", "note", "reply"))


def _is_create(text: str) -> bool:
    return "ticket" in text and (
        _has_word(text, "create") or "open a" in text or "new ticket" in text
    )


def _is_update(text: str) -> bool:
    return any(
        _has_word(text, word)
        for word in ("close", "closed", "resolve", "resolved", "reopen", "assign")
    ) or "mark " in text


def _is_ticket_search(text: str) -> bool:
    return any(word in text for word in ("ticket", "bug", "export", "urgent", "unresolved", "csv"))


def _is_customer_lookup(text: str) -> bool:
    return "customer" in text or "at risk" in text or "at-risk" in text


def _is_knowledge(text: str) -> bool:
    return any(word in text for word in ("doc", "knowledge", "guide", "how "))
