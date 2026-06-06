from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from api.models import Note, ShareLink, SharedNote

MY_NOTE_SAMPLES = [
    ("Weekly standup notes", "Discussed sprint goals, blockers on auth flow, and design review for Thursday."),
    ("Book recommendations", "- *The Pragmatic Programmer*\n- *Thinking, Fast and Slow*\n- *Atomic Habits*"),
    ("Grocery list", "Milk, eggs, sourdough, avocados, coffee beans, olive oil, pasta, tomatoes."),
    ("Project ideas", "1. Habit tracker with offline sync\n2. Recipe scraper\n3. Local event aggregator"),
    ("Meeting: product roadmap", "Q3 focus: performance, sharing improvements, mobile-friendly editor."),
    ("Travel checklist", "Passport, charger, noise-cancelling headphones, sunscreen, backup cards."),
    ("Workout log", "Mon: 5k run\nWed: upper body\nFri: yoga + stretch\nSun: long walk"),
    ("Birthday gift ideas", "Wireless earbuds, cookbook, plant subscription, framed photo print."),
    ("Learning Rust", "Ownership, borrowing, lifetimes. Build a CLI tool next weekend."),
    ("Home maintenance", "Replace HVAC filter, clean gutters, test smoke detectors, seal window draft."),
]

SHARED_NOTE_SAMPLES = [
    ("Team onboarding doc", "Welcome! Here are repo links, coding standards, and who to ping for help."),
    ("Design system tokens", "Primary: red-600. Spacing scale: 4px base. Radius: rounded-2xl for cards."),
    ("API changelog v2", "Added password protection, share links, tag filters, and bulk export endpoints."),
    ("Sprint retro notes", "Went well: note sharing. Improve: test coverage on edge cases."),
    ("Q&A from all-hands", "Remote policy unchanged. New hire starting next month on backend."),
]

SHARER_USERNAME = "test_sharer"
SHARER_EMAIL = "sharer@example.com"
SHARER_PASSWORD = "testpassword123"


class Command(BaseCommand):
    help = "Seed 10 owned notes and 5 shared-with-me notes for a user."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            help="Recipient user (gets 10 my notes + 5 shared notes). Defaults to the first user.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete previously seeded test notes before creating new ones.",
        )

    def handle(self, *args, **options):
        username = options["username"]
        if username:
            try:
                recipient = User.objects.get(username=username)
            except User.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"User '{username}' not found."))
                return
        else:
            recipient = User.objects.order_by("id").first()
            if not recipient:
                recipient = User.objects.create_user(
                    username="testuser",
                    email="test@example.com",
                    password="testpassword123",
                )
                self.stdout.write(self.style.WARNING("No users found — created testuser / testpassword123"))

        sharer, created = User.objects.get_or_create(
            username=SHARER_USERNAME,
            defaults={"email": SHARER_EMAIL},
        )
        if created:
            sharer.set_password(SHARER_PASSWORD)
            sharer.save()
            self.stdout.write(self.style.WARNING(f"Created sharer user '{SHARER_USERNAME}'"))

        if options["reset"]:
            my_titles = [t for t, _ in MY_NOTE_SAMPLES]
            shared_titles = [t for t, _ in SHARED_NOTE_SAMPLES]
            deleted, _ = Note.objects.filter(owner=recipient, title__in=my_titles).delete()
            deleted2, _ = Note.objects.filter(owner=sharer, title__in=shared_titles).delete()
            self.stdout.write(f"Removed {deleted + deleted2} existing seeded note(s).")

        my_created = 0
        for title, content in MY_NOTE_SAMPLES:
            _, created = Note.objects.get_or_create(
                owner=recipient,
                title=title,
                defaults={"content": content},
            )
            if created:
                my_created += 1

        shared_created = 0
        for title, content in SHARED_NOTE_SAMPLES:
            note, created = Note.objects.get_or_create(
                owner=sharer,
                title=title,
                defaults={"content": content},
            )
            if created:
                shared_created += 1

            ShareLink.objects.update_or_create(note=note, defaults={"is_active": True})
            _, link_created = SharedNote.objects.get_or_create(note=note, user=recipient)

            if created or link_created:
                shared_created += 1 if created else 0

        self.stdout.write(
            self.style.SUCCESS(
                f"Done for '{recipient.username}': "
                f"{my_created} new my note(s) ({len(MY_NOTE_SAMPLES)} total), "
                f"{len(SHARED_NOTE_SAMPLES)} shared note(s) available."
            )
        )
