"""
api/models.py

Note model — UUID primary key, owned by a Django User, with auto-timestamps.
Tag model — for categorizing notes.
"""

import uuid
from django.db import models
from django.contrib.auth.models import User


class Tag(models.Model):
    """
    A simple tag for categorizing notes.
    Tags are owned by a specific user to prevent global tag pollution.
    """
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="tags",
        help_text="The user who owns this tag.",
    )
    name = models.CharField(max_length=50)
    color = models.CharField(
        max_length=255, 
        default="bg-gray-100 text-gray-800",
        help_text="Tailwind color classes for the tag badge."
    )
    
    class Meta:
        unique_together = ['owner', 'name']
        ordering = ['name']
        
    def __str__(self):
        return self.name


class Note(models.Model):
    """
    A single note belonging to exactly one user.

    Key design decisions
    ────────────────────
    • UUID pk  — hides sequential record counts from clients and prevents
                 trivial enumeration attacks on the REST endpoints.
    • owner FK — on_delete=CASCADE means all notes are deleted when the
                 owning user account is removed; no orphaned rows.
    • db_index  — added automatically by Django for ForeignKey columns so
                 filtering by owner is fast even at scale.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Universally unique identifier for this note.",
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notes",
        help_text="The user who owns this note.",
    )
    title = models.CharField(
        max_length=255,
        blank=False,
        help_text="Short descriptive title for the note (max 255 chars).",
    )
    content = models.TextField(
        blank=True,
        default="",
        help_text="Full body content of the note (can be HTML from rich text editor).",
    )
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name="notes",
        help_text="Tags categorizing this note.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="UTC timestamp of when the note was first created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="UTC timestamp of the most recent update.",
    )
    password_hash = models.CharField(
        max_length=128,
        blank=True,
        default="",
        help_text="Hashed password required to view protected note content.",
    )
    is_favourite = models.BooleanField(
        default=False,
        help_text="Whether this note is marked as a favourite by the owner.",
    )
    is_trashed = models.BooleanField(
        default=False,
        help_text="Whether this note is in the trash.",
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the note was moved to trash.",
    )

    class Meta:
        ordering = ["-updated_at"]          # newest edits float to the top
        verbose_name = "Note"
        verbose_name_plural = "Notes"

    def __str__(self) -> str:
        return f"[{self.owner.username}] {self.title}"

class ShareLink(models.Model):
    """A unique shareable link for a note. One link per note."""
    token = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note = models.OneToOneField(Note, on_delete=models.CASCADE, related_name='share_link')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class SharedNote(models.Model):
    """Tracks which users have accepted a share and can view the note."""
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='shared_with_users')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes_shared_with_me')
    shared_at = models.DateTimeField(auto_now_add=True)
    is_trashed = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['note', 'user']


class NoteLink(models.Model):
    """
    Tracks bidirectional [[wikilinks]] between notes.
    When a user types [[Note Title]] in a note's content, we parse it
    and create a NoteLink from the source note to the target note.
    """
    source = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name="outgoing_links",
        help_text="The note that contains the [[wikilink]].",
    )
    target = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name="incoming_links",
        help_text="The note being linked to.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['source', 'target']
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.source.title} → {self.target.title}"
