from uuid import UUID

from rest_framework.permissions import SAFE_METHODS, BasePermission

from organizations.models import Membership

ROLE_RANK = {
    Membership.Role.VIEWER: 1,
    Membership.Role.AGENT: 2,
    Membership.Role.ADMIN: 3,
    Membership.Role.OWNER: 4,
}


def resolve_membership(request):
    if not request.user.is_authenticated:
        return None

    memberships = request.user.memberships.select_related("organization").filter(
        accepted_at__isnull=False,
        organization__is_active=True,
    )
    organization_id = request.headers.get("X-Organization-Id")
    if organization_id:
        try:
            UUID(organization_id)
        except ValueError:
            return None
        return memberships.filter(organization_id=organization_id).first()
    return memberships.order_by("created_at").first()


class IsOrganizationMember(BasePermission):
    message = "You do not have access to this workspace."

    def has_permission(self, request, view):
        membership = resolve_membership(request)
        if membership is None:
            return False
        request.membership = membership
        return True


class HasMinimumRole(BasePermission):
    message = "Your workspace role cannot perform this action."

    def has_permission(self, request, view):
        membership = resolve_membership(request)
        if membership is None:
            return False
        required_role = getattr(view, "required_role", Membership.Role.VIEWER)
        request.membership = membership
        return ROLE_RANK[membership.role] >= ROLE_RANK[required_role]


class OrganizationRolePermission(BasePermission):
    """Viewers can read. Agents can write. Admins can delete."""

    message = "Your workspace role cannot perform this action."

    def has_permission(self, request, view):
        membership = resolve_membership(request)
        if membership is None:
            return False
        request.membership = membership
        if request.method in SAFE_METHODS:
            required_role = Membership.Role.VIEWER
        elif request.method == "DELETE":
            required_role = getattr(view, "delete_role", Membership.Role.ADMIN)
        else:
            required_role = getattr(view, "write_role", Membership.Role.AGENT)
        return ROLE_RANK[membership.role] >= ROLE_RANK[required_role]
