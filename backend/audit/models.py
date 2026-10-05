import uuid

from django.conf import settings
from django.db import models

from organizations.models import Organization


class ActivityLog(models.Model):
    class EntityType(models.TextChoices):
        ORGANIZATION = "organization", "Organization"
        MEMBERSHIP = "membership", "Membership"
        USER = "user", "User"
        CUSTOMER = "customer", "Customer"
        TICKET = "ticket", "Ticket"
        COMMENT = "comment", "Comment"
        TAG = "tag", "Tag"
        KNOWLEDGE_DOCUMENT = "knowledge_document", "Knowledge document"
        AI_ANALYSIS = "ai_analysis", "AI analysis"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activity_logs",
    )
    action = models.CharField(max_length=64)
    entity_type = models.CharField(max_length=40, choices=EntityType.choices)
    entity_id = models.UUIDField()
    changes = models.JSONField(default=dict, blank=True)
    context = models.JSONField(default=dict, blank=True)
    request_id = models.UUIDField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["organization", "-created_at"],
                name="audit_org_created_idx",
            ),
            models.Index(
                fields=["organization", "entity_type", "entity_id"],
                name="audit_entity_idx",
            ),
            models.Index(fields=["actor", "-created_at"], name="audit_actor_created_idx"),
            models.Index(
                fields=["organization", "action", "-created_at"],
                name="audit_org_action_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.action} {self.entity_type}:{self.entity_id}"


class Notification(models.Model):
    class Tone(models.TextChoices):
        TICKET = "ticket", "Ticket"
        AI = "ai", "AI"
        KNOWLEDGE = "knowledge", "Knowledge"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=160)
    detail = models.CharField(max_length=240, blank=True)
    tone = models.CharField(max_length=20, choices=Tone.choices)
    link = models.CharField(max_length=200, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["organization", "recipient", "-created_at"],
                name="notice_recipient_created_idx",
            ),
            models.Index(
                fields=["recipient", "read_at"],
                name="notice_recipient_read_idx",
            ),
        ]

    def __str__(self) -> str:
        return self.title
