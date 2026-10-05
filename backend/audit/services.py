from organizations.models import Membership

from audit.models import ActivityLog, Notification

NOTIFY_ACTIONS = {
    "created ticket": ("New ticket", Notification.Tone.TICKET),
    "replied to customer": ("Customer reply", Notification.Tone.TICKET),
    "added internal note": ("Internal note", Notification.Tone.TICKET),
    "analyzed ticket": ("Ticket analysis finished", Notification.Tone.AI),
    "added document": ("Knowledge source is ready", Notification.Tone.KNOWLEDGE),
}


def json_safe(value):
    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def record_activity(
    *,
    organization,
    actor,
    action: str,
    entity_type: str,
    entity_id,
    changes: dict | None = None,
    context: dict | None = None,
) -> ActivityLog:
    entry = ActivityLog.objects.create(
        organization=organization,
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=json_safe(changes or {}),
        context=context or {},
    )
    _notify(entry)
    return entry


def _notify(entry: ActivityLog) -> None:
    spec = NOTIFY_ACTIONS.get(entry.action)
    if spec is None:
        return
    title, tone = spec
    detail = str((entry.context or {}).get("detail") or "")[:240]
    if entry.action == "added document" and (entry.context or {}).get("status") == "failed":
        title = "Knowledge source could not be indexed"
    if entry.entity_type == ActivityLog.EntityType.TICKET:
        link = f"/tickets/{entry.entity_id}"
    elif entry.entity_type == ActivityLog.EntityType.KNOWLEDGE_DOCUMENT:
        link = "/knowledge"
    else:
        link = ""
    recipient_ids = Membership.objects.filter(
        organization=entry.organization,
        accepted_at__isnull=False,
    ).values_list("user_id", flat=True)
    Notification.objects.bulk_create(
        [
            Notification(
                organization=entry.organization,
                recipient_id=user_id,
                title=title,
                detail=detail,
                tone=tone,
                link=link,
            )
            for user_id in recipient_ids
        ]
    )
