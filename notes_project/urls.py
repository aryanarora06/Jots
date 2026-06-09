"""
Root URL configuration for notes_project.

Endpoints
─────────
POST   /api/auth/register/          Create a new user account
POST   /api/auth/token/             Obtain JWT access + refresh tokens
POST   /api/auth/token/refresh/     Rotate refresh token → new access token
POST   /api/auth/token/blacklist/   Invalidate a refresh token (logout)

GET    /api/notes/                  List the authenticated user's notes (paginated)
POST   /api/notes/                  Create a note
GET    /api/notes/{id}/             Retrieve a single note
PUT    /api/notes/{id}/             Full update
PATCH  /api/notes/{id}/             Partial update
DELETE /api/notes/{id}/             Delete

GET    /admin/                      Django admin
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)
from api.views import (
    GoogleLoginView, NoteViewSet, TagViewSet,
    ShareNoteView, NotePasswordView, UnlockNoteView, AcceptShareView,
    SharedWithMeView, CopySharedNoteView, UnlockSharedNoteView, RemoveSharedNoteView,
    TrashListView, RestoreNoteView, RestoreSharedNoteView,
    PermanentDeleteNoteView, PermanentDeleteSharedNoteView, EmptyTrashView,
    GraphView, BacklinksView, NoteTitleSearchView, CurrentUserView,
    ImageUploadView, DuplicateNoteView
)

# ── DRF Router ──────────────────────────────────────────────────────────────
router = DefaultRouter()
router.register(r"notes", NoteViewSet, basename="note")
router.register(r"tags", TagViewSet, basename="tag")

from django.http import HttpResponse

def health_check(request):
    return HttpResponse("OK", status=200)

# ── URL Patterns ────────────────────────────────────────────────────────────
urlpatterns = [
    path("", health_check, name="root-health"),
    path("health/", health_check, name="health-check"),
    path("health", health_check, name="health-check-no-slash"),
    path("admin/", admin.site.urls),

    # ── Authentication ───────────────────────────────────────────────────────
    path("api/auth/google/",         GoogleLoginView.as_view(),     name="google-login"),
    path("api/auth/token/refresh/",  TokenRefreshView.as_view(),    name="token-refresh"),
    path("api/auth/token/blacklist/", TokenBlacklistView.as_view(), name="token-blacklist"),
    path("api/auth/me/",             CurrentUserView.as_view(),     name="current-user"),

    # ── Trash API ────────────────────────────────────────────────────────────
    path("api/notes/trash/", TrashListView.as_view(), name="trash-list"),
    path("api/notes/trash/empty/", EmptyTrashView.as_view(), name="empty-trash"),
    path("api/notes/trash/<uuid:note_id>/restore/", RestoreNoteView.as_view(), name="restore-note"),
    path("api/notes/trash/<uuid:note_id>/", PermanentDeleteNoteView.as_view(), name="permanent-delete-note"),
    path("api/notes/trash/shared/<int:shared_note_id>/restore/", RestoreSharedNoteView.as_view(), name="restore-shared-note"),
    path("api/notes/trash/shared/<int:shared_note_id>/", PermanentDeleteSharedNoteView.as_view(), name="permanent-delete-shared-note"),

    # ── Share API ────────────────────────────────────────────────────────────
    path("api/notes/<uuid:note_id>/share/", ShareNoteView.as_view(), name="share-note"),
    path("api/notes/<uuid:note_id>/password/", NotePasswordView.as_view(), name="note-password"),
    path("api/notes/<uuid:note_id>/unlock/", UnlockNoteView.as_view(), name="unlock-note"),
    path("api/notes/<uuid:note_id>/duplicate/", DuplicateNoteView.as_view(), name="duplicate-note"),
    path("api/share/<uuid:token>/", AcceptShareView.as_view(), name="accept-share"),
    path("api/notes/shared-with-me/", SharedWithMeView.as_view(), name="shared-with-me"),
    path("api/notes/shared-with-me/<uuid:note_id>/copy/", CopySharedNoteView.as_view(), name="copy-shared-note"),
    path("api/notes/shared-with-me/<uuid:note_id>/unlock/", UnlockSharedNoteView.as_view(), name="unlock-shared-note"),
    path("api/notes/shared-with-me/<uuid:note_id>/", RemoveSharedNoteView.as_view(), name="remove-shared-note"),

    # ── Knowledge Graph & Wikilinks ──────────────────────────────────────────
    path("api/notes/graph/", GraphView.as_view(), name="note-graph"),
    path("api/notes/titles/", NoteTitleSearchView.as_view(), name="note-title-search"),
    path("api/notes/<uuid:note_id>/backlinks/", BacklinksView.as_view(), name="note-backlinks"),

    # ── Notes API ────────────────────────────────────────────────────────────
    path("api/", include(router.urls)),
    path("api/upload-image/", ImageUploadView.as_view(), name="upload-image"),

    # ── Password Reset (dj-rest-auth) ─────────────────────────────────────────
    # Temporarily disabled due to routing conflicts with custom registration
    # path("api/auth/password/reset/", include("dj_rest_auth.urls", namespace="dj_rest_auth")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
