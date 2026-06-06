from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Note, Tag

class DataIsolationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.user1 = User.objects.create_user(username="user1", password="testpassword123")
        self.user2 = User.objects.create_user(username="user2", password="testpassword123")
        
        # Create user1 data
        self.tag1 = Tag.objects.create(owner=self.user1, name="Work")
        self.note1 = Note.objects.create(owner=self.user1, title="User1 Note", content="Content")
        self.note1.tags.add(self.tag1)
        
        # Create user2 data
        self.tag2 = Tag.objects.create(owner=self.user2, name="Personal")
        self.note2 = Note.objects.create(owner=self.user2, title="User2 Note", content="Content")
        self.note2.tags.add(self.tag2)

    def test_notes_list_isolation(self):
        """User1 should only see their own notes."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/notes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['id'], str(self.note1.id))

    def test_tags_list_isolation(self):
        """User1 should only see their own tags."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/tags/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['id'], self.tag1.id)

    def test_cannot_access_other_users_note(self):
        """User1 cannot GET user2's note directly."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/notes/{self.note2.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_use_other_users_tag(self):
        """User1 cannot assign user2's tag to a note."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/notes/', {
            "title": "Hacked Note",
            "content": "Using someone else's tag",
            "tag_ids": [self.tag2.id]
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('tag_ids', response.data)
