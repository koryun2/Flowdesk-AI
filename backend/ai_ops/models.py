from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from django.conf import settings

from core.models import TimeStampedUUIDModel
from organizations.models import Organization
from tickets.models import Ticket


class AIAnalysis(TimeStampedUUIDModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class Category(models.TextChoices):
        BUG = "bug", "Bug"
        FEATURE_REQUEST = "feature_request", "Feature request"
        BILLING = "billing", "Billing"
        GENERAL_INQUIRY = "general_inquiry", "General inquiry"

    class Sentiment(models.TextChoices):
        POSITIVE = "positive", "Positive"
        NEUTRAL = "neutral", "Neutral"
        NEGATIVE = "negative", "Negative"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="ai_analyses",
    )
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="ai_analyses",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    category = models.CharField(max_length=30, choices=Category.choices, blank=True)
    priority = models.CharField(max_length=20, choices=Ticket.Priority.choices, blank=True)
    sentiment = models.CharField(max_length=20, choices=Sentiment.choices, blank=True)
    summary = models.TextField(blank=True) 
    suggested_tags = models.JSONField(default=list, blank=True)
    model_name = models.CharField(max_length=120, blank=True)
    prompt_version = models.CharField(max_length=40, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(status__in=["completed", "failed"], finished_at__isnull=False)
                    | (
                        ~Q(status__in=["completed", "failed"])
                        & Q(finished_at__isnull=True)
                    )
                ),
                name="analysis_finish_time_matches_status",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "status", "-created_at"],
                name="analysis_org_status_idx",
            ),
            models.Index(
                fields=["ticket", "-created_at"],
                name="analysis_ticket_created_idx",
            ),
            models.Index(
                fields=["organization", "category", "-created_at"],
                name="analysis_org_category_idx",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if (
            self.organization_id
            and self.ticket_id
            and self.ticket.organization_id != self.organization_id
        ):
            raise ValidationError(
                {"ticket": "The ticket must belong to the analysis organization."}
            )
        if self.status == self.Status.COMPLETED and not self.summary:
            raise ValidationError(
                {"summary": "A completed analysis must include a summary."}
            )

    def __str__(self) -> str:
        return f"Analysis for {self.ticket} ({self.status})"


class AgentAction(TimeStampedUUIDModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        FAILED = "failed", "Failed"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="agent_actions",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="agent_actions",
    )
    tool_name = models.CharField(max_length=40)
    arguments = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    result = models.TextField(blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["organization", "actor", "status"],
                name="agent_action_actor_status_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.tool_name} ({self.status})"


class AgentConversation(TimeStampedUUIDModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="agent_conversations",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="agent_conversations",
    )
    title = models.CharField(max_length=80)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(
                fields=["organization", "actor", "-updated_at"],
                name="agent_conversation_actor_idx",
            ),
        ]

    def __str__(self) -> str:
        return self.title


class AgentMessage(TimeStampedUUIDModel):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    conversation = models.ForeignKey(
        AgentConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    tool_calls = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.role} in {self.conversation_id}"
