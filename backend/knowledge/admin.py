from django.contrib import admin

from .models import KnowledgeChunk, KnowledgeDocument


@admin.register(KnowledgeDocument)
class KnowledgeDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "source_type", "status", "updated_at")
    list_filter = ("organization", "source_type", "status")
    search_fields = ("title", "content", "source_url")
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ("organization", "created_by")
    readonly_fields = ("checksum", "created_at", "updated_at")


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = ("document", "position", "embedding_model", "organization")
    search_fields = ("content", "document__title")
    readonly_fields = ("embedding", "created_at", "updated_at")
