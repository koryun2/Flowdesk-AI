from django.db.models import Count, Q
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ROLE_RANK, HasMinimumRole, IsOrganizationMember
from ai_ops.models import AgentAction

from .models import ANALYSIS_MODELS, Membership, Organization

OPEN_TICKET_STATUSES = ("new", "investigating", "waiting")


class OrganizationListView(APIView):
    permission_classes = [IsOrganizationMember]

    def get(self, request):
        organizations = Organization.objects.filter(
            memberships__user=request.user,
            memberships__accepted_at__isnull=False,
            is_active=True,
        ).distinct()
        payload = [
            {
                "id": organization.id,
                "name": organization.name,
                "slug": organization.slug,
                "plan": organization.plan,
                "role": organization.memberships.get(user=request.user).role,
            }
            for organization in organizations
        ]
        return Response(payload)


def workspace_settings(organization: Organization) -> dict:
    model = organization.analysis_model
    if model not in ANALYSIS_MODELS:
        model = ANALYSIS_MODELS[0]
    return {
        "name": organization.name,
        "slug": organization.slug,
        "auto_analyze_tickets": organization.auto_analyze_tickets,
        "require_agent_approval": organization.require_agent_approval,
        "analysis_model": model,
    }


class WorkspaceSettingsView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumRole]

    def get(self, request):
        return Response(workspace_settings(request.membership.organization))

    def patch(self, request):
        if ROLE_RANK[request.membership.role] < ROLE_RANK[Membership.Role.ADMIN]:
            raise PermissionDenied("An admin needs to change workspace settings.")
        organization = request.membership.organization
        fields = []
        if "auto_analyze_tickets" in request.data:
            organization.auto_analyze_tickets = _bool_setting(
                request.data.get("auto_analyze_tickets"),
                "auto_analyze_tickets",
            )
            fields.append("auto_analyze_tickets")
        if "require_agent_approval" in request.data:
            organization.require_agent_approval = _bool_setting(
                request.data.get("require_agent_approval"),
                "require_agent_approval",
            )
            fields.append("require_agent_approval")
        if "analysis_model" in request.data:
            model = str(request.data.get("analysis_model") or "")
            if model not in ANALYSIS_MODELS:
                raise ValidationError({"analysis_model": "Choose a supported analysis model."})
            organization.analysis_model = model
            fields.append("analysis_model")
        if "name" in request.data:
            name = str(request.data.get("name") or "").strip()
            if not 2 <= len(name) <= 160:
                raise ValidationError({"name": "Enter a workspace name."})
            organization.name = name
            fields.append("name")
        if "slug" in request.data:
            organization.slug = _workspace_slug(organization, request.data.get("slug"))
            fields.append("slug")
        if fields:
            organization.save(update_fields=[*fields, "updated_at"])
        return Response(workspace_settings(organization))


class WorkspaceUsageView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumRole]

    def get(self, request):
        start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        count = AgentAction.objects.filter(
            organization=request.membership.organization,
            created_at__gte=start,
        ).count()
        return Response({"actions_this_month": count})


def _workspace_slug(organization: Organization, value) -> str:
    slug = slugify(str(value or ""))[:80]
    if len(slug) < 2:
        raise ValidationError({"slug": "Enter a workspace URL."})
    taken = Organization.objects.exclude(pk=organization.pk).filter(slug=slug).exists()
    if taken:
        raise ValidationError({"slug": "That workspace URL is already in use."})
    return slug


def _bool_setting(value, field: str) -> bool:
    if not isinstance(value, bool):
        raise ValidationError({field: "Choose yes or no."})
    return value


class WorkspaceMemberListView(APIView):
    permission_classes = [IsOrganizationMember]

    def get(self, request):
        organization = request.membership.organization
        memberships = (
            Membership.objects.filter(
                organization=organization,
                accepted_at__isnull=False,
            )
            .select_related("user")
            .annotate(
                open_ticket_count=Count(
                    "user__assigned_tickets",
                    filter=Q(
                        user__assigned_tickets__organization=organization,
                        user__assigned_tickets__status__in=OPEN_TICKET_STATUSES,
                    ),
                    distinct=True,
                ),
                resolved_ticket_count=Count(
                    "user__assigned_tickets",
                    filter=Q(
                        user__assigned_tickets__organization=organization,
                        user__assigned_tickets__status__in=["resolved", "closed"],
                    ),
                    distinct=True,
                ),
            )
            .order_by("user__first_name", "user__email")
        )
        return Response(
            [
                {
                    "id": membership.user_id,
                    "email": membership.user.email,
                    "first_name": membership.user.first_name,
                    "last_name": membership.user.last_name,
                    "role": membership.role,
                    "open_ticket_count": membership.open_ticket_count,
                    "resolved_ticket_count": membership.resolved_ticket_count,
                }
                for membership in memberships
            ]
        )
