from django.conf import settings
from django.db import models

from core.models import TimeStampedUUIDModel


class Organization(TimeStampedUUIDModel):
    class Plan(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"
        ENTERPRISE = "enterprise", "Enterprise"

    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80, unique=True)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.FREE)
    is_active = models.BooleanField(default=True)
    auto_analyze_tickets = models.BooleanField(default=False)
    require_agent_approval = models.BooleanField(default=True)
    analysis_model = models.CharField(max_length=80, default="gemma-4-26b-a4b-it")
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="Membership",
        through_fields=("organization", "user"),
        related_name="organizations",
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "name"], name="org_active_name_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class Membership(TimeStampedUUIDModel):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        AGENT = "agent", "Agent"
        VIEWER = "viewer", "Viewer"

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.AGENT)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sent_organization_invites",
    )
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["organization", "user"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"],
                name="unique_org_membership",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "role"], name="member_org_role_idx"),
            models.Index(fields=["user", "role"], name="member_user_role_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.user} in {self.organization} ({self.role})"
