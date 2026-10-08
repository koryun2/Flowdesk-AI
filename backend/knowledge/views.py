from django.db.models import Count
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import HasMinimumRole, OrganizationRolePermission
from audit.models import ActivityLog
from audit.services import record_activity
from core.api import ordered

from .models import KnowledgeDocument
from .services import (
    answer_question,
    extract_upload,
    fetch_url_text,
    index_document,
    prepare_document,
    rename_document,
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

    def get_size(self, document: KnowledgeDocument) -> str:
        characters = (document.metadata or {}).get("characters") or len(document.content or "")
        if characters < 1024:
            return f"{characters} B"
        return f"{characters / 1024:.1f} KB"

    def get_created_by(self, document: KnowledgeDocument) -> str:
        user = document.created_by
        if user is None:
            return "Flowdesk"
        name = f"{user.first_name} {user.last_name}".strip()
        return name or user.email

    def validate(self, attrs):
        source_type = attrs.get("source_type", KnowledgeDocument.SourceType.TEXT)
        if source_type == KnowledgeDocument.SourceType.URL:
            attrs["content"] = fetch_url_text(attrs.get("source_url", ""))
        elif source_type == KnowledgeDocument.SourceType.FILE:
            upload = attrs.get("file")
            if upload is None:
                raise serializers.ValidationError({"file": "Choose a file."})
            content, file_name, mime_type = extract_upload(upload)
            attrs["content"] = content
            attrs["file_name"] = file_name
            attrs["mime_type"] = mime_type
        else:
            attrs["content"] = (attrs.get("content") or "").strip()
            attrs["source_type"] = KnowledgeDocument.SourceType.TEXT
        return attrs

    def create(self, validated_data):
        validated_data.pop("file", None)
        content = validated_data.pop("content")
        mime_type = validated_data.pop("mime_type", "")
        organization = validated_data["organization"]
        document = prepare_document(
            organization,
            validated_data["title"],
            validated_data.get("source_type", KnowledgeDocument.SourceType.TEXT),
            content,
            source_url=validated_data.get("source_url", ""),
            file_name=validated_data.get("file_name", ""),
            mime_type=mime_type,
            created_by=validated_data.get("created_by"),
        )
        return index_document(document)


class KnowledgeDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = KnowledgeDocumentSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in {"list", "retrieve", "ask", "summary"}:
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
            queryset = queryset.filter(title__icontains=search)
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
        record_activity(
            organization=document.organization,
            actor=self.request.user,
            action="added document",
            entity_type=ActivityLog.EntityType.KNOWLEDGE_DOCUMENT,
            entity_id=document.id,
            context={
                "detail": document.title,
                "chunks": (document.metadata or {}).get("chunk_count", 0),
                "status": document.status,
            },
        )

    def partial_update(self, request, *args, **kwargs):
        document = self.get_object()
        if set(request.data.keys()) - {"title"}:
            raise serializers.ValidationError({"title": "Only the title can be changed."})
        title = request.data.get("title")
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

    @action(detail=False, methods=["post"])
    def ask(self, request):
        question = str(request.data.get("question", "")).strip()
        if len(question) < 3:
            raise serializers.ValidationError({"question": "Ask a complete question."})
        if len(question) > 1000:
            raise serializers.ValidationError({"question": "Keep the question under 1000 characters."})
        return Response(answer_question(request.membership.organization, question))
