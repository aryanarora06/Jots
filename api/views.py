"""
api/views.py

Two views:
  RegisterView  — AllowAny; creates a new user account
  NoteViewSet   — IsAuthenticated; strict per-user data isolation
"""

from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from rest_framework import generics, viewsets, filters, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from .models import Note, Tag, ShareLink, SharedNote
from .word_count import count_note_words
from .serializers import (
    UserRegistrationSerializer, NoteSerializer, TagSerializer,
    ShareLinkSerializer, SharedNoteSerializer, AcceptShareSerializer,
)


# ---------------------------------------------------------------------------
# Authentication Views
# ---------------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/

    Public endpoint — no authentication required.
    Returns 201 with {id, username, email} on success.
    Returns 400 with validation errors on failure.
    """

    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "message": "Account created successfully. Please obtain a token via /api/auth/token/.",
            },
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Tags ViewSet
# ---------------------------------------------------------------------------

class TagViewSet(viewsets.ModelViewSet):
    """
    CRUD for Tags. Isolated to the authenticated user.
    """
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tag.objects.filter(owner=self.request.user)


# ---------------------------------------------------------------------------
# Notes ViewSet
# ---------------------------------------------------------------------------

class NoteViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for Note objects.

    DATA ISOLATION CONTRACT
    ────────────────────────
    1. permission_classes = [IsAuthenticated]
       → Unauthenticated requests receive 401 before any queryset is touched.

    2. get_queryset()
       → Returns ONLY notes whose owner == request.user.
       → An authenticated user requesting /api/notes/<other_user_note_id>/
         will receive 404 (not found), not 403 (forbidden) — this avoids
         leaking the existence of other users' notes.

    3. perform_create()
       → Injects owner=request.user at the database layer.
       → The client CANNOT supply an owner field; the serializer marks it
         read-only, so any owner value in the request body is silently ignored.

    Filtering & Search
    ───────────────────
    • ?search=term     — searches title and content (case-insensitive)
    • ?ordering=field  — order by title, created_at, updated_at (prefix with
                         '-' to reverse, e.g. ?ordering=-created_at)
    """

    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    # Enable ordering via query params (search is handled custom in get_queryset)
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["title", "created_at", "updated_at"]
    ordering = ["-updated_at"]   # default ordering matches the model Meta

    # ── Core Isolation Logic ─────────────────────────────────────────────────

    def get_queryset(self):
        """
        CRITICAL: never returns notes belonging to another user.
        Using request.user (set by JWTAuthentication) ensures the filter
        cannot be tampered with via query parameters or request body.
        """
        from django.db.models import Q
        queryset = Note.objects.filter(owner=self.request.user, is_trashed=False).select_related("owner").prefetch_related("tags")
        
        tag_ids = self.request.query_params.getlist('tag')
        if tag_ids:
            for tag_id in tag_ids:
                queryset = queryset.filter(tags__id=tag_id)
            
        search = self.request.query_params.get('search')
        if search:
            from thefuzz import fuzz
            matched_ids = []
            search_str = search.lower()
            for note in queryset:
                t_score = fuzz.partial_ratio(search_str, note.title.lower() if note.title else "")
                c_score = fuzz.partial_ratio(search_str, note.content.lower() if note.content else "")
                
                # Also fallback to token_set_ratio just in case words are out of order
                t_score2 = fuzz.token_set_ratio(search_str, note.title.lower() if note.title else "")
                c_score2 = fuzz.token_set_ratio(search_str, note.content.lower() if note.content else "")
                
                if max(t_score, c_score, t_score2, c_score2) > 65:
                    matched_ids.append(note.id)
            queryset = queryset.filter(id__in=matched_ids)
            
        return queryset.distinct()

    def perform_create(self, serializer):
        """
        Automatically assign the authenticated user as owner.
        The client has no mechanism to override this.
        """
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        """Soft-delete: move to trash instead of permanent deletion."""
        instance.is_trashed = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['is_trashed', 'deleted_at'])
        # Deactivate any active share link
        try:
            share_link = instance.share_link
            if share_link.is_active:
                share_link.is_active = False
                share_link.save(update_fields=['is_active'])
        except ShareLink.DoesNotExist:
            pass

# ---------------------------------------------------------------------------
# Share Views
# ---------------------------------------------------------------------------

class ShareNoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user)
        share_link, created = ShareLink.objects.get_or_create(note=note)
        if not share_link.is_active:
            share_link.is_active = True
            share_link.save()
        serializer = ShareLinkSerializer(share_link, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    def delete(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user)
        try:
            share_link = note.share_link
            share_link.is_active = False
            share_link.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ShareLink.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

class NotePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user)
        password = request.data.get('password', '')
        if not password or len(password) < 4:
            return Response({"detail": "Password must be at least 4 characters."}, status=status.HTTP_400_BAD_REQUEST)

        note.password_hash = make_password(password)
        note.save(update_fields=['password_hash', 'updated_at'])
        serializer = NoteSerializer(note, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user)
        if not note.password_hash:
            return Response({"detail": "This note is not password protected."}, status=status.HTTP_400_BAD_REQUEST)

        password = request.data.get('password', '')
        if not password or not check_password(password, note.password_hash):
            return Response({"detail": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)

        note.password_hash = ''
        note.save(update_fields=['password_hash', 'updated_at'])
        serializer = NoteSerializer(note, context={'request': request, 'include_protected_content': True})
        return Response(serializer.data, status=status.HTTP_200_OK)

class UnlockNoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user)
        password = request.data.get('password', '')
        if not note.password_hash:
            serializer = NoteSerializer(note, context={'request': request, 'include_protected_content': True})
            return Response(serializer.data, status=status.HTTP_200_OK)
        if not password or not check_password(password, note.password_hash):
            return Response({"detail": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = NoteSerializer(note, context={'request': request, 'include_protected_content': True})
        return Response(serializer.data, status=status.HTTP_200_OK)

class AcceptShareView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, token):
        share_link = get_object_or_404(ShareLink, token=token, is_active=True)
        note = share_link.note
        is_password_protected = bool(note.password_hash)
        return Response({
            "title": note.title,
            "owner": note.owner.username,
            "preview": "Password protected note" if is_password_protected else note.content[:100] + "..." if len(note.content) > 100 else note.content,
            "word_count": 0 if is_password_protected else count_note_words(note.content),
            "is_password_protected": is_password_protected,
        })

    def post(self, request, token):
        share_link = get_object_or_404(ShareLink, token=token, is_active=True)
        note = share_link.note
        if note.owner == request.user:
            return Response({"detail": "You own this note."}, status=status.HTTP_400_BAD_REQUEST)
        
        shared_note, created = SharedNote.objects.get_or_create(note=note, user=request.user)
        if not created:
            return Response({"detail": "Note already shared with you."}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({"detail": "Note added to your shared notes."}, status=status.HTTP_201_CREATED)

class SharedWithMeView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SharedNoteSerializer

    def get_queryset(self):
        from django.db.models import Q

        queryset = SharedNote.objects.filter(
            user=self.request.user,
            note__share_link__is_active=True,
            is_trashed=False,
        ).select_related('note', 'note__owner')

        search = self.request.query_params.get('search')
        if search:
            from thefuzz import fuzz
            matched_ids = []
            search_str = search.lower()
            for shared_note in queryset:
                note = shared_note.note
                t_score = fuzz.partial_ratio(search_str, note.title.lower() if note.title else "")
                c_score = 0
                t_score2 = fuzz.token_set_ratio(search_str, note.title.lower() if note.title else "")
                c_score2 = 0
                
                if not note.password_hash:
                    c_score = fuzz.partial_ratio(search_str, note.content.lower() if note.content else "")
                    c_score2 = fuzz.token_set_ratio(search_str, note.content.lower() if note.content else "")
                
                if max(t_score, c_score, t_score2, c_score2) > 65:
                    matched_ids.append(shared_note.id)
            queryset = queryset.filter(id__in=matched_ids)

        return queryset.distinct()

class CopySharedNoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        shared_note = get_object_or_404(
            SharedNote.objects.select_related('note').prefetch_related('note__tags'),
            note_id=note_id,
            user=request.user,
            note__share_link__is_active=True,
        )
        source_note = shared_note.note
        if source_note.password_hash:
            return Response(
                {"detail": "Password protected notes cannot be copied."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        copied_note = Note.objects.create(
            owner=request.user,
            title=source_note.title,
            content=source_note.content,
        )

        copied_tags = []
        for source_tag in source_note.tags.all():
            tag, _ = Tag.objects.get_or_create(
                owner=request.user,
                name=source_tag.name,
                defaults={'color': source_tag.color},
            )
            copied_tags.append(tag)

        copied_note.tags.set(copied_tags)
        serializer = NoteSerializer(copied_note, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class UnlockSharedNoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        shared_note = get_object_or_404(
            SharedNote.objects.select_related('note', 'note__owner').prefetch_related('note__tags'),
            note_id=note_id,
            user=request.user,
            note__share_link__is_active=True,
        )
        note = shared_note.note
        password = request.data.get('password', '')
        if not note.password_hash:
            serializer = NoteSerializer(note, context={'request': request, 'include_protected_content': True})
            return Response(serializer.data, status=status.HTTP_200_OK)
        if not password or not check_password(password, note.password_hash):
            return Response({"detail": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = NoteSerializer(note, context={'request': request, 'include_protected_content': True})
        return Response(serializer.data, status=status.HTTP_200_OK)

class RemoveSharedNoteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, note_id):
        shared_note = get_object_or_404(SharedNote, note_id=note_id, user=request.user)
        shared_note.is_trashed = True
        shared_note.deleted_at = timezone.now()
        shared_note.save(update_fields=['is_trashed', 'deleted_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Trash Views
# ---------------------------------------------------------------------------

class TrashListView(APIView):
    """GET /api/notes/trash/ — combined list of trashed owned + shared notes."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import timedelta
        # Opportunistic purge: permanently delete notes trashed > 30 days ago
        cutoff = timezone.now() - timedelta(days=30)
        Note.objects.filter(owner=request.user, is_trashed=True, deleted_at__lt=cutoff).delete()
        SharedNote.objects.filter(user=request.user, is_trashed=True, deleted_at__lt=cutoff).delete()

        items = []

        # Owned trashed notes
        owned_trashed = Note.objects.filter(
            owner=request.user, is_trashed=True
        ).select_related('owner').prefetch_related('tags').order_by('-deleted_at')
        for note in owned_trashed:
            elapsed = (timezone.now() - note.deleted_at).days if note.deleted_at else 0
            items.append({
                'source': 'owned',
                'note': NoteSerializer(note, context={'request': request}).data,
                'owner_username': None,
                'deleted_at': note.deleted_at,
                'days_remaining': max(0, 30 - elapsed),
                'trash_id': str(note.id),
            })

        # Shared trashed notes
        shared_trashed = SharedNote.objects.filter(
            user=request.user, is_trashed=True
        ).select_related('note', 'note__owner').prefetch_related('note__tags').order_by('-deleted_at')
        for sn in shared_trashed:
            elapsed = (timezone.now() - sn.deleted_at).days if sn.deleted_at else 0
            items.append({
                'source': 'shared',
                'note': NoteSerializer(sn.note, context={'request': request}).data,
                'owner_username': sn.note.owner.username,
                'deleted_at': sn.deleted_at,
                'days_remaining': max(0, 30 - elapsed),
                'trash_id': str(sn.id),
            })

        # Sort all items by deleted_at descending
        items.sort(key=lambda x: x['deleted_at'] or timezone.now(), reverse=True)
        return Response(items)


class RestoreNoteView(APIView):
    """POST /api/notes/trash/<note_id>/restore/ — restore an owned note from trash."""
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user, is_trashed=True)
        note.is_trashed = False
        note.deleted_at = None
        note.save(update_fields=['is_trashed', 'deleted_at'])
        serializer = NoteSerializer(note, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class RestoreSharedNoteView(APIView):
    """POST /api/notes/trash/shared/<shared_note_id>/restore/ — restore a shared note from trash."""
    permission_classes = [IsAuthenticated]

    def post(self, request, shared_note_id):
        shared_note = get_object_or_404(SharedNote, id=shared_note_id, user=request.user, is_trashed=True)
        shared_note.is_trashed = False
        shared_note.deleted_at = None
        shared_note.save(update_fields=['is_trashed', 'deleted_at'])
        return Response({'detail': 'Shared note restored.'}, status=status.HTTP_200_OK)


class PermanentDeleteNoteView(APIView):
    """DELETE /api/notes/trash/<note_id>/ — permanently delete an owned note."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user, is_trashed=True)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PermanentDeleteSharedNoteView(APIView):
    """DELETE /api/notes/trash/shared/<shared_note_id>/ — permanently delete a shared note from trash."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, shared_note_id):
        shared_note = get_object_or_404(SharedNote, id=shared_note_id, user=request.user, is_trashed=True)
        shared_note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmptyTrashView(APIView):
    """DELETE /api/notes/trash/empty/ — permanently delete all trashed notes."""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        owned_count, _ = Note.objects.filter(owner=request.user, is_trashed=True).delete()
        shared_count, _ = SharedNote.objects.filter(user=request.user, is_trashed=True).delete()
        return Response(
            {'detail': f'Permanently deleted {owned_count} owned and {shared_count} shared notes.'},
            status=status.HTTP_200_OK
        )
