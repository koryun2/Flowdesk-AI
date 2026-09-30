import logging

from django.utils import timezone

from ai_ops.client import AnalysisError, request_ticket_analysis
from ai_ops.models import AIAnalysis
from audit.models import ActivityLog
from audit.services import record_activity
from tickets.models import Ticket


logger = logging.getLogger("flowdesk.api")

CATEGORIES = {choice for choice, _label in AIAnalysis.Category.choices}
PRIORITIES = {choice for choice, _label in Ticket.Priority.choices}
SENTIMENTS = {choice for choice, _label in AIAnalysis.Sentiment.choices}


def analyze_ticket(ticket: Ticket) -> AIAnalysis:
    analysis = AIAnalysis.objects.create(
        organization=ticket.organization,
        ticket=ticket,
        status=AIAnalysis.Status.PROCESSING,
        started_at=timezone.now(),
    )
    try:
        payload = request_ticket_analysis(
            {
                "title": ticket.title,
                "description": ticket.description,
                "customer_name": ticket.customer.name,
                "customer_company": ticket.customer.company or "",
                "model": ticket.organization.analysis_model,
            }
        )
        _apply_result(analysis, payload)
        analysis.status = AIAnalysis.Status.COMPLETED
        analysis.finished_at = timezone.now()
        analysis.full_clean()
        analysis.save()
    except (AnalysisError, ValueError, TypeError) as exc:
        _mark_failed(analysis, str(exc))
        return analysis
    except Exception:
        logger.exception("Ticket analysis failed for %s", ticket.pk)
        _mark_failed(analysis, "Ticket analysis failed.")
        return analysis

    label = analysis.category.replace("_", " ")
    article = "an" if analysis.priority[:1] in "aeiou" else "a"
    record_activity(
        organization=ticket.organization,
        actor=None,
        action="analyzed ticket",
        entity_type=ActivityLog.EntityType.TICKET,
        entity_id=ticket.id,
        context={
            "actor_name": "Flowdesk AI",
            "detail": f"Classified as {article} {analysis.priority} {label}",
            "tone": "ai",
        },
    )
    return analysis


def _apply_result(analysis: AIAnalysis, payload: dict) -> None:
    category = payload.get("category")
    priority = payload.get("priority")
    sentiment = payload.get("sentiment")
    summary = str(payload.get("summary") or "").strip()
    if category not in CATEGORIES or priority not in PRIORITIES or sentiment not in SENTIMENTS:
        raise AnalysisError("AI service returned an unsupported classification.")
    if not summary:
        raise AnalysisError("AI service returned an empty summary.")
    confidence = payload.get("confidence")
    try:
        confidence = float(confidence)
    except (TypeError, ValueError) as exc:
        raise AnalysisError("AI service returned an invalid confidence.") from exc
    if confidence > 1 and confidence <= 100:
        confidence = confidence / 100
    if not 0 <= confidence <= 1:
        raise AnalysisError("AI service returned an invalid confidence.")
    tags = []
    for tag in payload.get("suggested_tags") or []:
        name = str(tag).strip().lower()
        if name and name not in tags:
            tags.append(name[:40])
    analysis.category = category
    analysis.priority = priority
    analysis.sentiment = sentiment
    analysis.summary = summary[:4000]
    analysis.suggested_tags = tags[:8]
    analysis.model_name = str(payload.get("model_name") or "")[:120]
    analysis.prompt_version = str(payload.get("prompt_version") or "")[:40]
    analysis.raw_response = {
        "confidence": round(confidence, 4),
        "category": category,
        "priority": priority,
        "sentiment": sentiment,
        "suggested_tags": analysis.suggested_tags,
    }
    analysis.error_message = ""


def _mark_failed(analysis: AIAnalysis, message: str) -> None:
    analysis.status = AIAnalysis.Status.FAILED
    analysis.category = ""
    analysis.priority = ""
    analysis.sentiment = ""
    analysis.summary = ""
    analysis.suggested_tags = []
    analysis.error_message = message[:1000]
    analysis.finished_at = timezone.now()
    analysis.save()
