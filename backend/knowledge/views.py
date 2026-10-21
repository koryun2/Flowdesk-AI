from django.db.models import Count, Q
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import HasMinimumRole, OrganizationRolePermission
from audit.models import ActivityLog
from audit.services import record_activity
from core.api import ordered
from core.files import image_mime, open_stored, store_bytes
from core.jobs import enqueue_document

from .models import KnowledgeDocument
from .services import (
    answer_question,
    clear_stored_file,
    fetch_url_text,
    prepare_document,
    prepare_image_document,
    read_upload,
    rename_document,
    replace_image_document,
    selected_documents,
    store_document_content,
)


DOCUMENT_ORDERING = {
    "updated_at": "updated_at",
    "-updated_at": "-updated_at",
    "title": "title",
    "-title": "-title",
}


class KnowledgeDocumentSerializer(serializers.ModelSerializer):
    chunk_count = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    has_file = serializers.SerializerMethodField()
    content = serializers.CharField(write_only=True, required=False, allow_blank=True)
    file = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = KnowledgeDocument
        fields = [
            "id",
            "title",
            "source_type",
            "status",
            "content",
            "source_url",
            "file_name",
            "mime_type",
            "has_file",
            "file",
            "error_message",
            "chunk_count",
            "size",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "file_name",
            "mime_type",
            "error_message",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "title": {"min_length": 3, "max_length": 240},
            "source_url": {"required": False, "allow_blank": True},
        }

    def get_chunk_count(self, document: KnowledgeDocument) -> int:
        if hasattr(document, "chunk_count"):
            return document.chunk_count
        return document.chunks.count()

    def get_has_file(self, document: KnowledgeDocument) -> bool:
        return bool(document.stored_file)

    def get_size(self, document: KnowledgeDocument) -> str:
        amount = 0
        if document.stored_file:
            try:
                amount = document.stored_file.size
            except (OSError, ValueError):
                amount = 0
        if not amount:
            amount = (document.metadata or {}).get("characters") or len(document.content or "")
        if amount < 1024:
            return f"{amount} B"
        return f"{amount / 1024:.1f} KB"

    def get_created_by(self, document: KnowledgeDocument) -> str:
        user = document.created_by
        if user is None:
            return "Flowdesk"
        name = f"{user.first_name} {user.last_name}".strip()
        return name or user.email

    def validate(self, attrs):
        self._raw = None
        source_type = attrs.get("source_type", KnowledgeDocument.SourceType.TEXT)
        if source_type == KnowledgeDocument.SourceType.URL:
            attrs["content"] = fetch_url_text(attrs.get("source_url", ""))
        elif source_type == KnowledgeDocument.SourceType.FILE:
            raw, file_name, mime_type, content = read_upload(attrs.get("file"))
            self._raw = raw
            attrs["content"] = content
            attrs["file_name"] = file_name
            attrs["mime_type"] = mime_type
        else:
            attrs["content"] = (attrs.get("content") or "").strip()
            attrs["source_type"] = KnowledgeDocument.SourceType.TEXT
        return attrs

    def create(self, validated_data):
        validated_data.pop("file", None)
        raw = self._raw
        content = validated_data.pop("content", "")
        mime_type = validated_data.pop("mime_type", "")
        organization = validated_data["organization"]
        file_name = validated_data.get("file_name", "")
        if raw is not None and image_mime(file_name):
            return prepare_image_document(
                organization,
                validated_data["title"],
                raw,
                file_name=file_name,
                mime_type=mime_type,
                created_by=validated_data.get("created_by"),
            )
        document = prepare_document(
            organization,
            validated_data["title"],
            validated_data.get("source_type", KnowledgeDocument.SourceType.TEXT),
            content,
            source_url=validated_data.get("source_url", ""),
            file_name=file_name,
            mime_type=mime_type,
            created_by=validated_data.get("created_by"),
        )
        if raw is not None:
            store_bytes(document, "stored_file", raw, file_name)
        return document


class KnowledgeDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = KnowledgeDocumentSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in {"list", "retrieve", "ask", "summary", "content", "file"}:
            return [HasMinimumRole()]
        return [OrganizationRolePermission()]

    def get_queryset(self):
        queryset = (
            KnowledgeDocument.objects.filter(organization=self.request.membership.organization)
            .select_related("created_by")
            .annotate(chunk_count=Count("chunks"))
        )
        search = self.request.query_params.get("search", "").strip()[:200]
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(content__icontains=search))
        status_value = self.request.query_params.get("status", "").strip()
        if status_value:
            if status_value not in KnowledgeDocument.Status.values:
                raise serializers.ValidationError({"status": "Unsupported status."})
            queryset = queryset.filter(status=status_value)
        return ordered(
            queryset,
            self.request.query_params.get("ordering"),
            DOCUMENT_ORDERING,
            "-updated_at",
        )

    def perform_create(self, serializer):
        document = serializer.save(
            organization=self.request.membership.organization,
            created_by=self.request.user,
        )
        if document.status == KnowledgeDocument.Status.READY and not (document.content or "").strip():
            record_activity(
                organization=document.organization,
                actor=self.request.user,
                action="added document",
                entity_type=ActivityLog.EntityType.KNOWLEDGE_DOCUMENT,
                entity_id=document.id,
                context={"detail": document.title, "chunks": 0, "status": document.status},
            )
            return
        serializer.instance = enqueue_document(document, self.request.user)

    def partial_update(self, request, *args, **kwargs):
        document = self.get_object()
        payload = request.data
        if set(payload.keys()) - {"title", "content", "source_url", "file", "refresh"}:
            raise serializers.ValidationError(
                {"detail": "Only the title, text, file, or URL can be changed."}
            )
        if not payload:
            raise serializers.ValidationError({"detail": "Nothing to update."})
        replacement = _replacement(document, payload)
        if "title" in payload:
            title = payload.get("title")
            if not isinstance(title, str):
                raise serializers.ValidationError({"title": "Enter a title."})
            previous = document.title
            rename_document(document, title)
            if document.title != previous:
                record_activity(
                    organization=document.organization,
                    actor=request.user,
                    action="renamed document",
                    entity_type=ActivityLog.EntityType.KNOWLEDGE_DOCUMENT,
                    entity_id=document.id,
                    context={"detail": document.title},
                )
        if replacement is not None:
            if replacement["image"]:
                replace_image_document(document, replacement["raw"], **replacement["fields"])
            else:
                changed = store_document_content(
                    document, replacement["content"], **replacement["fields"]
                )
                if replacement["raw"] is not None:
                    store_bytes(
                        document,
                        "stored_file",
                        replacement["raw"],
                        replacement["fields"]["file_name"],
                    )
                else:
                    clear_stored_file(document)
                if changed:
                    document = enqueue_document(document, request.user)
        document = self.get_queryset().get(pk=document.pk)
        return Response(self.get_serializer(document).data)

    def perform_destroy(self, instance):
        organization = instance.organization
        document_id = instance.id
        title = instance.title
        instance.delete()
        record_activity(
            organization=organization,
            actor=self.request.user,
            action="deleted document",
            entity_type=ActivityLog.EntityType.KNOWLEDGE_DOCUMENT,
            entity_id=document_id,
            context={"detail": title},
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        organization = request.membership.organization
        documents = KnowledgeDocument.objects.filter(organization=organization)
        return Response(
            {
                "documents": documents.count(),
                "ready": documents.filter(status=KnowledgeDocument.Status.READY).count(),
                "chunks": organization.knowledge_chunks.count(),
            }
        )

    @action(detail=True, methods=["get"])
    def content(self, request, pk=None):
        document = self.get_object()
        return Response(
            {
                "content": document.content,
                "source_type": document.source_type,
                "source_url": document.source_url,
                "file_name": document.file_name,
                "mime_type": document.mime_type,
                "has_file": bool(document.stored_file),
            }
        )

    @action(detail=True, methods=["get"])
    def file(self, request, pk=None):
        document = self.get_object()
        return open_stored(document.stored_file, document.file_name or "file", document.mime_type)

    @action(detail=False, methods=["post"])
    def ask(self, request):
        question = str(request.data.get("question", "")).strip()
        if len(question) < 3:
            raise serializers.ValidationError({"question": "Ask a complete question."})
        if len(question) > 1000:
            raise serializers.ValidationError({"question": "Keep the question under 1000 characters."})
        document_ids = selected_documents(
            request.membership.organization, request.data.get("document_ids")
        )
        return Response(answer_question(request.membership.organization, question, document_ids))


def _replacement(document: KnowledgeDocument, payload):
    if payload.get("file"):
        raw, file_name, mime_type, content = read_upload(payload["file"])
        return {
            "raw": raw,
            "content": content,
            "image": bool(image_mime(file_name)),
            "fields": {
                "source_type": KnowledgeDocument.SourceType.FILE,
                "file_name": file_name,
                "mime_type": mime_type,
                "source_url": "",
            },
        }
    if payload.get("refresh") is True or str(payload.get("refresh", "")).lower() in {"1", "true", "yes"}:
        if document.source_type != KnowledgeDocument.SourceType.URL or not document.source_url:
            raise serializers.ValidationError({"refresh": "Only a URL source can be refreshed."})
        return {
            "raw": None,
            "content": fetch_url_text(document.source_url),
            "image": False,
            "fields": {},
        }
    if "source_url" in payload and str(payload.get("source_url") or "").strip():
        url = str(payload.get("source_url")).strip()
        return {
            "raw": None,
            "content": fetch_url_text(url),
            "image": False,
            "fields": {
                "source_type": KnowledgeDocument.SourceType.URL,
                "source_url": url,
                "file_name": "",
                "mime_type": "",
            },
        }
    if "content" in payload:
        return {
            "raw": None,
            "content": str(payload.get("content") or ""),
            "image": False,
            "fields": {
                "source_type": KnowledgeDocument.SourceType.TEXT,
                "file_name": "",
                "mime_type": "",
                "source_url": "",
            },
        }
    return None
