from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from core.models import TimeStampedUUIDModel
from organizations.models import Organization


class KnowledgeDocument(TimeStampedUUIDModel):
    class SourceType(models.TextChoices):
        TEXT = "text", "Text"
        FILE = "file", "File"
        URL = "url", "URL"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PROCESSING = "processing", "Processing"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"
        ARCHIVED = "archived", "Archived"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="knowledge_documents",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_knowledge_documents",
    )
    title = models.CharField(max_length=240)
    slug = models.SlugField(max_length=120)
    source_type = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.TEXT,
    )
    content = models.TextField(blank=True)
    source_url = models.URLField(blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    mime_type = models.CharField(max_length=120, blank=True)
    checksum = models.CharField(max_length=64, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "slug"],
                name="unique_document_slug_per_org",
            ),
            models.UniqueConstraint(
                fields=["organization", "checksum"],
                condition=~Q(checksum=""),
                name="unique_document_checksum_per_org",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "status", "-updated_at"],
                name="doc_org_status_idx",
            ),
            models.Index(fields=["organization", "title"], name="doc_org_title_idx"),
        ]

    def clean(self) -> None:
        super().clean()
        if self.source_type == self.SourceType.URL and not self.source_url:
            raise ValidationError(
                {"source_url": "A source URL is required for URL documents."}
            )
        if self.source_type == self.SourceType.FILE and not self.file_name:
            raise ValidationError(
                {"file_name": "A file name is required for file documents."}
            )

    def __str__(self) -> str:
        return self.title


class KnowledgeChunk(TimeStampedUUIDModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="knowledge_chunks",
    )
    document = models.ForeignKey(
        KnowledgeDocument,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    position = models.PositiveIntegerField()
    content = models.TextField()
    embedding = models.JSONField(default=list, blank=True)
    embedding_model = models.CharField(max_length=120)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "position"],
                name="unique_chunk_position_per_document",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "embedding_model"],
                name="chunk_org_model_idx",
            ),
            models.Index(
                fields=["document", "position"],
                name="chunk_document_position_idx",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if (
            self.document_id
            and self.organization_id
            and self.document.organization_id != self.organization_id
        ):
            raise ValidationError(
                {"document": "The chunk must belong to the document organization."}
            )

    def __str__(self) -> str:
        return f"{self.document} #{self.position}"
