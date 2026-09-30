import json
import logging
from urllib import error, request

from django.conf import settings


logger = logging.getLogger("flowdesk.api")


class AgentAIError(Exception):
    pass


def request_plan(message: str, prior: str = "") -> dict:
    url = f"{settings.AI_SERVICE_URL.rstrip('/')}/v1/agent/plan"
    body = {"message": message}
    if prior:
        body["prior"] = prior[:500]
    http_request = request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    timeout = float(getattr(settings, "AI_SERVICE_TIMEOUT", 20))
    try:
        with request.urlopen(http_request, timeout=timeout) as response:
            body = json.loads(response.read().decode())
    except error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:300]
        raise AgentAIError(f"AI service returned {exc.code}: {detail}") from exc
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("Agent plan request failed: %s", exc)
        raise AgentAIError("AI service is unavailable.") from exc
    if not isinstance(body, dict) or not isinstance(body.get("tool_calls"), list):
        raise AgentAIError("AI service returned an unexpected plan.")
    return body
