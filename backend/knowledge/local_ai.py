import hashlib
import math
import re


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


def chunk_text(text: str, size: int = 700, overlap: int = 100) -> list[str]:
    normalized = re.sub(r"\r\n?", "\n", text).strip()
    if not normalized:
        return []
    if len(normalized) <= size:
        return [normalized]
    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(start + size, len(normalized))
        if end < len(normalized):
            split = normalized.rfind("\n", start + size // 2, end)
            if split == -1:
                split = normalized.rfind(" ", start + size // 2, end)
            if split != -1:
                end = split
        piece = normalized[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(normalized):
            break
        start = max(end - overlap, start + 1)
    return chunks


def cosine(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    return sum(a * b for a, b in zip(left, right))


def hybrid_score(question: str, content: str, query_vector: list[float], content_vector: list[float]) -> float:
    question_tokens = set(tokenize(question))
    content_tokens = set(tokenize(content))
    lexical = (
        len(question_tokens & content_tokens) / len(question_tokens) if question_tokens else 0.0
    )
    score = (0.35 * max(cosine(query_vector, content_vector), 0.0)) + (0.65 * lexical)
    return round(min(max(score, 0.0), 1.0), 4)


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
