from django.contrib import admin
from .models import Note, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    """Admin interface for Tags."""
    list_display = ("name", "owner", "color")
    list_filter = ("owner",)
    search_fields = ("name", "owner__username")


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    """Admin interface for Notes — useful for debugging and support."""

    list_display = ("title", "owner", "created_at", "updated_at")
    list_filter = ("owner", "created_at")
    search_fields = ("title", "content", "owner__username")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-updated_at",)
