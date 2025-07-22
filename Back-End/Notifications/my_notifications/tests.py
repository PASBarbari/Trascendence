
from django.test import TestCase, Client

class MyNotificationsURLTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_add_user_to_group_endpoint(self):
        response = self.client.get('/notification/groups/1/add_user/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_add_user_endpoint(self):
        response = self.client.get('/notification/add_user')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_notification_history_endpoint(self):
        response = self.client.get('/notification/notification_history')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_new_notification_endpoint(self):
        response = self.client.get('/notification/new/')
        self.assertIn(response.status_code, [200, 401, 403])
