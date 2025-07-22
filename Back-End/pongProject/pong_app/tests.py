
from django.test import TestCase, Client

class PongAppURLTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_tournament_gen(self):
        response = self.client.get('/tournament')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_tournament_manage(self):
        response = self.client.get('/tournament/1/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_join_tournament(self):
        response = self.client.get('/tournament/join')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_end_tournament(self):
        response = self.client.get('/tournament/end')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_tournament_match_history(self):
        response = self.client.get('/tournament/match-history')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_game_gen(self):
        response = self.client.get('/game')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_game_manage(self):
        response = self.client.get('/game/1/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_check_pending_games(self):
        response = self.client.get('/games/pending/1/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_player_match_history(self):
        response = self.client.get('/games/history')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_player_gen(self):
        response = self.client.get('/player')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_player_manage(self):
        response = self.client.get('/player/1/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_user_statistics(self):
        response = self.client.get('/player/stats')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_health_check(self):
        response = self.client.get('/health')
        self.assertIn(response.status_code, [200, 401, 403])
