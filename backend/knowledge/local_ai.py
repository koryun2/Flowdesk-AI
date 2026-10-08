import hashlib
import math
import re


EMBEDDING_DIMENSIONS = 128
LOCAL_EMBEDDING_MODEL = "flowdesk-local-embed"
LOCAL_ANSWER_MODEL = "flowdesk-local"
INSUFFICIENT_ANSWER = (
    "The knowledge base does not contain enough information to answer this question."
)
_PROCESS = re.compile(
    r"(?im)(?:^|\n)\s*(?:[\*\-•]\s*)?"
    r"(?:(?:user\s+)?question|constraints|(?:context\s+)?provided|source\s+\d+|draft\s*\d*|"
    r"check against constraints|sentence\s+\d+|direct answer|direct and concise|"
    r"only info from context|no invented|no reasoning|"
    r"self-correction(?:\s+during\s+drafting)?)\s*[:?]"
)

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


SECTION_KEYWORDS = {
    "education": ("education", "degree", "university", "college", "studied", "academic", "school"),
    "experience": ("experience", "worked", "employment", "career", "companies", "company"),
    "skills": ("skills", "skill", "technologies", "technology", "stack", "programming"),
    "projects": ("projects", "project", "portfolio", "built"),
    "profile": ("profile", "summary", "about"),
    "training": ("training", "course", "courses", "certification", "certifications"),
}
SECTION_BOOST = 0.45
_COMPLEX_QUESTION = re.compile(
    r"\b(how|why|compare|comparison|difference|complement|evolve|evolved|between|versus|vs|relate|relationship)\b",
    re.I,
)
_STOP_TOKENS = {
    "what",
    "whats",
    "who",
    "is",
    "are",
    "was",
    "were",
    "the",
    "his",
    "her",
    "their",
    "does",
    "did",
    "do",
    "for",
    "and",
    "with",
    "about",
    "tell",
    "me",
    "of",
    "in",
    "on",
    "to",
    "from",
    "where",
    "when",
}


def detect_sections(question: str) -> list[str]:
    tokens = set(tokenize(question))
    return [key for key, words in SECTION_KEYWORDS.items() if tokens & set(words)]


def is_complex_question(question: str) -> bool:
    return bool(_COMPLEX_QUESTION.search(question or ""))


def specific_tokens(question: str, section: str) -> set[str]:
    return set(tokenize(question)) - set(SECTION_KEYWORDS.get(section, ())) - _STOP_TOKENS


def heading_text(line: str) -> str | None:
    stripped = line.strip().strip("*").strip()
    markdown = re.match(r"^#{1,3}\s+(.+)$", stripped)
    if markdown:
        stripped = markdown.group(1).strip()
    if not 3 <= len(stripped) <= 48 or re.search(r"[.!?]", stripped):
        return None
    letters = [character for character in stripped if character.isalpha()]
    if len(letters) < 4:
        return None
    if markdown or sum(character.isupper() for character in letters) / len(letters) >= 0.8:
        return stripped
    return None


def section_key(heading: str) -> str:
    tokens = set(tokenize(heading))
    for key, words in SECTION_KEYWORDS.items():
        if tokens & set(words):
            return key
    slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
    return slug[:40] or "section"


def chunk_document(text: str, size: int = 700) -> list[tuple[str, str]]:
    normalized = re.sub(r"\r\n?", "\n", text).strip()
    if not normalized:
        return []
    lines = normalized.split("\n")
    headings = [
        (index, heading)
        for index, line in enumerate(lines)
        if (heading := heading_text(line))
    ]
    if len(headings) < 2:
        return [("", piece) for piece in chunk_text(normalized, size=size)]
    pieces: list[tuple[str, str]] = []
    preamble = "\n".join(lines[: headings[0][0]]).strip()
    if preamble:
        pieces.extend(("", piece) for piece in chunk_text(preamble, size=size))
    for offset, (index, heading) in enumerate(headings):
        end = headings[offset + 1][0] if offset + 1 < len(headings) else len(lines)
        body = "\n".join(lines[index + 1 : end]).strip()
        if not body:
            continue
        pieces.extend(_section_pieces(section_key(heading), heading, body, size))
    return pieces


def _section_pieces(section: str, heading: str, body: str, size: int) -> list[tuple[str, str]]:
    content = f"{heading}\n{body}"
    if len(content) <= size:
        return [(section, content)]
    return [
        (section, f"{heading}\n{piece}".strip())
        for piece in chunk_text(body, size=max(size - len(heading) - 1, 200))
    ]


def section_answer(contents: list[str]) -> str:
    bodies = []
    for content in contents:
        lines = content.splitlines()
        if lines and heading_text(lines[0]):
            lines = lines[1:]
        body = " ".join(line.strip() for line in lines if line.strip())
        if body:
            bodies.append(body)
    return " ".join(bodies)[:2000]


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


def leaks_draft(text: str) -> bool:
    return bool(_PROCESS.search(text or ""))


def answer_from_sources(question: str, sources: list[dict]) -> str:
    if not sources or sources[0].get("relevance", 0) < 0.15:
        return INSUFFICIENT_ANSWER
    question_tokens = set(tokenize(question))
    excerpt = str(sources[0].get("excerpt", "")).strip()
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", excerpt)
        if sentence.strip()
    ]
    if not sentences:
        return excerpt or INSUFFICIENT_ANSWER
    ranked = sorted(
        sentences,
        key=lambda sentence: len(question_tokens & set(tokenize(sentence))),
        reverse=True,
    )
    start = sentences.index(ranked[0])
    return " ".join(sentences[start : start + 2])
