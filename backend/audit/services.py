from audit.models import ActivityLog


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
    return ActivityLog.objects.create(
        organization=organization,
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=json_safe(changes or {}),
        context=context or {},
    )
