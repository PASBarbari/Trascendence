from django.test import TestCase, Client

class UserAppURLTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_avatar_endpoint(self):
        response = self.client.get('/user/avatar')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_user_endpoint(self):
        response = self.client.get('/user/user')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_me_endpoint(self):
        response = self.client.get('/user/me')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_friend_endpoint(self):
        response = self.client.get('/user/friend')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_addfriend_endpoint(self):
        response = self.client.get('/user/addfriend')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_levelup_endpoint(self):
        response = self.client.get('/user/levelup')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_block_endpoint(self):
        response = self.client.get('/user/block')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_update_2fa_status_endpoint(self):
        response = self.client.get('/user/user/update-2fa/')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_search_user_endpoint(self):
        response = self.client.get('/user/search')
        self.assertIn(response.status_code, [200, 401, 403])
