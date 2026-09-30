from datetime import datetime, timedelta
from uuid import UUID

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import OrganizationRolePermission
from ai_ops.services import analyze_ticket
from audit.models import ActivityLog
from audit.services import record_activity
from core.api import ordered

from .models import Comment, Tag, Ticket
from .serializers import (
    CommentSerializer,
    TagSerializer,
    TicketDetailSerializer,
    TicketSerializer,
)

OPEN_STATUSES = (
    Ticket.Status.NEW,
    Ticket.Status.INVESTIGATING,
    Ticket.Status.WAITING,
)
TICKET_ORDERING = {
    "created_at": "created_at",
    "-created_at": "-created_at",
    "updated_at": "updated_at",
    "-updated_at": "-updated_at",
    "priority": "priority_rank",
    "-priority": "-priority_rank",
    "title": "title",
    "-title": "-title",
    "number": "number",
    "-number": "-number",
}


class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [OrganizationRolePermission]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        queryset = Tag.objects.filter(organization=self.request.membership.organization)
        search = self.request.query_params.get("search", "").strip()[:200]
        if search:
            queryset = queryset.filter(name__icontains=search)
        return ordered(queryset, self.request.query_params.get("ordering"), {"name": "name", "-name": "-name"}, "name")

    def perform_create(self, serializer):
        tag = serializer.save(organization=self.request.membership.organization)
        record_activity(
            organization=tag.organization,
            actor=self.request.user,
            action="created tag",
            entity_type=ActivityLog.EntityType.TAG,
            entity_id=tag.id,
            context={"name": tag.name},
        )


class TicketViewSet(viewsets.ModelViewSet):
    permission_classes = [OrganizationRolePermission]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TicketDetailSerializer
        return TicketSerializer

    def get_queryset(self):
        organization = self.request.membership.organization
        queryset = (
            Ticket.objects.filter(organization=organization)
            .select_related("customer", "assignee", "created_by")
            .prefetch_related("tags", "comments__author", "ai_analyses")
            .annotate(
                comment_count=Count("comments", distinct=True),
                priority_rank=priority_rank_expression(),
            )
        )
        params = self.request.query_params
        status_value = params.get("status", "").strip()
        if status_value:
            if status_value not in Ticket.Status.values:
                raise ValidationError({"status": "Unsupported status."})
            queryset = queryset.filter(status=status_value)
        priority = params.get("priority", "").strip()
        if priority:
            if priority not in Ticket.Priority.values:
                raise ValidationError({"priority": "Unsupported priority."})
            queryset = queryset.filter(priority=priority)
        assignee = params.get("assignee", "").strip()
        if assignee == "unassigned":
            queryset = queryset.filter(assignee__isnull=True)
        elif assignee:
            queryset = queryset.filter(assignee_id=parse_uuid(assignee, "assignee"))
        customer = params.get("customer", "").strip()
        if customer:
            queryset = queryset.filter(customer_id=parse_uuid(customer, "customer"))
        tag = params.get("tag", "").strip()
        if tag:
            queryset = queryset.filter(tags__id=parse_uuid(tag, "tag")).distinct()
        search = params.get("search", "").strip()[:200]
        if search:
            queryset = queryset.filter(ticket_search(search))
        return ordered(queryset, params.get("ordering"), TICKET_ORDERING, "-created_at")

    def perform_create(self, serializer):
        ticket = serializer.save(
            organization=self.request.membership.organization,
            created_by=self.request.user,
        )
        record_activity(
            organization=ticket.organization,
            actor=self.request.user,
            action="created ticket",
            entity_type=ActivityLog.EntityType.TICKET,
            entity_id=ticket.id,
            context={"detail": ticket.title},
        )
        if ticket.organization.auto_analyze_tickets:
            analyze_ticket(ticket)

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        ticket = serializer.save()
        detail = ticket.title
        if ticket.status != previous_status:
            detail = f"{previous_status} → {ticket.status}"
        record_activity(
            organization=ticket.organization,
            actor=self.request.user,
            action="updated ticket",
            entity_type=ActivityLog.EntityType.TICKET,
            entity_id=ticket.id,
            context={"detail": detail},
        )

    def perform_destroy(self, instance):
        organization = instance.organization
        ticket_id = instance.id
        title = instance.title
        instance.delete()
        record_activity(
            organization=organization,
            actor=self.request.user,
            action="deleted ticket",
            entity_type=ActivityLog.EntityType.TICKET,
            entity_id=ticket_id,
            context={"detail": title},
        )

    @action(detail=True, methods=["post"])
    def analyze(self, request, pk=None):
        ticket = self.get_object()
        analyze_ticket(ticket)
        ticket = self.get_queryset().get(pk=ticket.pk)
        return Response(TicketDetailSerializer(ticket, context=self.get_serializer_context()).data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        queryset = Ticket.objects.filter(organization=request.membership.organization)
        return Response(
            {
                "open": queryset.filter(status__in=OPEN_STATUSES).count(),
                "urgent": queryset.filter(
                    status__in=OPEN_STATUSES,
                    priority=Ticket.Priority.URGENT,
                ).count(),
                "resolved": queryset.filter(
                    status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]
                ).count(),
                "total": queryset.count(),
            }
        )

    @action(detail=False, methods=["get"])
    def volume(self, request):
        raw_days = request.query_params.get("days", "7")
        if raw_days not in {"7", "30"}:
            raise ValidationError({"days": "Choose 7 or 30 days."})
        day_count = int(raw_days)
        organization = request.membership.organization
        start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start -= timedelta(days=day_count - 1)
        created_rows = _daily_counts(
            Ticket.objects.filter(organization=organization, created_at__gte=start),
            "created_at",
        )
        resolved_rows = _daily_counts(
            Ticket.objects.filter(organization=organization, resolved_at__gte=start),
            "resolved_at",
        )
        points = []
        for offset in range(day_count):
            day = (start + timedelta(days=offset)).date()
            points.append(
                {
                    "date": day.isoformat(),
                    "created": created_rows.get(day, 0),
                    "resolved": resolved_rows.get(day, 0),
                }
            )
        from ai_ops.models import AIAnalysis

        analyses = AIAnalysis.objects.filter(
            organization=organization,
            status=AIAnalysis.Status.COMPLETED,
        )
        categories: dict[str, int] = {}
        confidences: list[float] = []
        for analysis in analyses:
            if analysis.category:
                categories[analysis.category] = categories.get(analysis.category, 0) + 1
            confidence = (analysis.raw_response or {}).get("confidence")
            if isinstance(confidence, int | float):
                confidences.append(float(confidence))
        average = round(sum(confidences) / len(confidences), 4) if confidences else None
        return Response(
            {
                "points": points,
                "categories": [
                    {"category": category, "count": count}
                    for category, count in sorted(categories.items())
                ],
                "average_confidence": average,
            }
        )

    @action(detail=True, methods=["post"])
    def comments(self, request, pk=None):
        ticket = self.get_object()
        serializer = CommentSerializer(
            data=request.data,
            context={**self.get_serializer_context(), "ticket": ticket},
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(ticket=ticket, author=request.user)
        record_activity(
            organization=ticket.organization,
            actor=request.user,
            action="added internal note" if comment.is_internal else "replied to customer",
            entity_type=ActivityLog.EntityType.TICKET,
            entity_id=ticket.id,
            context={"detail": comment.body[:180]},
        )
        ticket = self.get_queryset().get(pk=ticket.pk)
        return Response(
            TicketDetailSerializer(ticket, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


def _daily_counts(queryset, field: str) -> dict:
    rows = (
        queryset.annotate(day=TruncDate(field))
        .values("day")
        .annotate(total=Count("id"))
    )
    return {_as_date(row["day"]): row["total"] for row in rows if row["day"] is not None}


def _as_date(value):
    if isinstance(value, datetime):
        return value.date()
    return value


def parse_uuid(value: str, field: str):
    try:
        return UUID(value)
    except ValueError:
        raise ValidationError({field: "Enter a valid identifier."}) from None


def priority_rank_expression():
    from django.db.models import Case, IntegerField, Value, When

    return Case(
        When(priority=Ticket.Priority.LOW, then=Value(1)),
        When(priority=Ticket.Priority.MEDIUM, then=Value(2)),
        When(priority=Ticket.Priority.HIGH, then=Value(3)),
        When(priority=Ticket.Priority.URGENT, then=Value(4)),
        default=Value(0),
        output_field=IntegerField(),
    )


def ticket_search(term: str):
    query = (
        Q(title__icontains=term)
        | Q(description__icontains=term)
        | Q(customer__name__icontains=term)
        | Q(customer__email__icontains=term)
        | Q(customer__company__icontains=term)
    )
    number_text = term.upper().removeprefix("FD-")
    if number_text.isdigit():
        query |= Q(number=int(number_text))
    return query
