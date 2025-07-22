
from django.test import TestCase, Client

class PongAppURLTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_tournament_gen(self):
        response = self.client.get('/pong/tournament')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_tournament_manage(self):
        response = self.client.get('/pong/tournament/1/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_join_tournament(self):
        response = self.client.get('/pong/tournament/join')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_end_tournament(self):
        response = self.client.get('/pong/tournament/end')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_tournament_match_history(self):
        response = self.client.get('/pong/tournament/match-history')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_game_gen(self):
        response = self.client.get('/pong/game')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_game_manage(self):
        response = self.client.get('/pong/game/1/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_check_pending_games(self):
        response = self.client.get('/pong/games/pending/1/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_player_match_history(self):
        response = self.client.get('/pong/games/history')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_player_gen(self):
        response = self.client.get('/pong/player')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_player_manage(self):
        response = self.client.get('/pong/player/1/')
        self.assertIn(response.status_code, [200, 401, 403, 404])

    def test_user_statistics(self):
        response = self.client.get('/pong/player/stats')
        self.assertIn(response.status_code, [200, 401, 403])

    def test_health_check(self):
        response = self.client.get('/pong/health')
        self.assertIn(response.status_code, [200, 401, 403])
