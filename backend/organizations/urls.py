from django.urls import path

from .views import OrganizationListView, WorkspaceMemberListView, WorkspaceSettingsView

urlpatterns = [
    path("organizations/", OrganizationListView.as_view(), name="organization-list"),
    path("workspace/settings/", WorkspaceSettingsView.as_view(), name="workspace-settings"),
    path("members/", WorkspaceMemberListView.as_view(), name="workspace-members"),
]
