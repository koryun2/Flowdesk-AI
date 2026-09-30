from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Q

from core.models import TimeStampedUUIDModel
from customers.models import Customer
from organizations.models import Organization


class Tag(TimeStampedUUIDModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="tags",
    )
    name = models.CharField(max_length=50)
    color = models.CharField(
        max_length=7,
        default="#64748B",
        validators=[
            RegexValidator(
                regex=r"^#[0-9A-Fa-f]{6}$",
                message="Use a six-digit hexadecimal color such as #64748B.",
            )
        ],
    )

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="unique_tag_name_per_org",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "name"], name="tag_org_name_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class Ticket(TimeStampedUUIDModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        INVESTIGATING = "investigating", "Investigating"
        WAITING = "waiting", "Waiting"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    class Source(models.TextChoices):
        WEB = "web", "Web"
        EMAIL = "email", "Email"
        API = "api", "API"
        AGENT = "agent", "AI Agent"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="tickets",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="tickets",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_tickets",
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_tickets",
    )
    title = models.CharField(max_length=240)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.WEB)
    tags = models.ManyToManyField(Tag, through="TicketTag", related_name="tickets", blank=True)
    number = models.PositiveIntegerField()
    version = models.PositiveIntegerField(default=1)
    due_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "number"],
                name="unique_ticket_number_per_org",
            ),
            models.CheckConstraint(
                condition=Q(version__gte=1),
                name="ticket_version_at_least_one",
            ),
            models.CheckConstraint(
                condition=(
                    Q(
                        status__in=["resolved", "closed"],
                        resolved_at__isnull=False,
                    )
                    | (
                        ~Q(status__in=["resolved", "closed"])
                        & Q(resolved_at__isnull=True)
                    )
                ),
                name="ticket_resolution_timestamp_matches_status",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization", "status", "-created_at"],
                name="ticket_org_status_idx",
            ),
            models.Index(
                fields=["organization", "priority", "-created_at"],
                name="ticket_org_priority_idx",
            ),
            models.Index(
                fields=["organization", "assignee", "status"],
                name="ticket_org_assignee_idx",
            ),
            models.Index(
                fields=["customer", "-created_at"],
                name="ticket_customer_created_idx",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if (
            self.organization_id
            and self.customer_id
            and self.customer.organization_id != self.organization_id
        ):
            raise ValidationError(
                {"customer": "The customer must belong to the ticket organization."}
            )

    def __str__(self) -> str:
        return f"FD-{self.number} {self.title}"


class TicketTag(TimeStampedUUIDModel):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="ticket_tags",
    )
    tag = models.ForeignKey(
        Tag,
        on_delete=models.CASCADE,
        related_name="ticket_tags",
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="added_ticket_tags",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["ticket", "tag"],
                name="unique_tag_per_ticket",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if (
            self.ticket_id
            and self.tag_id
            and self.ticket.organization_id != self.tag.organization_id
        ):
            raise ValidationError(
                {"tag": "The tag must belong to the ticket organization."}
            )

    def __str__(self) -> str:
        return f"{self.ticket} — {self.tag}"


class Comment(TimeStampedUUIDModel):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ticket_comments",
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    body = models.TextField()
    is_internal = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(body=""),
                name="comment_body_not_empty",
            ),
        ]
        indexes = [
            models.Index(fields=["ticket", "created_at"], name="comment_ticket_created_idx"),
            models.Index(fields=["author", "-created_at"], name="comment_author_created_idx"),
        ]

    def clean(self) -> None:
        super().clean()
        if self.parent_id and self.ticket_id and self.parent.ticket_id != self.ticket_id:
            raise ValidationError(
                {"parent": "A reply must belong to the same ticket as its parent."}
            )

    def __str__(self) -> str:
        return f"Comment on {self.ticket}"
