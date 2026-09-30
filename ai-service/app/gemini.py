import json
import logging
from urllib import error, request

from .config import Settings


logger = logging.getLogger("flowdesk.gemini")

API_ROOT = "https://generativelanguage.googleapis.com/v1beta"


def generate_json(system: str, user: str, schema: dict, settings: Settings) -> dict:
    payload = _generate(system, user, settings, schema)
    try:
        return json.loads(_response_text(payload))
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise RuntimeError("Gemini did not return valid JSON.") from exc


def generate_text(system: str, user: str, settings: Settings) -> str:
    payload = _generate(system, user, settings, schema=None)
    try:
        text = _response_text(payload).strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("Gemini did not return an answer.") from exc
    if not text:
        raise RuntimeError("Gemini did not return an answer.")
    return text


def embed_texts(texts: list[str], settings: Settings, dimensions: int) -> list[list[float]]:
    model = settings.gemini_embedding_model
    body = {
        "requests": [
            {
                "model": f"models/{model}",
                "content": {"parts": [{"text": text}]},
                "outputDimensionality": dimensions,
            }
            for text in texts
        ]
    }
    payload = _post(f"{API_ROOT}/models/{model}:batchEmbedContents", body, settings)
    rows = payload.get("embeddings") or []
    vectors = [row.get("values") for row in rows]
    if len(vectors) != len(texts) or any(
        not isinstance(vector, list) or len(vector) != dimensions for vector in vectors
    ):
        raise RuntimeError("The embedding model returned an unexpected vector.")
    return vectors


def _generate(system: str, user: str, settings: Settings, schema: dict | None) -> dict:
    body: dict = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
    }
    if schema is not None:
        body["generationConfig"] = {
            "responseMimeType": "application/json",
            "responseJsonSchema": schema,
        }
    model = settings.gemini_model
    return _post(f"{API_ROOT}/models/{model}:generateContent", body, settings)


def _response_text(payload: dict) -> str:
    return payload["candidates"][0]["content"]["parts"][0]["text"]


def _post(url: str, body: dict, settings: Settings) -> dict:
    http_request = request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "x-goog-api-key": settings.gemini_api_key or "",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with request.urlopen(http_request, timeout=settings.gemini_timeout) as response:
            return json.loads(response.read().decode())
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("Gemini request failed: %s", exc)
        raise RuntimeError("The language model request failed.") from exc
