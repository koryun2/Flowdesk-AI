from django.urls import path

from .views import (
    OrganizationListView,
    WorkspaceMemberListView,
    WorkspaceSettingsView,
    WorkspaceJobsView,
    WorkspaceUsageView,
)

urlpatterns = [
    path("organizations/", OrganizationListView.as_view(), name="organization-list"),
    path("workspace/settings/", WorkspaceSettingsView.as_view(), name="workspace-settings"),
    path("workspace/usage/", WorkspaceUsageView.as_view(), name="workspace-usage"),
    path("workspace/jobs/", WorkspaceJobsView.as_view(), name="workspace-jobs"),
    path("members/", WorkspaceMemberListView.as_view(), name="workspace-members"),
]
