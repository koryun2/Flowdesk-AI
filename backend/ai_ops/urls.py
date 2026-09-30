from django.urls import path

from .views import (
    AgentActionDecisionView,
    AgentConversationDetailView,
    AgentConversationListView,
    AgentTurnView,
)

urlpatterns = [
    path("agent/turns/", AgentTurnView.as_view(), name="agent-turn"),
    path("agent/conversations/", AgentConversationListView.as_view(), name="agent-conversations"),
    path(
        "agent/conversations/<uuid:conversation_id>/",
        AgentConversationDetailView.as_view(),
        name="agent-conversation",
    ),
    path(
        "agent/actions/<uuid:action_id>/<str:decision>/",
        AgentActionDecisionView.as_view(),
        name="agent-action",
    ),
]
