from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasMinimumRole, OrganizationRolePermission

from .agent_service import approve_action, cancel_action, run_turn
from .models import AgentConversation


class AgentTurnView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumRole]

    def post(self, request):
        message = str(request.data.get("message", "")).strip()
        if len(message) < 3:
            raise ValidationError({"message": "Tell the agent what you need."})
        if len(message) > 2000:
            raise ValidationError({"message": "Keep the request under 2000 characters."})
        prior = str(request.data.get("prior", "")).strip()[:500]
        conversation_id = request.data.get("conversation_id") or None
        return Response(
            run_turn(request.user, request.membership, message, prior, conversation_id)
        )


class AgentConversationListView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumRole]

    def get(self, request):
        rows = AgentConversation.objects.filter(
            organization=request.membership.organization,
            actor=request.user,
        ).order_by("-updated_at")
        return Response(
            [
                {
                    "id": str(row.id),
                    "title": row.title,
                    "updated_at": row.updated_at,
                }
                for row in rows
            ]
        )


class AgentConversationDetailView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumRole]

    def get(self, request, conversation_id):
        conversation = AgentConversation.objects.filter(
            pk=conversation_id,
            organization=request.membership.organization,
            actor=request.user,
        ).first()
        if conversation is None:
            raise NotFound("That conversation is not available.")
        return Response(
            {
                "id": str(conversation.id),
                "title": conversation.title,
                "updated_at": conversation.updated_at,
                "messages": [
                    {
                        "id": str(message.id),
                        "role": message.role,
                        "content": message.content,
                        "created_at": message.created_at,
                        "tool_calls": message.tool_calls or [],
                    }
                    for message in conversation.messages.order_by("created_at")
                ],
            }
        )


class AgentActionDecisionView(APIView):
    permission_classes = [IsAuthenticated, OrganizationRolePermission]

    def post(self, request, action_id, decision):
        if decision == "approve":
            return Response(approve_action(request.user, request.membership, action_id))
        if decision == "cancel":
            return Response(cancel_action(request.user, request.membership, action_id))
        raise ValidationError({"decision": "Choose approve or cancel."})
