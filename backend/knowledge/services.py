import hashlib
import ipaddress
import logging
import re
import socket
from html import escape
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from urllib import error, request
from urllib.parse import urlparse
from uuid import UUID, uuid4

from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from core.files import MAX_UPLOAD_BYTES, image_mime, read_limited, safe_name, store_bytes

from .client import KnowledgeAIError, request_answer, request_embeddings, request_note_draft, request_summary
from .local_ai import (
    EMBEDDING_DIMENSIONS,
    INSUFFICIENT_ANSWER,
    LOCAL_ANSWER_MODEL,
    LOCAL_EMBEDDING_MODEL,
    SECTION_BOOST,
    answer_from_sources,
    chunk_document,
    detect_sections,
    embed_text,
    hybrid_score,
    is_complex_question,
    leaks_draft,
    section_answer,
    specific_tokens,
    tokenize,
)
from .models import KnowledgeChunk, KnowledgeDocument, KnowledgeFile
from .vectors import nearest_chunk_ids, write_vectors


logger = logging.getLogger("flowdesk.api")

MAX_DOCUMENT_CHARS = 60_000
MAX_DOCUMENT_FILES = 8
MAX_CHUNKS = 80
MIN_RELEVANCE = 0.15
MAX_CONTEXT_CHUNKS = 3
TEXT_EXTENSIONS = {".txt", ".md", ".markdown", ".csv", ".json"}
HTML_EXTENSIONS = {".html", ".htm"}


def index_document(document: KnowledgeDocument, *, remote: bool = True) -> KnowledgeDocument:
    document.status = KnowledgeDocument.Status.PROCESSING
    document.error_message = ""
    document.save(update_fields=["status", "error_message", "updated_at"])
    try:
        corpus = indexable_text(document)
        pieces = chunk_document(corpus)[:MAX_CHUNKS]
        if not pieces:
            raise ValueError("The document has no readable text.")
        vectors, model_name = embed_document([content for _section, content in pieces], remote=remote)
        chunks = [
            KnowledgeChunk(
                id=uuid4(),
                organization=document.organization,
                document=document,
                position=position,
                section=section,
                content=content,
                embedding=vector,
                embedding_model=model_name,
            )
            for position, ((section, content), vector) in enumerate(zip(pieces, vectors))
        ]
        with transaction.atomic():
            document.chunks.all().delete()
            KnowledgeChunk.objects.bulk_create(chunks)
            document.status = KnowledgeDocument.Status.READY
            document.metadata = {
                **(document.metadata or {}),
                "characters": len(corpus),
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


def answer_question(organization, question: str, document_ids=None) -> dict:
    if not detect_sections(question) and any(token in _TITLE_ALIASES for token in tokenize(question)):
        titled = title_catalog_answer(organization, question, document_ids)
        if titled:
            return titled
    vector, model_name = embed_query(question)
    matches = ranked_chunks(organization, question, vector, model_name, document_ids)
    if not matches and model_name != LOCAL_EMBEDDING_MODEL:
        vector = embed_text(question)
        model_name = LOCAL_EMBEDDING_MODEL
        matches = ranked_chunks(organization, question, vector, model_name, document_ids)
    hints = detect_sections(question)
    if hints and len(hints) <= 3 and not is_complex_question(question):
        direct = direct_sections_answer(
            organization, question, hints, vector, model_name, document_ids
        )
        if direct:
            return direct
    contexts = context_sources(matches)
    sources = cited_sources(matches)
    if not sources:
        titled = title_catalog_answer(organization, question, document_ids)
        if titled:
            return titled
        return {
            "answer": INSUFFICIENT_ANSWER,
            "sources": [],
            "model_name": LOCAL_ANSWER_MODEL,
        }
    try:
        answer, answer_model = request_answer(question, contexts)
    except KnowledgeAIError:
        answer, answer_model = answer_from_sources(question, contexts), LOCAL_ANSWER_MODEL
    if leaks_draft(answer):
        answer = answer_from_sources(question, contexts)
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
        notes=normalized if source_type == KnowledgeDocument.SourceType.TEXT else "",
        checksum=checksum,
        status=KnowledgeDocument.Status.DRAFT,
        **fields,
    )
    document.full_clean()
    document.save()
    return document


def prepare_image_document(
    organization,
    title: str,
    data: bytes,
    *,
    file_name: str,
    mime_type: str,
    created_by=None,
) -> KnowledgeDocument:
    checksum = hashlib.sha256(data).hexdigest()
    if KnowledgeDocument.objects.filter(organization=organization, checksum=checksum).exists():
        raise serializers.ValidationError({"file": "This file is already in the knowledge base."})
    document = KnowledgeDocument(
        organization=organization,
        created_by=created_by,
        title=title.strip(),
        slug=unique_slug(organization, title),
        source_type=KnowledgeDocument.SourceType.FILE,
        content="",
        file_name=file_name,
        mime_type=mime_type,
        checksum=checksum,
        status=KnowledgeDocument.Status.READY,
        metadata={"characters": 0, "chunk_count": 0},
    )
    document.full_clean()
    document.save()
    store_bytes(document, "stored_file", data, file_name)
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


def context_sources(matches) -> list[dict]:
    return [
        {
            "document_id": str(chunk.document_id),
            "title": chunk.document.title,
            "excerpt": chunk.content[:500],
            "relevance": score,
        }
        for score, chunk in matches
    ]


def cited_sources(matches) -> list[dict]:
    sources = []
    for source in context_sources(matches):
        current = next((item for item in sources if item["document_id"] == source["document_id"]), None)
        if current is None:
            sources.append(dict(source))
            continue
        if source["excerpt"] not in current["excerpt"]:
            current["excerpt"] = f"{current['excerpt']}\n\n{source['excerpt']}"[:500]
    return sources


def selected_documents(organization, raw) -> list[UUID] | None:
    if raw in (None, ""):
        return None
    if not isinstance(raw, list):
        raise serializers.ValidationError({"document_ids": "Choose sources from this workspace."})
    if len(raw) > 20:
        raise serializers.ValidationError({"document_ids": "Choose 20 sources or fewer."})
    if not raw:
        return None
    ids = []
    for item in raw:
        try:
            ids.append(UUID(str(item)))
        except (TypeError, ValueError) as exc:
            raise serializers.ValidationError(
                {"document_ids": "Choose sources from this workspace."}
            ) from exc
    found = set(
        KnowledgeDocument.objects.filter(organization=organization, id__in=ids).values_list(
            "id", flat=True
        )
    )
    if found != set(ids):
        raise serializers.ValidationError({"document_ids": "Choose sources from this workspace."})
    return ids


def direct_sections_answer(organization, question, sections, vector, model_name, document_ids=None):
    answers = []
    sources = []
    for section in sections:
        direct = direct_section_answer(
            organization, question, section, vector, model_name, document_ids
        )
        if not direct:
            return None
        answers.append(direct["answer"])
        for source in direct["sources"]:
            current = next(
                (item for item in sources if item["document_id"] == source["document_id"]),
                None,
            )
            if current is None:
                sources.append(dict(source))
                continue
            if source["excerpt"] not in current["excerpt"]:
                current["excerpt"] = f"{current['excerpt']}\n\n{source['excerpt']}"[:500]
            current["relevance"] = max(current["relevance"], source["relevance"])
    return {
        "answer": "\n\n".join(answers),
        "sources": sources,
        "model_name": LOCAL_ANSWER_MODEL,
    }


def direct_section_answer(
    organization, question: str, section: str, vector: list[float], model_name: str, document_ids=None
):
    chunks = list(
        _chunk_base(organization, model_name, document_ids).filter(section=section)
    )
    if not chunks:
        return None
    grouped: dict = {}
    for chunk in chunks:
        grouped.setdefault(chunk.document_id, []).append(chunk)
    specific = specific_tokens(question, section)
    ranked = []
    for parts in grouped.values():
        document = parts[0].document
        overlap = len(specific & set(tokenize(document.content[:8000]))) if specific else 1
        best = 0.0
        for chunk in parts:
            embedding = chunk.embedding if isinstance(chunk.embedding, list) else []
            if len(embedding) == len(vector):
                best = max(best, hybrid_score(question, chunk.content, vector, embedding))
        ranked.append((overlap, best, document, parts))
    ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
    overlap, score, document, parts = ranked[0]
    if specific and overlap == 0:
        return None
    parts.sort(key=lambda chunk: chunk.position)
    answer = section_answer([chunk.content for chunk in parts])
    if not answer:
        return None
    return {
        "answer": answer,
        "sources": [
            {
                "document_id": str(document.id),
                "title": document.title,
                "excerpt": parts[0].content[:500],
                "relevance": min(1.0, round(score + SECTION_BOOST, 4)),
            }
        ],
        "model_name": LOCAL_ANSWER_MODEL,
    }


_CATALOG_TOKENS = {
    "all",
    "any",
    "base",
    "bring",
    "every",
    "find",
    "get",
    "give",
    "knowledge",
    "list",
    "please",
    "show",
}
_TITLE_ALIASES = {
    "cv": ("cv", "resume"),
    "cvs": ("cv", "resume"),
    "resume": ("resume", "cv"),
    "resumes": ("resume", "cv"),
}


def _title_needles(question: str) -> list[str]:
    needles = []
    for token in tokenize(question):
        if token in _CATALOG_TOKENS:
            continue
        for alias in _TITLE_ALIASES.get(token, (token,)):
            if (len(alias) >= 3 or alias == "cv") and alias not in needles:
                needles.append(alias)
            if alias.endswith("s") and len(alias) > 4 and alias[:-1] not in needles:
                needles.append(alias[:-1])
    return needles


def title_catalog_answer(organization, question: str, document_ids=None):
    needles = _title_needles(question)
    if not needles:
        return None
    documents = KnowledgeDocument.objects.filter(
        organization=organization,
        status=KnowledgeDocument.Status.READY,
    )
    if document_ids:
        documents = documents.filter(id__in=document_ids)
    matched = [
        document
        for document in documents.order_by("title")
        if any(needle in document.title.lower() for needle in needles)
    ]
    if not matched:
        return None
    shown = matched[:5]
    sources = []
    excerpts = []
    for document in shown:
        excerpt = (document.content or "").strip()[:500]
        excerpts.append(f"{document.title}\n{excerpt}".strip())
        sources.append(
            {
                "document_id": str(document.id),
                "title": document.title,
                "excerpt": excerpt,
                "relevance": 1.0,
            }
        )
    answer = "\n\n".join(excerpts)
    hidden = len(matched) - len(shown)
    if hidden:
        answer += f"\n\n{hidden} more matching sources are in the library."
    return {"answer": answer, "sources": sources, "model_name": LOCAL_ANSWER_MODEL}


def ranked_chunks(organization, question: str, vector: list[float], model_name: str, document_ids=None):
    hints = set(detect_sections(question))
    base = _chunk_base(organization, model_name, document_ids)
    pool = {}
    candidate_ids = nearest_chunk_ids(organization.id, vector, model_name)
    candidates = base.filter(id__in=candidate_ids) if candidate_ids else base
    for chunk in candidates:
        pool[chunk.id] = chunk
    if hints:
        for chunk in base.filter(section__in=hints):
            pool[chunk.id] = chunk
    scored = []
    for chunk in pool.values():
        embedding = chunk.embedding
        if not isinstance(embedding, list) or len(embedding) != len(vector):
            continue
        score = hybrid_score(question, chunk.content, vector, embedding)
        if chunk.section in hints:
            score = min(1.0, round(score + SECTION_BOOST, 4))
        if score >= MIN_RELEVANCE:
            scored.append((score, chunk))
    best = {}
    for score, chunk in scored:
        key = (chunk.document_id, chunk.section or "")
        current = best.get(key)
        if current is None or score > current[0]:
            best[key] = (score, chunk)
    ranked = sorted(best.values(), key=lambda item: item[0], reverse=True)
    return ranked[:MAX_CONTEXT_CHUNKS]


def _chunk_base(organization, model_name: str, document_ids):
    base = KnowledgeChunk.objects.filter(
        organization=organization,
        embedding_model=model_name,
        document__status=KnowledgeDocument.Status.READY,
    ).select_related("document")
    if document_ids:
        base = base.filter(document_id__in=document_ids)
    return base


def store_document_content(document: KnowledgeDocument, content: str, **fields) -> bool:
    normalized = content.strip()
    if len(normalized) < 40:
        raise serializers.ValidationError({"content": "Add at least 40 characters of readable text."})
    if len(normalized) > MAX_DOCUMENT_CHARS:
        raise serializers.ValidationError(
            {"content": "This document is too long to index. Split it into smaller sources."}
        )
    checksum = hashlib.sha256(normalized.encode()).hexdigest()
    if (
        KnowledgeDocument.objects.filter(organization=document.organization, checksum=checksum)
        .exclude(pk=document.pk)
        .exists()
    ):
        raise serializers.ValidationError(
            {"content": "This content is already in the knowledge base."}
        )
    changed = checksum != document.checksum
    previous = (document.content or "").strip()
    document.content = normalized
    document.checksum = checksum
    update_fields = ["content", "checksum", "updated_at"]
    for name, value in fields.items():
        setattr(document, name, value)
        update_fields.append(name)
    if document.source_type == KnowledgeDocument.SourceType.TEXT and (document.notes or "").strip() in {
        "",
        previous,
    }:
        if (document.notes or "") != normalized:
            document.notes = normalized
            update_fields.append("notes")
            changed = True
    if changed:
        document.summary = ""
        update_fields.append("summary")
    document.save(update_fields=update_fields)
    return changed


def replace_image_document(document: KnowledgeDocument, data: bytes, **fields) -> KnowledgeDocument:
    checksum = hashlib.sha256(data).hexdigest()
    if (
        KnowledgeDocument.objects.filter(organization=document.organization, checksum=checksum)
        .exclude(pk=document.pk)
        .exists()
    ):
        raise serializers.ValidationError({"file": "This file is already in the knowledge base."})
    document.chunks.all().delete()
    document.content = ""
    document.summary = ""
    document.checksum = checksum
    document.status = KnowledgeDocument.Status.READY
    document.error_message = ""
    document.metadata = {"characters": 0, "chunk_count": 0}
    update_fields = [
        "content",
        "summary",
        "checksum",
        "status",
        "error_message",
        "metadata",
        "updated_at",
    ]
    for name, value in fields.items():
        setattr(document, name, value)
        update_fields.append(name)
    document.save(update_fields=update_fields)
    store_bytes(document, "stored_file", data, fields.get("file_name") or document.file_name)
    return document


def indexable_text(document: KnowledgeDocument) -> str:
    parts = []
    content = (document.content or "").strip()
    notes = (document.notes or "").strip()
    if content:
        parts.append(content)
    if notes and notes != content:
        parts.append(notes)
    for extra in document.files.order_by("created_at").values_list("extracted_text", flat=True):
        text = (extra or "").strip()
        if text and text not in parts:
            parts.append(text)
    return "\n\n".join(parts)[:MAX_DOCUMENT_CHARS]


def save_notes(document: KnowledgeDocument, notes: str) -> bool:
    cleaned = notes.strip()
    if len(cleaned) > MAX_DOCUMENT_CHARS:
        raise serializers.ValidationError({"notes": "These notes are too long."})
    owns_body = (
        document.source_type == KnowledgeDocument.SourceType.TEXT
        and not document.stored_file
        and not document.files.exists()
    )
    if owns_body:
        if cleaned == (document.content or "").strip() and cleaned == (document.notes or "").strip():
            return False
        if len(cleaned) < 40:
            raise serializers.ValidationError(
                {"notes": "Add at least 40 characters of readable text."}
            )
        changed = store_document_content(document, cleaned)
        if (document.notes or "") != cleaned:
            document.notes = cleaned
            document.save(update_fields=["notes", "updated_at"])
            return True
        return changed
    if cleaned == (document.notes or ""):
        return False
    document.notes = cleaned
    document.save(update_fields=["notes", "updated_at"])
    return True


def add_document_file(document: KnowledgeDocument, upload) -> KnowledgeFile:
    attached = document.files.count() + (1 if document.stored_file else 0)
    if attached >= MAX_DOCUMENT_FILES:
        raise serializers.ValidationError({"file": "A source can hold 8 files."})
    raw, file_name, mime_type, text = read_upload(upload)
    extracted = text.strip()[:MAX_DOCUMENT_CHARS]
    record = KnowledgeFile(
        organization=document.organization,
        document=document,
        file_name=file_name,
        mime_type=mime_type,
        extracted_text=extracted,
    )
    record.full_clean()
    record.save()
    store_bytes(record, "stored_file", raw, file_name)
    return record


def source_material(document: KnowledgeDocument) -> str:
    parts = []
    content = (document.content or "").strip()
    if content:
        parts.append(content)
    for extra in document.files.order_by("created_at").values_list("extracted_text", flat=True):
        text = (extra or "").strip()
        if text and text not in parts:
            parts.append(text)
    return "\n\n".join(parts)[:8000]


def clip_summary(text: str) -> str:
    compact = " ".join((text or "").split())
    if not compact:
        return ""
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", compact) if part.strip()]
    chosen = " ".join(sentences[:3])
    if len(chosen) > 280:
        trimmed = chosen[:277].rsplit(" ", 1)[0].rstrip(".,;:")
        chosen = f"{trimmed}."
    return chosen


def write_summary(document: KnowledgeDocument) -> str:
    material = source_material(document) or (document.notes or "").strip()
    if not material:
        document.summary = ""
        document.save(update_fields=["summary", "updated_at"])
        return ""
    try:
        drafted = request_summary(material)
    except KnowledgeAIError:
        drafted = material
    summary = clip_summary(drafted)
    document.summary = summary
    document.save(update_fields=["summary", "updated_at"])
    return summary


def draft_notes(document: KnowledgeDocument, request_text: str) -> str:
    cleaned = request_text.strip()
    if len(cleaned) < 3:
        raise serializers.ValidationError({"request": "Describe what the notes should say."})
    if len(cleaned) > 1000:
        raise serializers.ValidationError({"request": "Keep the request under 1000 characters."})
    material = source_material(document)
    try:
        draft = request_note_draft(material, cleaned, document.notes or "")
    except KnowledgeAIError as exc:
        raise serializers.ValidationError(
            {"request": "The assistant could not write those notes."}
        ) from exc
    return draft.strip()[:MAX_DOCUMENT_CHARS]


def clear_stored_file(document: KnowledgeDocument) -> None:
    if not document.stored_file:
        return
    document.stored_file.delete(save=False)
    document.stored_file = ""
    document.save(update_fields=["stored_file", "updated_at"])


def rename_document(document: KnowledgeDocument, title: str) -> KnowledgeDocument:
    cleaned = title.strip()
    if not 3 <= len(cleaned) <= 240:
        raise serializers.ValidationError({"title": "Enter a title between 3 and 240 characters."})
    if cleaned == document.title:
        return document
    document.title = cleaned
    document.slug = unique_slug(document.organization, cleaned, exclude=document.pk)
    document.save(update_fields=["title", "slug", "updated_at"])
    return document


def unique_slug(organization, title: str, *, exclude=None) -> str:
    base = slugify(title)[:100] or "document"
    slug = base
    suffix = 2
    while (
        KnowledgeDocument.objects.filter(organization=organization, slug=slug)
        .exclude(pk=exclude)
        .exists()
    ):
        slug = f"{base[:90]}-{suffix}"
        suffix += 1
    return slug


def read_upload(upload) -> tuple[bytes, str, str, str]:
    if upload is None:
        raise serializers.ValidationError({"file": "Choose a file."})
    data = read_limited(upload)
    name = safe_name(getattr(upload, "name", "") or "document.txt")
    mime = image_mime(name)
    if mime:
        return data, name, mime, ""
    suffix = Path(name).suffix.lower()
    if suffix in TEXT_EXTENSIONS:
        text = data.decode("utf-8", errors="replace")
    elif suffix in HTML_EXTENSIONS:
        text = _html_text(data.decode("utf-8", errors="replace"))
    elif suffix == ".pdf":
        text = _pdf_text(data)
    elif suffix == ".docx":
        text = _docx_text(data)
    else:
        raise serializers.ValidationError(
            {"file": "Upload a .txt, .md, .html, .csv, .json, .pdf, .docx, or an image."}
        )
    content_type = getattr(upload, "content_type", "") or "application/octet-stream"
    return data, name, content_type, text


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


def docx_html(data: bytes, title: str) -> str:
    try:
        from docx import Document
        from docx.oxml.ns import qn
        from docx.table import Table
        from docx.text.paragraph import Paragraph
    except ImportError as exc:
        raise serializers.ValidationError({"file": "Word import is unavailable."}) from exc
    try:
        document = Document(BytesIO(data))
    except Exception as exc:
        raise serializers.ValidationError({"file": "The Word document could not be read."}) from exc
    blocks = []
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            block = _paragraph_html(Paragraph(child, document))
        elif child.tag == qn("w:tbl"):
            block = _table_html(Table(child, document))
        else:
            block = ""
        if block:
            blocks.append(block)
    body = "\n".join(blocks) or "<p>This document has no readable text.</p>"
    safe_title = escape(title or "Document")
    return (
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
        f"<title>{safe_title}</title>"
        "<style>body{max-width:760px;margin:40px auto;padding:0 20px;"
        "color:#1a1d2b;font:16px/1.5 sans-serif}"
        "table{border-collapse:collapse;width:100%}"
        "td{border:1px solid #e4e7ee;padding:6px 8px;vertical-align:top}</style>"
        f"</head><body><h1>{safe_title}</h1>{body}</body></html>"
    )


def _paragraph_html(paragraph) -> str:
    inner = "".join(_run_html(run) for run in paragraph.runs).strip()
    if not inner:
        inner = escape(paragraph.text or "").strip()
    if not inner:
        return ""
    name = paragraph.style.name.lower() if paragraph.style is not None and paragraph.style.name else ""
    tag = "h2" if name == "heading 1" else "h3" if name.startswith("heading") else "p"
    return f"<{tag}>{inner}</{tag}>"


def _run_html(run) -> str:
    text = escape(run.text or "")
    if not text:
        return ""
    if run.bold:
        text = f"<strong>{text}</strong>"
    if run.italic:
        text = f"<em>{text}</em>"
    return text


def _table_html(table) -> str:
    rows = []
    for row in table.rows:
        cells = "".join(
            f"<td>{escape(cell.text or '').replace(chr(10), '<br>')}</td>" for cell in row.cells
        )
        rows.append(f"<tr>{cells}</tr>")
    return f"<table>{''.join(rows)}</table>"


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
