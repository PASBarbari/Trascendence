from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from chat.asgi import application
from asgiref.sync import sync_to_async

# ...existing code...
from django.test import TestCase, Client

class MyChatURLTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_get_chat_message(self):
        response = self.client.get('/chat_rooms/1/get_message/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_get_chat_info(self):
        response = self.client.get('/chat_rooms/1/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_new_user(self):
        response = self.client.get('/new_user/')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_create_chat(self):
        response = self.client.get('/chat_rooms/create/')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_get_chats(self):
        response = self.client.get('/chat_rooms/getchat/')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_download_chat_data(self):
        response = self.client.get('/chat_data/')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_download_similarities_data(self):
        response = self.client.get('/user_similarities/')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_add_users_to_chat(self):
        response = self.client.get('/chat_rooms/1/add_user/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_block_user(self):
        response = self.client.get('/block_user/1')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_all_blocked_users(self):
        response = self.client.get('/blocked_users/')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_chat_media_upload(self):
        response = self.client.get('/media/upload/')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_chat_media_manager(self):
        response = self.client.get('/media/manage/')
        self.assertIn(response.status_code, [200, 401, 403])