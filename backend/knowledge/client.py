import json
import logging
from urllib import error, request

from django.conf import settings


logger = logging.getLogger("flowdesk.api")


class KnowledgeAIError(Exception):
    pass


def _post(path: str, payload: dict) -> dict:
    url = f"{settings.AI_SERVICE_URL.rstrip('/')}{path}"
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
        raise KnowledgeAIError(f"AI service returned {exc.code}: {detail}") from exc
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("Knowledge AI request failed: %s", exc)
        raise KnowledgeAIError("AI service is unavailable.") from exc
    if not isinstance(body, dict):
        raise KnowledgeAIError("AI service returned an unexpected response.")
    return body


def request_embeddings(texts: list[str]) -> tuple[list[list[float]], str]:
    body = _post("/v1/knowledge/embeddings", {"texts": texts})
    embeddings = body.get("embeddings")
    model_name = str(body.get("model_name") or "")
    if not isinstance(embeddings, list) or not model_name:
        raise KnowledgeAIError("AI service returned an unexpected embedding.")
    return embeddings, model_name


def request_answer(question: str, sources: list[dict]) -> tuple[str, str]:
    body = _post(
        "/v1/knowledge/answers",
        {
            "question": question,
            "sources": [
                {
                    "title": source["title"],
                    "excerpt": source["excerpt"],
                    "relevance": source["relevance"],
                }
                for source in sources
            ],
        },
    )
    answer = str(body.get("answer") or "").strip()
    if not answer:
        raise KnowledgeAIError("AI service returned an empty answer.")
    return answer, str(body.get("model_name") or "")
