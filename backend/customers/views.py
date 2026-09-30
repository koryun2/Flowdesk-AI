from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import OrganizationRolePermission
from audit.models import ActivityLog
from audit.services import record_activity
from core.api import Conflict, ordered

from .models import Customer
from .serializers import OPEN_TICKET_STATUSES, CustomerSerializer

CUSTOMER_ORDERING = {
    "name": "name",
    "-name": "-name",
    "company": "company",
    "-company": "-company",
    "created_at": "created_at",
    "-created_at": "-created_at",
    "updated_at": "updated_at",
    "-updated_at": "-updated_at",
}


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [OrganizationRolePermission]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        organization = self.request.membership.organization
        queryset = Customer.objects.filter(organization=organization).annotate(
            ticket_count=Count("tickets", distinct=True),
            open_ticket_count=Count(
                "tickets",
                filter=Q(tickets__status__in=OPEN_TICKET_STATUSES),
                distinct=True,
            ),
        )
        search = self.request.query_params.get("search", "").strip()[:200]
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(company__icontains=search)
            )
        return ordered(
            queryset,
            self.request.query_params.get("ordering"),
            CUSTOMER_ORDERING,
            "name",
        )

    def perform_create(self, serializer):
        customer = serializer.save(organization=self.request.membership.organization)
        record_activity(
            organization=customer.organization,
            actor=self.request.user,
            action="created customer",
            entity_type=ActivityLog.EntityType.CUSTOMER,
            entity_id=customer.id,
            context={"name": customer.name},
        )

    def perform_update(self, serializer):
        customer = serializer.save()
        record_activity(
            organization=customer.organization,
            actor=self.request.user,
            action="updated customer",
            entity_type=ActivityLog.EntityType.CUSTOMER,
            entity_id=customer.id,
            changes=serializer.validated_data,
            context={"name": customer.name},
        )

    def perform_destroy(self, instance):
        if instance.tickets.exists():
            raise Conflict("Customers with tickets cannot be deleted.")
        organization = instance.organization
        customer_id = instance.id
        name = instance.name
        instance.delete()
        record_activity(
            organization=organization,
            actor=self.request.user,
            action="deleted customer",
            entity_type=ActivityLog.EntityType.CUSTOMER,
            entity_id=customer_id,
            context={"name": name},
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = Customer.objects.filter(organization=request.membership.organization)
        return Response(
            {
                "total": queryset.count(),
                "enterprise": queryset.filter(metadata__plan="Enterprise").count(),
                "at_risk": queryset.filter(
                    metadata__health__in=["at_risk", "critical"]
                ).count(),
            }
        )
