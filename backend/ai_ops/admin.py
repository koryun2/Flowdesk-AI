from django.contrib import admin

from .models import AgentAction, AgentConversation, AgentMessage, AIAnalysis


@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    list_display = (
        "ticket",
        "category",
        "priority",
        "sentiment",
        "status",
        "model_name",
        "created_at",
    )
    list_filter = ("organization", "status", "category", "priority", "sentiment")
    search_fields = ("ticket__title", "summary", "model_name")
    autocomplete_fields = ("organization", "ticket")
    readonly_fields = ("created_at", "updated_at", "started_at", "finished_at")


class AgentMessageInline(admin.TabularInline):
    model = AgentMessage
    extra = 0
    readonly_fields = ("role", "content", "tool_calls", "created_at")
    can_delete = False


@admin.register(AgentConversation)
class AgentConversationAdmin(admin.ModelAdmin):
    list_display = ("title", "actor", "organization", "updated_at")
    list_filter = ("organization",)
    search_fields = ("title", "actor__email")
    readonly_fields = ("created_at", "updated_at")
    inlines = [AgentMessageInline]


@admin.register(AgentAction)
class AgentActionAdmin(admin.ModelAdmin):
    list_display = ("tool_name", "status", "actor", "organization", "created_at")
    list_filter = ("organization", "status", "tool_name")
    readonly_fields = ("arguments", "result", "created_at", "updated_at", "finished_at")
