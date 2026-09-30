import json
import logging
from urllib import error, request

from django.conf import settings


logger = logging.getLogger("flowdesk.api")


class AnalysisError(Exception):
    pass


def request_ticket_analysis(payload: dict) -> dict:
    url = f"{settings.AI_SERVICE_URL.rstrip('/')}/v1/analyses/tickets"
    http_request = request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    timeout = float(getattr(settings, "AI_SERVICE_TIMEOUT", 20))
    try:
        with request.urlopen(http_request, timeout=timeout) as response:
            body = json.loads(response.read().decode())
    except error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:300]
        raise AnalysisError(f"AI service returned {exc.code}: {detail}") from exc
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("Ticket analysis request failed: %s", exc)
        raise AnalysisError("AI service is unavailable.") from exc
    if not isinstance(body, dict):
        raise AnalysisError("AI service returned an unexpected response.")
    return body
