from django.contrib import admin

from .models import Comment, Tag, Ticket, TicketTag


class TicketTagInline(admin.TabularInline):
    model = TicketTag
    extra = 0
    autocomplete_fields = ("tag", "added_by")


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ("author", "body", "is_internal", "created_at")
    readonly_fields = ("created_at",)
    autocomplete_fields = ("author",)


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "customer",
        "status",
        "priority",
        "assignee",
        "organization",
        "created_at",
    )
    list_filter = ("organization", "status", "priority", "source")
    search_fields = ("title", "description", "customer__name", "customer__email")
    autocomplete_fields = ("organization", "customer", "created_by", "assignee")
    readonly_fields = ("version", "created_at", "updated_at")
    inlines = (TicketTagInline, CommentInline)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "color", "organization")
    list_filter = ("organization",)
    search_fields = ("name",)
    autocomplete_fields = ("organization",)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("ticket", "author", "is_internal", "created_at")
    list_filter = ("is_internal", "ticket__organization")
    search_fields = ("body", "ticket__title", "author__email")
    autocomplete_fields = ("ticket", "author", "parent")
