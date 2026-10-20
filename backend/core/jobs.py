import json
import logging
from uuid import uuid4

import redis
from django.conf import settings
from django.db import close_old_connections
from django.utils import timezone


logger = logging.getLogger("flowdesk.api")

QUEUE_KEY = "flowdesk:jobs"
RECENT_KEY = "flowdesk:jobs:recent"
JOB_TTL = 60 * 60


def redis_client():
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def enqueue(task: str, payload: dict) -> bool:
    if task not in TASKS:
        raise ValueError(f"Unknown job {task}.")
    if settings.JOBS_EAGER:
        TASKS[task](payload)
        return True
    job_id = str(uuid4())
    body = json.dumps({"id": job_id, "task": task, "payload": payload})
    try:
        client = redis_client()
        pipe = client.pipeline()
        pipe.hset(
            _job_key(job_id),
            mapping={
                "task": task,
                "status": "queued",
                "label": str(payload.get("label") or task)[:160],
                "queued_at": timezone.now().isoformat(),
            },
        )
        pipe.expire(_job_key(job_id), JOB_TTL)
        pipe.lpush(QUEUE_KEY, body)
        pipe.lpush(RECENT_KEY, job_id)
        pipe.ltrim(RECENT_KEY, 0, 19)
        pipe.execute()
    except redis.RedisError:
        logger.warning("Redis queue is unavailable. Running %s inline.", task)
        TASKS[task](payload)
        return True
    return False


def enqueue_document(document, actor):
    from knowledge.models import KnowledgeDocument

    document.status = KnowledgeDocument.Status.PROCESSING
    document.save(update_fields=["status", "updated_at"])
    enqueue(
        "index_document",
        {
            "document_id": str(document.id),
            "actor_id": str(actor.pk) if actor is not None else "",
            "label": document.title,
        },
    )
    document.refresh_from_db()
    return document


def queue_snapshot() -> dict:
    try:
        client = redis_client()
        queued = int(client.llen(QUEUE_KEY))
        job_ids = client.lrange(RECENT_KEY, 0, 9)
    except redis.RedisError:
        logger.warning("Redis queue snapshot failed.")
        return {"queued": 0, "jobs": []}
    jobs = []
    for job_id in job_ids:
        fields = client.hgetall(_job_key(job_id))
        if not fields:
            continue
        jobs.append(
            {
                "id": job_id,
                "task": fields.get("task", ""),
                "status": fields.get("status", ""),
                "label": fields.get("label", ""),
            }
        )
    return {"queued": queued, "jobs": jobs}


def work_once() -> bool:
    client = redis_client()
    item = client.brpop(QUEUE_KEY, timeout=1)
    if item is None:
        return False
    _run_body(client, item[1])
    return True


def work() -> None:
    client = redis_client()
    while True:
        item = client.brpop(QUEUE_KEY, timeout=5)
        if item is None:
            continue
        _run_body(client, item[1])


def _run_body(client, raw: str) -> None:
    try:
        body = json.loads(raw)
        job_id = str(body["id"])
        task = str(body["task"])
        payload = body.get("payload") or {}
    except (TypeError, ValueError, KeyError):
        logger.warning("Dropped an unreadable Redis job.")
        return
    _set_status(client, job_id, "running")
    close_old_connections()
    try:
        TASKS[task](payload)
    except Exception as exc:
        logger.exception("Redis job %s failed.", task)
        _set_status(client, job_id, "failed", str(exc))
    else:
        _set_status(client, job_id, "done")
    finally:
        close_old_connections()


def _set_status(client, job_id: str, status: str, error: str = "") -> None:
    try:
        client.hset(
            _job_key(job_id),
            mapping={"status": status, "error": error[:300]},
        )
        client.expire(_job_key(job_id), JOB_TTL)
    except redis.RedisError:
        logger.warning("Could not update Redis job %s.", job_id)


def _job_key(job_id: str) -> str:
    return f"flowdesk:job:{job_id}"


def _index_document(payload: dict) -> None:
    from django.contrib.auth import get_user_model

    from audit.models import ActivityLog
    from audit.services import record_activity
    from knowledge.models import KnowledgeDocument
    from knowledge.services import index_document

    document = KnowledgeDocument.objects.get(pk=payload["document_id"])
    index_document(document)
    document.refresh_from_db()
    actor = get_user_model().objects.filter(pk=payload.get("actor_id") or None).first()
    record_activity(
        organization=document.organization,
        actor=actor,
        action="added document",
        entity_type=ActivityLog.EntityType.KNOWLEDGE_DOCUMENT,
        entity_id=document.id,
        context={
            "detail": document.title,
            "chunks": (document.metadata or {}).get("chunk_count", 0),
            "status": document.status,
        },
    )


def _analyze_ticket(payload: dict) -> None:
    from ai_ops.services import analyze_ticket
    from tickets.models import Ticket

    ticket = Ticket.objects.select_related("organization", "customer").get(pk=payload["ticket_id"])
    analyze_ticket(ticket)


TASKS = {
    "index_document": _index_document,
    "analyze_ticket": _analyze_ticket,
}
