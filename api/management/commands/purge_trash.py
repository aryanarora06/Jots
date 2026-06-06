from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import Note, SharedNote


class Command(BaseCommand):
    help = 'Permanently delete notes that have been in the trash for more than 30 days.'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=30)
        
        owned_count, _ = Note.objects.filter(is_trashed=True, deleted_at__lt=cutoff).delete()
        shared_count, _ = SharedNote.objects.filter(is_trashed=True, deleted_at__lt=cutoff).delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Purged {owned_count} owned notes and {shared_count} shared notes from trash.'
            )
        )
