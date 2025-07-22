
from django.test import TestCase, Client

class MyLoginURLTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_register(self):
        response = self.client.get('/login/register')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_login(self):
        response = self.client.get('/login/login')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_logout(self):
        response = self.client.get('/login/logout')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_user(self):
        response = self.client.get('/login/user')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_get_csrf_token(self):
        response = self.client.get('/login/get_csrf_token')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_serviceregister(self):
        response = self.client.get('/login/Serviceregister')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_oauth_login(self):
        response = self.client.get('/login/oauth/testprovider/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_oauth_callback(self):
        response = self.client.get('/login/oauth/callback/testprovider/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_setup_2fa(self):
        response = self.client.get('/login/2fa/setup/')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_verify_2fa(self):
        response = self.client.get('/login/2fa/verify/')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_disable_2fa(self):
        response = self.client.get('/login/2fa/disable/')
        self.assertIn(response.status_code, [200, 401, 403])
