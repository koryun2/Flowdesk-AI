import logging

from .config import Settings
from .gemini import generate_json
from .schemas import (
    LOCAL_MODEL_NAME,
    PROMPT_VERSION,
    TicketAnalysis,
    TicketAnalysisRequest,
    TicketAnalysisResult,
)


logger = logging.getLogger("flowdesk.classifier")

ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "category": {
            "type": "string",
            "enum": ["bug", "feature_request", "billing", "general_inquiry"],
        },
        "priority": {
            "type": "string",
            "enum": ["low", "medium", "high", "urgent"],
        },
        "summary": {"type": "string"},
        "sentiment": {
            "type": "string",
            "enum": ["positive", "neutral", "negative"],
        },
        "suggested_tags": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": ["bug", "feature", "billing", "api", "export", "onboarding", "account"],
            },
        },
        "confidence": {"type": "number"},
    },
    "required": [
        "category",
        "priority",
        "summary",
        "sentiment",
        "suggested_tags",
        "confidence",
    ],
}

BILLING_WORDS = ("invoice", "billing", "payment", "refund", "subscription", "receipt", "charge")
FEATURE_WORDS = ("feature", "enhancement", "would like", "please add", "ability to", "request")
BUG_WORDS = ("fail", "error", "bug", "crash", "timeout", "broken", "exception", "not working")
URGENT_WORDS = (
    "urgent",
    "asap",
    "outage",
    "blocking",
    "blocks",
    "cannot access",
    "production down",
    "critical",
    "times out",
    "timed out",
)
LOW_WORDS = ("when you have time", "minor", "fyi", "no rush")
POSITIVE_WORDS = ("thank", "great", "love", "appreciate", "excellent")
NEGATIVE_WORDS = ("fail", "broken", "frustrated", "angry", "unacceptable", "timeout", "times out", "error")


ANALYSIS_MODELS = {"gemma-4-26b-a4b-it", "gemini-3.6-flash"}


def build_analysis(payload: TicketAnalysisRequest, settings: Settings) -> TicketAnalysis:
    if payload.model in ANALYSIS_MODELS:
        settings = settings.model_copy(update={"gemini_model": payload.model})
    if settings.gemini_api_key:
        return classify_with_gemini(payload, settings)
    return classify_locally(payload)


def classify_locally(payload: TicketAnalysisRequest) -> TicketAnalysis:
    text = f"{payload.title}\n{payload.description}".lower()
    category = _category(text)
    priority = _priority(text, category)
    sentiment = _sentiment(text)
    result = TicketAnalysisResult(
        category=category,
        priority=priority,
        summary=_summary(payload.title, priority, category),
        sentiment=sentiment,
        suggested_tags=_tags(text, category),
        confidence=_confidence(text, category, priority, sentiment),
    )
    return TicketAnalysis(
        **result.model_dump(),
        model_name=LOCAL_MODEL_NAME,
        prompt_version=PROMPT_VERSION,
    )


def classify_with_gemini(payload: TicketAnalysisRequest, settings: Settings) -> TicketAnalysis:
    customer = payload.customer_name or "Unknown customer"
    company = f" at {payload.customer_company}" if payload.customer_company else ""
    try:
        parsed = generate_json(
            (
                "You classify customer support tickets for a product operations team. "
                "Write a specific summary of at most 400 characters. "
                "Choose at most three suggested tags. "
                "Set confidence between 0 and 1."
            ),
            (
                f"Customer: {customer}{company}\n"
                f"Title: {payload.title}\n"
                f"Description:\n{payload.description}"
            ),
            ANALYSIS_SCHEMA,
            settings,
        )
        result = TicketAnalysisResult.model_validate(_normalize_model_output(parsed))
    except (RuntimeError, ValueError) as exc:
        logger.warning("Gemini ticket analysis failed: %s", exc)
        raise RuntimeError("The language model did not return a valid analysis.") from exc
    return TicketAnalysis(
        **result.model_dump(),
        model_name=settings.gemini_model,
        prompt_version=PROMPT_VERSION,
    )


def _normalize_model_output(payload: dict) -> dict:
    summary = str(payload.get("summary", "")).strip()
    payload["summary"] = summary[:500]
    confidence = payload.get("confidence", 0)
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0
    if confidence > 1 and confidence <= 100:
        confidence = confidence / 100
    payload["confidence"] = min(max(confidence, 0), 1)
    tags = []
    for tag in payload.get("suggested_tags") or []:
        if tag not in tags:
            tags.append(tag)
    payload["suggested_tags"] = tags[:4]
    return payload


def _category(text: str) -> str:
    if _contains(text, BILLING_WORDS):
        return "billing"
    if _contains(text, BUG_WORDS):
        return "bug"
    if _contains(text, FEATURE_WORDS):
        return "feature_request"
    return "general_inquiry"


def _priority(text: str, category: str) -> str:
    if _contains(text, URGENT_WORDS):
        return "urgent"
    if category == "bug" or "degraded" in text:
        return "high"
    if _contains(text, LOW_WORDS):
        return "low"
    return "medium"


def _sentiment(text: str) -> str:
    negative = _contains(text, NEGATIVE_WORDS)
    positive = _contains(text, POSITIVE_WORDS)
    if negative:
        return "negative"
    if positive:
        return "positive"
    return "neutral"


def _tags(text: str, category: str) -> list[str]:
    tags: list[str] = []
    if category == "bug":
        tags.append("bug")
    elif category == "billing":
        tags.append("billing")
    elif category == "feature_request":
        tags.append("feature")
    if any(word in text for word in ("export", "csv")):
        tags.append("export")
    if any(word in text for word in ("webhook", "api", "endpoint")):
        tags.append("api")
    if any(word in text for word in ("onboard", "setup")):
        tags.append("onboarding")
    if any(word in text for word in ("login", "password", "account")):
        tags.append("account")
    return tags[:4]


def _summary(title: str, priority: str, category: str) -> str:
    labels = {
        "bug": "bug",
        "feature_request": "feature request",
        "billing": "billing issue",
        "general_inquiry": "general inquiry",
    }
    article = "an" if priority[:1] in "aeiou" else "a"
    cleaned = title.strip().rstrip(".")
    summary = f"{cleaned}. Classified as {article} {priority} {labels[category]}."
    return summary[:500]


def _confidence(text: str, category: str, priority: str, sentiment: str) -> float:
    score = 0.58
    if category != "general_inquiry":
        score += 0.12
    if priority in {"urgent", "low"} or _contains(text, URGENT_WORDS):
        score += 0.08
    if sentiment != "neutral":
        score += 0.06
    return round(min(score, 0.9), 2)


def _contains(text: str, words: tuple[str, ...]) -> bool:
    return any(word in text for word in words)
