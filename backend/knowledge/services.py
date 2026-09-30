import hashlib
import ipaddress
import logging
import socket
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from urllib import error, request
from urllib.parse import urlparse
from uuid import uuid4

from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from .client import KnowledgeAIError, request_answer, request_embeddings
from .local_ai import (
    EMBEDDING_DIMENSIONS,
    LOCAL_ANSWER_MODEL,
    LOCAL_EMBEDDING_MODEL,
    answer_from_sources,
    chunk_text,
    embed_text,
    hybrid_score,
)
from .models import KnowledgeChunk, KnowledgeDocument
from .vectors import nearest_chunk_ids, write_vectors


logger = logging.getLogger("flowdesk.api")

MAX_DOCUMENT_CHARS = 60_000
MAX_CHUNKS = 80
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MIN_RELEVANCE = 0.15
TEXT_EXTENSIONS = {".txt", ".md", ".markdown"}


def index_document(document: KnowledgeDocument, *, remote: bool = True) -> KnowledgeDocument:
    document.status = KnowledgeDocument.Status.PROCESSING
    document.error_message = ""
    document.save(update_fields=["status", "error_message", "updated_at"])
    try:
        pieces = chunk_text(document.content)[:MAX_CHUNKS]
        if not pieces:
            raise ValueError("The document has no readable text.")
        vectors, model_name = embed_document(pieces, remote=remote)
        chunks = [
            KnowledgeChunk(
                id=uuid4(),
                organization=document.organization,
                document=document,
                position=position,
                content=piece,
                embedding=vector,
                embedding_model=model_name,
            )
            for position, (piece, vector) in enumerate(zip(pieces, vectors))
        ]
        with transaction.atomic():
            document.chunks.all().delete()
            KnowledgeChunk.objects.bulk_create(chunks)
            document.status = KnowledgeDocument.Status.READY
            document.metadata = {
                **(document.metadata or {}),
                "characters": len(document.content),
                "chunk_count": len(chunks),
                "embedding_model": model_name,
            }
            document.error_message = ""
            document.save(update_fields=["status", "metadata", "error_message", "updated_at"])
        write_vectors(chunks)
    except (KnowledgeAIError, ValueError, TypeError) as exc:
        _mark_failed(document, str(exc))
    except Exception:
        logger.exception("Knowledge indexing failed for %s", document.pk)
        _mark_failed(document, "Indexing failed.")
    return document


def answer_question(organization, question: str) -> dict:
    vector, model_name = embed_query(question)
    matches = ranked_chunks(organization, question, vector, model_name)
    if not matches and model_name != LOCAL_EMBEDDING_MODEL:
        vector = embed_text(question)
        matches = ranked_chunks(organization, question, vector, LOCAL_EMBEDDING_MODEL)
    sources = [
        {
            "document_id": str(chunk.document_id),
            "title": chunk.document.title,
            "excerpt": chunk.content[:500],
            "relevance": score,
        }
        for score, chunk in matches
    ]
    if not sources:
        return {
            "answer": "The knowledge base does not contain enough information to answer that.",
            "sources": [],
            "model_name": LOCAL_ANSWER_MODEL,
        }
    try:
        answer, answer_model = request_answer(question, sources)
    except KnowledgeAIError:
        answer, answer_model = answer_from_sources(question, sources), LOCAL_ANSWER_MODEL
    return {"answer": answer, "sources": sources, "model_name": answer_model}


def prepare_document(organization, title: str, source_type: str, content: str, **fields) -> KnowledgeDocument:
    normalized = content.strip()
    if len(normalized) < 40:
        raise serializers.ValidationError(
            {"content": "Add at least 40 characters of readable text."}
        )
    if len(normalized) > MAX_DOCUMENT_CHARS:
        raise serializers.ValidationError(
            {"content": "This document is too long to index. Split it into smaller sources."}
        )
    checksum = hashlib.sha256(normalized.encode()).hexdigest()
    if KnowledgeDocument.objects.filter(organization=organization, checksum=checksum).exists():
        raise serializers.ValidationError(
            {"content": "This content is already in the knowledge base."}
        )
    document = KnowledgeDocument(
        organization=organization,
        title=title.strip(),
        slug=unique_slug(organization, title),
        source_type=source_type,
        content=normalized,
        checksum=checksum,
        status=KnowledgeDocument.Status.DRAFT,
        **fields,
    )
    document.full_clean()
    document.save()
    return document


def embed_document(pieces: list[str], *, remote: bool) -> tuple[list[list[float]], str]:
    if remote:
        try:
            vectors, model_name = request_embeddings(pieces)
            _validate_vectors(vectors, len(pieces))
            return vectors, model_name
        except KnowledgeAIError as exc:
            logger.warning("Falling back to local embeddings: %s", exc)
    return [embed_text(piece) for piece in pieces], LOCAL_EMBEDDING_MODEL


def embed_query(question: str) -> tuple[list[float], str]:
    try:
        vectors, model_name = request_embeddings([question])
        _validate_vectors(vectors, 1)
        return vectors[0], model_name
    except KnowledgeAIError:
        return embed_text(question), LOCAL_EMBEDDING_MODEL


def ranked_chunks(organization, question: str, vector: list[float], model_name: str):
    queryset = KnowledgeChunk.objects.filter(
        organization=organization,
        embedding_model=model_name,
        document__status=KnowledgeDocument.Status.READY,
    ).select_related("document")
    candidate_ids = nearest_chunk_ids(organization.id, vector, model_name)
    if candidate_ids:
        queryset = queryset.filter(id__in=candidate_ids)
    scored = []
    for chunk in queryset:
        embedding = chunk.embedding
        if not isinstance(embedding, list) or len(embedding) != len(vector):
            continue
        score = hybrid_score(question, chunk.content, vector, embedding)
        if score >= MIN_RELEVANCE:
            scored.append((score, chunk))
    scored.sort(key=lambda item: item[0], reverse=True)
    return scored[:4]


def unique_slug(organization, title: str) -> str:
    base = slugify(title)[:100] or "document"
    slug = base
    suffix = 2
    while KnowledgeDocument.objects.filter(organization=organization, slug=slug).exists():
        slug = f"{base[:90]}-{suffix}"
        suffix += 1
    return slug


def extract_upload(upload) -> tuple[str, str, str]:
    if upload.size > MAX_UPLOAD_BYTES:
        raise serializers.ValidationError({"file": "Files must be 8 MB or smaller."})
    name = Path(upload.name or "document.txt").name
    suffix = Path(name).suffix.lower()
    data = upload.read()
    if suffix in TEXT_EXTENSIONS:
        text = data.decode("utf-8", errors="replace")
    elif suffix == ".pdf":
        text = _pdf_text(data)
    elif suffix == ".docx":
        text = _docx_text(data)
    else:
        raise serializers.ValidationError(
            {"file": "Upload a .txt, .md, .pdf, or .docx file."}
        )
    mime = getattr(upload, "content_type", "") or "application/octet-stream"
    return text, name, mime


def fetch_url_text(url: str) -> str:
    public_url = _public_http_url(url)
    http_request = request.Request(
        public_url,
        headers={"User-Agent": "FlowdeskKnowledge/1.0"},
        method="GET",
    )
    try:
        with request.urlopen(http_request, timeout=10) as response:
            raw = response.read(MAX_UPLOAD_BYTES + 1)
            content_type = response.headers.get("Content-Type", "")
    except error.HTTPError as exc:
        raise serializers.ValidationError(
            {"source_url": f"The URL returned status {exc.code}."}
        ) from exc
    except (error.URLError, TimeoutError) as exc:
        raise serializers.ValidationError({"source_url": "The URL could not be reached."}) from exc
    if len(raw) > MAX_UPLOAD_BYTES:
        raise serializers.ValidationError({"source_url": "That page is too large to import."})
    text = raw.decode("utf-8", errors="replace")
    if "html" in content_type or text.lstrip().lower().startswith("<!doctype") or "<html" in text[:200].lower():
        text = _html_text(text)
    return text


def _validate_vectors(vectors, expected: int) -> None:
    if len(vectors) != expected or any(
        not isinstance(vector, list) or len(vector) != EMBEDDING_DIMENSIONS for vector in vectors
    ):
        raise KnowledgeAIError("AI service returned an unexpected embedding.")


def _mark_failed(document: KnowledgeDocument, message: str) -> None:
    document.status = KnowledgeDocument.Status.FAILED
    document.error_message = message[:1000]
    document.save(update_fields=["status", "error_message", "updated_at"])


def _public_http_url(url: str) -> str:
    parsed = urlparse((url or "").strip())
    host = parsed.hostname
    if parsed.scheme not in {"http", "https"} or not host:
        raise serializers.ValidationError({"source_url": "Enter an http or https URL."})
    if host == "localhost" or host.endswith(".local"):
        raise serializers.ValidationError({"source_url": "That URL cannot be imported."})
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        infos = socket.getaddrinfo(host, port)
    except socket.gaierror as exc:
        raise serializers.ValidationError({"source_url": "That URL could not be resolved."}) from exc
    for info in infos:
        address = ipaddress.ip_address(info[4][0])
        if not address.is_global:
            raise serializers.ValidationError({"source_url": "That URL cannot be imported."})
    return parsed.geturl()


def _html_text(markup: str) -> str:
    parser = _TextExtractor()
    parser.feed(markup)
    return parser.text()


def _pdf_text(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise serializers.ValidationError({"file": "PDF import is unavailable."}) from exc
    try:
        reader = PdfReader(BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as exc:
        raise serializers.ValidationError({"file": "The PDF could not be read."}) from exc


def _docx_text(data: bytes) -> str:
    try:
        from docx import Document
    except ImportError as exc:
        raise serializers.ValidationError({"file": "Word import is unavailable."}) from exc
    try:
        document = Document(BytesIO(data))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    except Exception as exc:
        raise serializers.ValidationError({"file": "The Word document could not be read."}) from exc


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"} and self.skip:
            self.skip -= 1
        if tag in {"p", "div", "br", "li", "h1", "h2", "h3", "tr"}:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

    def text(self) -> str:
        return "".join(self.parts)
