import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'notes_project.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Note, SharedNote

def seed():
    aryan, _ = User.objects.get_or_create(username='aryanarora')
    aryan.set_password('password123')
    aryan.save()
    
    other, _ = User.objects.get_or_create(username='otheruser')
    other.set_password('password123')
    other.save()
    
    for i in range(1, 31):
        Note.objects.create(
            owner=aryan,
            title=f"My Note {i}",
            content=f"This is the content for my note {i}.",
            is_favourite=(i % 5 == 0)
        )
        
    for i in range(1, 16):
        note = Note.objects.create(
            owner=other,
            title=f"Shared Note {i}",
            content=f"This is the content for shared note {i}.",
        )
        SharedNote.objects.create(
            note=note,
            user=aryan
        )
        
if __name__ == '__main__':
    seed()
    print("Seeded successfully.")
