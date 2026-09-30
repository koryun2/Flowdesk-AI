from django.db import models
from django.db.models import Q

from core.models import TimeStampedUUIDModel
from organizations.models import Organization


class Customer(TimeStampedUUIDModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="customers",
    )
    name = models.CharField(max_length=160)
    email = models.EmailField(null=True, blank=True)
    company = models.CharField(max_length=160, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    external_id = models.CharField(max_length=120, null=True, blank=True)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "email"],
                condition=Q(email__isnull=False) & ~Q(email=""),
                name="unique_customer_email_per_org",
            ),
            models.UniqueConstraint(
                fields=["organization", "external_id"],
                condition=Q(external_id__isnull=False) & ~Q(external_id=""),
                name="unique_customer_external_id_per_org",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "name"], name="cust_org_name_idx"),
            models.Index(fields=["organization", "company"], name="cust_org_company_idx"),
            models.Index(fields=["organization", "-created_at"], name="cust_org_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.organization})"
