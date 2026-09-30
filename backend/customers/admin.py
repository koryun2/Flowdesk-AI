from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "company", "organization", "created_at")
    list_filter = ("organization", "company")
    search_fields = ("name", "email", "company", "external_id")
    autocomplete_fields = ("organization",)
    readonly_fields = ("created_at", "updated_at")
