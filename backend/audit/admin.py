from django.contrib import admin

from .models import ActivityLog, Notification


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = (
        "action",
        "entity_type",
        "entity_id",
        "actor",
        "organization",
        "created_at",
    )
    list_filter = ("organization", "entity_type", "action")
    search_fields = ("action", "entity_id", "actor__email")
    readonly_fields = (
        "id",
        "organization",
        "actor",
        "action",
        "entity_type",
        "entity_id",
        "changes",
        "context",
        "request_id",
        "ip_address",
        "user_agent",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "organization", "tone", "read_at", "created_at")
    list_filter = ("organization", "tone")
    search_fields = ("title", "detail", "recipient__email")
    readonly_fields = (
        "id",
        "organization",
        "recipient",
        "title",
        "detail",
        "tone",
        "link",
        "read_at",
        "created_at",
    )
