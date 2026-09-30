import hashlib
import math
import re

from .config import Settings
from .gemini import embed_texts as embed_with_provider
from .gemini import generate_text


EMBEDDING_DIMENSIONS = 128
LOCAL_EMBEDDING_MODEL = "flowdesk-local-embed"
LOCAL_ANSWER_MODEL = "flowdesk-local"

EXPANSIONS = {
    "dataset": ("export",),
    "datasets": ("export",),
    "csv": ("export",),
    "invoice": ("billing", "payment"),
    "invoices": ("billing", "payment"),
    "webhook": ("api",),
    "webhooks": ("api",),
}


def tokenize(text: str) -> list[str]:
    cleaned = re.sub(r"(?<=\d),(?=\d)", "", text.lower())
    tokens = [token for token in re.findall(r"[a-z0-9]+", cleaned) if len(token) >= 2]
    expanded = list(tokens)
    seen = set(tokens)
    for token in tokens:
        for extra in EXPANSIONS.get(token, ()):
            if extra not in seen:
                seen.add(extra)
                expanded.append(extra)
    return expanded


def embed_text(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSIONS
    tokens = tokenize(text)
    if not tokens:
        vector[0] = 1.0
        return vector
    for token in tokens:
        digest = hashlib.sha256(token.encode()).digest()
        bucket = int.from_bytes(digest[:2], "big") % EMBEDDING_DIMENSIONS
        sign = 1.0 if digest[2] % 2 == 0 else -1.0
        vector[bucket] += sign
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        vector[0] = 1.0
        return vector
    return [round(value / norm, 6) for value in vector]


def answer_from_sources(question: str, sources: list[dict]) -> str:
    if not sources or sources[0].get("relevance", 0) < 0.15:
        return "The knowledge base does not contain enough information to answer that."
    question_tokens = set(tokenize(question))
    excerpt = str(sources[0].get("excerpt", "")).strip()
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", excerpt)
        if sentence.strip()
    ]
    if not sentences:
        return excerpt or "The knowledge base does not contain enough information to answer that."
    ranked = sorted(
        sentences,
        key=lambda sentence: len(question_tokens & set(tokenize(sentence))),
        reverse=True,
    )
    start = sentences.index(ranked[0])
    return " ".join(sentences[start : start + 2])


def embed_texts(texts: list[str], settings: Settings) -> tuple[list[list[float]], str]:
    if settings.gemini_api_key:
        return embed_with_gemini(texts, settings)
    return [embed_text(text) for text in texts], LOCAL_EMBEDDING_MODEL


def answer_question(question: str, sources: list[dict], settings: Settings) -> tuple[str, str]:
    if settings.gemini_api_key and sources:
        try:
            return answer_with_gemini(question, sources, settings), settings.gemini_model
        except RuntimeError:
            pass
    return answer_from_sources(question, sources), LOCAL_ANSWER_MODEL


def embed_with_gemini(texts: list[str], settings: Settings) -> tuple[list[list[float]], str]:
    vectors = embed_with_provider(texts, settings, EMBEDDING_DIMENSIONS)
    return vectors, settings.gemini_embedding_model


def answer_with_gemini(question: str, sources: list[dict], settings: Settings) -> str:
    excerpts = "\n\n".join(
        f"Source {index + 1} — {source.get('title', 'Source')}:\n{source.get('excerpt', '')}"
        for index, source in enumerate(sources)
    )
    answer = generate_text(
        (
            "Answer the question using only the provided sources. "
            "If the sources do not contain the answer, say the knowledge base does not contain enough information. "
            "Write at most two sentences and do not invent steps."
        ),
        f"Question: {question}\n\nSources:\n{excerpts}",
        settings,
    )
    return answer[:2000]
