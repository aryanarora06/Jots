"""
api/serializers.py

Three serializers:
  • UserRegistrationSerializer — validates + creates a new User account
  • UserSerializer            — read-only representation of a User (used inside NoteSerializer)
  • NoteSerializer            — full CRUD for Note; owner is always read-only
"""

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Note, Tag, ShareLink, SharedNote
from .word_count import count_note_words


# ---------------------------------------------------------------------------
# User Serializers
# ---------------------------------------------------------------------------

class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Validates and creates a new user account.

    • password  — write-only, run through Django's full password validators
    • password2 — confirmation field, never stored
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
        validators=[validate_password],
        help_text="Must satisfy Django's password validation rules.",
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
        help_text="Repeat the password for confirmation.",
    )

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "password2")
        extra_kwargs = {
            "email": {"required": True},
        }

    # ── Cross-field Validation ───────────────────────────────────────────────

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "Password fields do not match."}
            )
        return attrs

    def validate_email(self, value: str) -> str:
        """Enforce unique emails so users can recover accounts by email."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with that email address already exists."
            )
        return value.lower()

    # ── Object Creation ──────────────────────────────────────────────────────

    def create(self, validated_data: dict) -> User:
        validated_data.pop("password2")
        # Use create_user so the password is properly hashed
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """
    Lightweight read-only representation embedded inside NoteSerializer.
    Never exposes the password hash.
    """

    class Meta:
        model = User
        fields = ("id", "username", "email")
        read_only_fields = ("id", "username", "email")


# ---------------------------------------------------------------------------
# Tag Serializer
# ---------------------------------------------------------------------------

class TagSerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Tag
        fields = ("id", "owner", "name", "color")
        read_only_fields = ("id",)
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=Tag.objects.all(),
                fields=["owner", "name"],
                message="You already have a tag with this name."
            )
        ]
        
    def validate_name(self, value):
        return value.strip()

    def to_representation(self, instance):
        # We still want to return the owner as a nested object when reading
        ret = super().to_representation(instance)
        ret['owner'] = UserSerializer(instance.owner).data
        return ret


# ---------------------------------------------------------------------------
# Note Serializer
# ---------------------------------------------------------------------------

class NoteSerializer(serializers.ModelSerializer):
    """
    Serializer for the Note model.

    Security guarantees
    ────────────────────
    • owner        — read-only; set programmatically in perform_create(),
                     never accepted from client input.
    • created_at   — read-only; set by the database, not editable.
    • updated_at   — read-only; set by the database on every save.

    The nested UserSerializer for `owner` means the API returns the full
    owner object on reads (useful for admin views) without ever accepting
    it as input.
    """

    owner = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Tag.objects.none(),  # overridden in __init__ to scope per-user
        source='tags', 
        write_only=True, 
        required=False
    )
    word_count = serializers.SerializerMethodField()
    is_password_protected = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = (
            "id",
            "owner",
            "title",
            "content",
            "tags",
            "tag_ids",
            "word_count",
            "is_password_protected",
            "is_favourite",
            "is_trashed",
            "deleted_at",
            "days_remaining",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "owner", "tags", "word_count", "is_password_protected", "is_trashed", "deleted_at", "days_remaining", "created_at", "updated_at")

    def get_word_count(self, obj: Note) -> int:
        if obj.password_hash and not self.context.get('include_protected_content'):
            return 0
        return count_note_words(obj.content)

    def get_is_password_protected(self, obj: Note) -> bool:
        return bool(obj.password_hash)

    def get_days_remaining(self, obj: Note):
        if obj.is_trashed and obj.deleted_at:
            from django.utils import timezone
            elapsed = (timezone.now() - obj.deleted_at).days
            return max(0, 30 - elapsed)
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.password_hash and not self.context.get('include_protected_content'):
            ret['content'] = ''
        return ret

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            self.fields['tag_ids'].child_relation.queryset = Tag.objects.filter(owner=request.user)

    # ── Field-level Validation ───────────────────────────────────────────────

    def validate_title(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title must not be blank.")
        return value

    def validate_tag_ids(self, tags):
        user = self.context['request'].user
        for tag in tags:
            if tag.owner != user:
                raise serializers.ValidationError(f"Tag '{tag.name}' does not belong to you.")
        return tags

# ---------------------------------------------------------------------------
# ShareLink and SharedNote Serializers
# ---------------------------------------------------------------------------

class ShareLinkSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ShareLink
        fields = ("token", "is_active", "created_at", "url")
        read_only_fields = ("token", "created_at", "url")

    def get_url(self, obj):
        return f"/shared/{obj.token}"

class SharedNoteSerializer(serializers.ModelSerializer):
    note = NoteSerializer(read_only=True)
    owner_username = serializers.CharField(source='note.owner.username', read_only=True)

    class Meta:
        model = SharedNote
        fields = ("id", "note", "shared_at", "owner_username")
        read_only_fields = ("id", "note", "shared_at", "owner_username")

class AcceptShareSerializer(serializers.Serializer):
    token = serializers.UUIDField()

class TrashItemSerializer(serializers.Serializer):
    """Unified serializer for items in the trash (both owned and shared notes)."""
    source = serializers.CharField()  # 'owned' or 'shared'
    note = NoteSerializer()
    owner_username = serializers.CharField(allow_null=True)
    deleted_at = serializers.DateTimeField()
    days_remaining = serializers.IntegerField()
    trash_id = serializers.CharField()  # note.id for owned, shared_note.id for shared
