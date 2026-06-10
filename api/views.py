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
from rest_framework.throttling import UserRateThrottle

from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from .models import Note, Tag, ShareLink, SharedNote, NoteLink
from .word_count import count_note_words
from .wikilinks import sync_note_links
from .serializers import (
    UserRegistrationSerializer, NoteSerializer, TagSerializer,
    ShareLinkSerializer, SharedNoteSerializer, AcceptShareSerializer,
)

class PasswordUnlockThrottle(UserRateThrottle):
    rate = '10/min'
# ---------------------------------------------------------------------------

from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken

class UserRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

class GoogleLoginView(APIView):
    """
    POST /api/auth/google/

    Accepts a Google ID token ("credential"), verifies it,
    finds or creates a User by email, and returns JWT tokens.
    """
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        credential = request.data.get("credential")
        if not credential:
            return Response({"error": "No credential provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                credential, 
                google_requests.Request(), 
                settings.GOOGLE_OAUTH2_CLIENT_ID
            )
            
            email = idinfo.get("email")
            if not email:
                return Response({"error": "Google token missing email"}, status=status.HTTP_400_BAD_REQUEST)

            first_name = idinfo.get("given_name", "")
            last_name = idinfo.get("family_name", "")
            
            # Find user by email to prevent duplicate accounts
            user = User.objects.filter(email=email).first()
            created = False
            
            if not user:
                # If username taken by someone without this email, append a random string
                base_username = email
                if User.objects.filter(username=base_username).exists():
                    import uuid
                    base_username = f"{email}_{uuid.uuid4().hex[:6]}"
                    
                user = User.objects.create(
                    username=base_username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name
                )
                created = True
            
            # Generate SimpleJWT tokens
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "is_new_user": created
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            # Invalid token
            return Response({"error": f"Invalid token: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": f"Server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        from django.db.models import Q, Count
        queryset = Note.objects.filter(owner=self.request.user, is_trashed=False).select_related("owner").prefetch_related("tags").annotate(
            annotated_backlinks_count=Count('incoming_links', distinct=True),
            annotated_outgoing_links_count=Count('outgoing_links', distinct=True)
        )
        
        tag_ids = self.request.query_params.getlist('tag')
        if tag_ids:
            for tag_id in tag_ids:
                queryset = queryset.filter(tags__id=tag_id)
            
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(content__icontains=search, password_hash='')
            )
            
        return queryset.distinct()

    def perform_create(self, serializer):
        """
        Automatically assign the authenticated user as owner.
        The client has no mechanism to override this.
        After saving, sync any [[wikilinks]] in the content.
        """
        note = serializer.save(owner=self.request.user)
        sync_note_links(note)

    def perform_update(self, serializer):
        """
        After updating a note, re-sync [[wikilinks]].
        If title changed, update incoming links.
        """
        old_title = self.get_object().title
        note = serializer.save()
        sync_note_links(note)

        if old_title and note.title and old_title != note.title:
            import re
            incoming_links = note.incoming_links.select_related('source')
            pattern = re.compile(r'(\[\[)(' + re.escape(old_title) + r')(\]\])', re.IGNORECASE)
            
            for link in incoming_links:
                source_note = link.source
                if source_note.content:
                    new_content = pattern.sub(r'\g<1>' + note.title + r'\g<3>', source_note.content)
                    if new_content != source_note.content:
                        source_note.content = new_content
                        source_note.save(update_fields=['content', 'updated_at'])

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

class DuplicateNoteView(APIView):
    """
    Server-side duplication of a note.
    This safely copies the password_hash and is_password_protected fields
    without needing the plaintext password from the frontend.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user, is_trashed=False)
        
        from datetime import timedelta
        # Create a new note mimicking the old one
        new_note = Note.objects.create(
            owner=request.user,
            title=f"{note.title} (copy)",
            content=note.content,
            password_hash=note.password_hash
        )
        
        # Copy tags over
        new_note.tags.set(note.tags.all())
        
        # Sync wikilinks
        sync_note_links(new_note)
        
        # Return serialized note
        serializer = NoteSerializer(new_note, context={'request': request, 'include_protected_content': True})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# ---------------------------------------------------------------------------
# Share Views
# ---------------------------------------------------------------------------

class ShareNoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user, is_trashed=False)
        share_link, created = ShareLink.objects.get_or_create(note=note)
        if not share_link.is_active:
            share_link.is_active = True
            share_link.save()
        serializer = ShareLinkSerializer(share_link, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    def delete(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user, is_trashed=False)
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
        note = get_object_or_404(Note, id=note_id, owner=request.user, is_trashed=False)
        password = request.data.get('password', '')
        password = str(password) if password is not None else ''
        if not password or len(password) < 4:
            return Response({"detail": "Password must be at least 4 characters."}, status=status.HTTP_400_BAD_REQUEST)

        note.password_hash = make_password(password)
        note.save(update_fields=['password_hash', 'updated_at'])
        serializer = NoteSerializer(note, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user, is_trashed=False)
        if not note.password_hash:
            return Response({"detail": "This note is not password protected."}, status=status.HTTP_400_BAD_REQUEST)

        password = request.data.get('password', '')
        password = str(password) if password is not None else ''
        if not password or not check_password(password, note.password_hash):
            return Response({"detail": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)

        note.password_hash = ''
        note.save(update_fields=['password_hash', 'updated_at'])
        serializer = NoteSerializer(note, context={'request': request, 'include_protected_content': True})
        return Response(serializer.data, status=status.HTTP_200_OK)

class UnlockNoteView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PasswordUnlockThrottle]

    def post(self, request, note_id):
        note = get_object_or_404(Note, id=note_id, owner=request.user, is_trashed=False)
        password = request.data.get('password', '')
        password = str(password) if password is not None else ''
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
        from django.db.models import Q, Prefetch, Count

        annotated_notes = Note.objects.annotate(
            annotated_backlinks_count=Count('incoming_links', distinct=True),
            annotated_outgoing_links_count=Count('outgoing_links', distinct=True)
        )

        queryset = SharedNote.objects.filter(
            user=self.request.user,
            note__share_link__is_active=True,
            is_trashed=False,
        ).select_related('note', 'note__owner').prefetch_related(Prefetch('note', queryset=annotated_notes))

        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(note__title__icontains=search) | 
                Q(note__content__icontains=search, note__password_hash='')
            )

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
        sync_note_links(copied_note)
        serializer = NoteSerializer(copied_note, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class UnlockSharedNoteView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PasswordUnlockThrottle]

    def post(self, request, note_id):
        shared_note = get_object_or_404(
            SharedNote.objects.select_related('note', 'note__owner').prefetch_related('note__tags'),
            note_id=note_id,
            user=request.user,
            note__share_link__is_active=True,
        )
        note = shared_note.note
        password = request.data.get('password', '')
        password = str(password) if password is not None else ''
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
        items = []

        from django.db.models import Prefetch, Count
        # Owned trashed notes
        owned_trashed = Note.objects.filter(
            owner=request.user, is_trashed=True
        ).select_related('owner').prefetch_related('tags').annotate(
            annotated_backlinks_count=Count('incoming_links', distinct=True),
            annotated_outgoing_links_count=Count('outgoing_links', distinct=True)
        ).order_by('-deleted_at')
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

        annotated_notes = Note.objects.annotate(
            annotated_backlinks_count=Count('incoming_links', distinct=True),
            annotated_outgoing_links_count=Count('outgoing_links', distinct=True)
        )

        # Shared trashed notes
        shared_trashed = SharedNote.objects.filter(
            user=request.user, is_trashed=True
        ).select_related('note', 'note__owner').prefetch_related(
            'note__tags',
            Prefetch('note', queryset=annotated_notes)
        ).order_by('-deleted_at')
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
        """Hard-delete ALL items in the trash."""
        owned = Note.objects.filter(owner=request.user, is_trashed=True)
        shared = SharedNote.objects.filter(user=request.user, is_trashed=True)
        count = owned.count() + shared.count()
        owned.delete()
        shared.delete()
        return Response({"message": f"{count} item(s) permanently deleted."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Graph View — Interactive knowledge graph
# ---------------------------------------------------------------------------

class GraphView(APIView):
    """
    GET /api/notes/graph/

    Returns all user's notes as nodes and their [[wikilinks]] as edges
    for rendering an interactive knowledge graph.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Count
        notes = Note.objects.filter(
            owner=request.user,
            is_trashed=False,
        ).prefetch_related('tags').only('id', 'title', 'is_favourite', 'updated_at').annotate(
            annotated_backlinks_count=Count('incoming_links', distinct=True),
            annotated_outgoing_links_count=Count('outgoing_links', distinct=True)
        )

        # Build nodes
        nodes = []
        for note in notes:
            nodes.append({
                'id': str(note.id),
                'title': note.title,
                'is_favourite': note.is_favourite,
                'incoming_count': note.annotated_backlinks_count,
                'outgoing_count': note.annotated_outgoing_links_count,
                'tags': [tag.id for tag in note.tags.all()],
            })

        # Build edges from NoteLinks
        links = NoteLink.objects.filter(
            source__owner=request.user,
            source__is_trashed=False,
            target__is_trashed=False,
        ).values_list('source_id', 'target_id')

        edges = [
            {'source': str(src), 'target': str(tgt)}
            for src, tgt in links
        ]

        return Response({'nodes': nodes, 'edges': edges})


# ---------------------------------------------------------------------------
# Backlinks View — Notes that link TO a specific note
# ---------------------------------------------------------------------------

class BacklinksView(APIView):
    """
    GET /api/notes/<note_id>/backlinks/

    Returns a list of notes that contain [[wikilinks]] pointing to this note.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, note_id):
        note = get_object_or_404(
            Note, pk=note_id, owner=request.user, is_trashed=False
        )
        backlink_notes = Note.objects.filter(
            outgoing_links__target=note,
            owner=request.user,
            is_trashed=False,
        ).distinct().only('id', 'title', 'content', 'updated_at', 'password_hash')

        results = []
        for bl in backlink_notes:
            if bl.password_hash:
                preview = "This note is password protected."
            else:
                preview = bl.content[:150] + ('...' if len(bl.content) > 150 else '')
                
            results.append({
                'id': str(bl.id),
                'title': bl.title,
                'preview': preview,
                'updated_at': bl.updated_at.isoformat(),
            })

        return Response(results)


# ---------------------------------------------------------------------------
# Note Title Search — Autocomplete for [[wikilinks]]
# ---------------------------------------------------------------------------

class NoteTitleSearchView(APIView):
    """
    GET /api/notes/titles/?q=search_term

    Returns a list of note titles matching the query for wikilink autocomplete.
    Limited to 10 results for performance.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            # Return all note titles (limited)
            notes = Note.objects.filter(
                owner=request.user,
                is_trashed=False,
            ).order_by('title').values_list('id', 'title')[:15]
        else:
            notes = Note.objects.filter(
                owner=request.user,
                is_trashed=False,
                title__icontains=query
            ).order_by('title').values_list('id', 'title')[:10]

        return Response([
            {'id': str(nid), 'title': title}
            for nid, title in notes
        ])

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email
        })

import uuid
import os
from django.core.files.storage import FileSystemStorage
from rest_framework.parsers import MultiPartParser, FormParser

class ImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('image')
        if not file_obj:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        if file_obj.size > 5 * 1024 * 1024:  # 5MB limit
            return Response({'error': 'Image file too large (max 5MB)'}, status=status.HTTP_400_BAD_REQUEST)
            
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
            return Response({'error': 'Unsupported file type'}, status=status.HTTP_400_BAD_REQUEST)
            
        fs = FileSystemStorage()
        filename = f"{uuid.uuid4().hex}{ext}"
        saved_name = fs.save(filename, file_obj)
        file_url = fs.url(saved_name)
        
        return Response({'url': request.build_absolute_uri(file_url)}, status=status.HTTP_201_CREATED)
