"""
Test suite for Redis-backed tournament manager

This test file verifies that the Redis-backed tournament manager
maintains the same API and functionality as the original implementation.
"""

import asyncio
import json
import pytest
from django.test import TestCase, TransactionTestCase
from django.conf import settings
from channels.testing import WebsocketCommunicator

from .redis_tournament_manager import redis_tournament_manager, RedisTournamentState
from .redis_backed_tournament_manager import redis_backed_tournament_manager, RedisBackedTournamentState
from .models import Tournament, UserProfile


class RedisTournamentManagerTest(TransactionTestCase):
    """Test Redis-backed tournament manager functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.user1 = UserProfile.objects.create(
            user_id=1,
            username="player1",
            email="player1@test.com"
        )
        self.user2 = UserProfile.objects.create(
            user_id=2,
            username="player2", 
            email="player2@test.com"
        )
        self.user3 = UserProfile.objects.create(
            user_id=3,
            username="player3",
            email="player3@test.com"
        )
        self.user4 = UserProfile.objects.create(
            user_id=4,
            username="player4",
            email="player4@test.com"
        )
    
    def test_redis_connection(self):
        """Test Redis connection is working"""
        # This is a sync test to verify Redis is available
        import redis
        try:
            redis_host = getattr(settings, 'REDIS_HOST', 'localhost')
            redis_port = getattr(settings, 'REDIS_PORT', '6379') 
            redis_db = getattr(settings, 'REDIS_CACHE_DB', '1')
            
            r = redis.Redis(
                host=redis_host,
                port=int(redis_port),
                db=int(redis_db)
            )
            r.ping()
            self.assertTrue(True, "Redis connection successful")
        except Exception as e:
            self.fail(f"Redis connection failed: {e}")
    
    def test_async_tournament_creation(self):
        """Test tournament creation in Redis"""
        async def async_test():
            # Create tournament
            tournament = await redis_backed_tournament_manager.create_tournament(
                tournament_id=100,
                name="Test Tournament",
                max_players=4,
                creator_id=1
            )
            
            self.assertIsInstance(tournament, RedisBackedTournamentState)
            
            # Verify tournament data
            tournament_id = await tournament.get_tournament_id()
            self.assertEqual(tournament_id, 100)
            
            name = await tournament.redis_state.get_name()
            self.assertEqual(name, "Test Tournament")
            
            max_p = await tournament.redis_state.get_max_p()
            self.assertEqual(max_p, 4)
            
            creator_id = await tournament.redis_state.get_creator_id()
            self.assertEqual(creator_id, 1)
            
            # Clean up
            await redis_backed_tournament_manager.remove_tournament(100)
        
        # Run async test
        asyncio.run(async_test())
    
    def test_async_player_management(self):
        """Test adding and managing players"""
        async def async_test():
            # Create tournament
            tournament = await redis_backed_tournament_manager.create_tournament(
                tournament_id=101,
                name="Player Test Tournament", 
                max_players=4,
                creator_id=1
            )
            
            # Add players
            result1 = await tournament.add_player({'user_id': 1})
            self.assertEqual(result1, "Player added to the tournament")
            
            result2 = await tournament.add_player({'user_id': 2})
            self.assertEqual(result2, "Player added to the tournament")
            
            result3 = await tournament.add_player({'user_id': 3})
            self.assertEqual(result3, "Player added to the tournament")
            
            result4 = await tournament.add_player({'user_id': 4})
            self.assertEqual(result4, "Player added to the tournament")
            
            # Try to add fifth player (should fail)
            result5 = await tournament.add_player({'user_id': 5})
            self.assertEqual(result5, "Tournament is full")
            
            # Try to add duplicate player
            result_duplicate = await tournament.add_player({'user_id': 1})
            self.assertEqual(result_duplicate, "Player already in tournament")
            
            # Verify player count
            nbr_players = await tournament.get_nbr_player()
            self.assertEqual(nbr_players, 4)
            
            players = await tournament.get_players()
            self.assertEqual(set(players), {1, 2, 3, 4})
            
            # Clean up
            await redis_backed_tournament_manager.remove_tournament(101)
        
        asyncio.run(async_test())
    
    def test_async_tournament_start(self):
        """Test tournament initialization and start"""
        async def async_test():
            # Create tournament
            tournament = await redis_backed_tournament_manager.create_tournament(
                tournament_id=102,
                name="Start Test Tournament",
                max_players=4, 
                creator_id=1
            )
            
            # Add players
            await tournament.add_player({'user_id': 1})
            await tournament.add_player({'user_id': 2})
            await tournament.add_player({'user_id': 3})
            await tournament.add_player({'user_id': 4})
            
            # Start tournament
            result = await tournament.start()
            self.assertEqual(result['type'], 'success')
            
            # Verify tournament state
            initialized = await tournament.get_initialized()
            self.assertTrue(initialized)
            
            status = await tournament.get_status()
            self.assertEqual(status, 'active')
            
            # Verify next round players
            next_round_players = await tournament.redis_state.get_next_round_players()
            self.assertEqual(len(next_round_players), 4)
            self.assertEqual(set(next_round_players), {1, 2, 3, 4})
            
            # Verify brackets
            brackets = await tournament.redis_state.get_brackets()
            self.assertIn(0, brackets)
            self.assertEqual(set(brackets[0]), {1, 2, 3, 4})
            
            # Clean up
            await redis_backed_tournament_manager.remove_tournament(102)
        
        asyncio.run(async_test())
    
    def test_async_round_management(self):
        """Test round progression"""
        async def async_test():
            # Create and start tournament
            tournament = await redis_backed_tournament_manager.create_tournament(
                tournament_id=103,
                name="Round Test Tournament",
                max_players=4,
                creator_id=1
            )
            
            # Add players and start
            await tournament.add_player({'user_id': 1})
            await tournament.add_player({'user_id': 2})
            await tournament.add_player({'user_id': 3})
            await tournament.add_player({'user_id': 4})
            await tournament.start()
            
            # Check if can start next round
            can_start = await tournament.can_start_next_round()
            self.assertTrue(can_start)
            
            # Start first round
            result = await tournament.start_round()
            self.assertEqual(result['type'], 'success')
            
            # Verify round state
            current_round = await tournament.get_current_round()
            self.assertEqual(current_round, 1)
            
            is_round_active = await tournament.get_is_round_active()
            self.assertTrue(is_round_active)
            
            # Verify active games created
            active_games = await tournament.redis_state.get_active_games()
            self.assertEqual(len(active_games), 2)  # 4 players = 2 games
            
            # Clean up
            await redis_backed_tournament_manager.remove_tournament(103)
        
        asyncio.run(async_test())
    
    def test_async_game_result_registration(self):
        """Test game result registration and round completion"""
        async def async_test():
            # Create and start tournament
            tournament = await redis_backed_tournament_manager.create_tournament(
                tournament_id=104,
                name="Game Result Test Tournament",
                max_players=4,
                creator_id=1
            )
            
            # Add players and start
            await tournament.add_player({'user_id': 1})
            await tournament.add_player({'user_id': 2})
            await tournament.add_player({'user_id': 3})
            await tournament.add_player({'user_id': 4})
            await tournament.start()
            await tournament.start_round()
            
            # Get active games
            active_games = await tournament.redis_state.get_active_games()
            game_ids = list(active_games.keys())
            self.assertEqual(len(game_ids), 2)
            
            # Register first game result
            game1_info = active_games[game_ids[0]]
            result1 = await tournament.register_game_result(
                game_ids[0], 
                game1_info['player_1'],  # player_1 wins
                game1_info['player_2']
            )
            self.assertEqual(result1['type'], 'success')
            
            # Verify winner added to next round
            next_round_players = await tournament.redis_state.get_next_round_players()
            self.assertIn(game1_info['player_1'], next_round_players)
            self.assertEqual(len(next_round_players), 1)
            
            # Register second game result
            game2_info = active_games[game_ids[1]]
            result2 = await tournament.register_game_result(
                game_ids[1],
                game2_info['player_1'],  # player_1 wins
                game2_info['player_2']
            )
            self.assertEqual(result2['type'], 'success')
            
            # Verify both winners in next round
            next_round_players = await tournament.redis_state.get_next_round_players()
            self.assertEqual(len(next_round_players), 2)
            
            # Wait a bit for round completion processing
            await asyncio.sleep(1)
            
            # Round should be inactive now (auto-progression may start next round)
            is_round_active = await tournament.get_is_round_active()
            # Note: Round might auto-start the next round, so we check that games were processed
            remaining_active_games = await tournament.redis_state.get_active_games()
            # Either no active games (round ended) or new games started (next round)
            self.assertTrue(len(remaining_active_games) == 0 or len(remaining_active_games) == 1)
            
            # Clean up
            await redis_backed_tournament_manager.remove_tournament(104)
        
        asyncio.run(async_test())
    
    def test_tournament_retrieval(self):
        """Test tournament retrieval from Redis"""
        async def async_test():
            # Create tournament
            tournament1 = await redis_backed_tournament_manager.create_tournament(
                tournament_id=105,
                name="Retrieval Test Tournament",
                max_players=2,
                creator_id=1
            )
            
            # Retrieve tournament
            tournament2 = await redis_backed_tournament_manager.get_tournament(105)
            self.assertIsNotNone(tournament2)
            
            # Verify they refer to the same tournament
            id1 = await tournament1.get_tournament_id()
            id2 = await tournament2.get_tournament_id()
            self.assertEqual(id1, id2)
            
            name1 = await tournament1.redis_state.get_name()
            name2 = await tournament2.redis_state.get_name()
            self.assertEqual(name1, name2)
            
            # Clean up
            await redis_backed_tournament_manager.remove_tournament(105)
        
        asyncio.run(async_test())
    
    def test_tournament_not_found(self):
        """Test retrieval of non-existent tournament"""
        async def async_test():
            # Try to get non-existent tournament
            tournament = await redis_backed_tournament_manager.get_tournament(999)
            self.assertIsNone(tournament)
        
        asyncio.run(async_test())


class RedisTournamentIntegrationTest(TransactionTestCase):
    """Integration tests for Redis tournament manager with Django models"""
    
    def setUp(self):
        """Set up test data with actual Django models"""
        self.user1 = UserProfile.objects.create(
            user_id=10,
            username="integration_player1",
            email="integration1@test.com"
        )
        self.user2 = UserProfile.objects.create(
            user_id=11,
            username="integration_player2",
            email="integration2@test.com"
        )
        
        # Create tournament in database
        self.tournament_db = Tournament.objects.create(
            id=200,
            name="Integration Test Tournament",
            max_partecipants=2,
            creator=self.user1,
            status='pending'
        )
        self.tournament_db.player.add(self.user1, self.user2)
    
    def test_load_tournament_from_database(self):
        """Test loading tournament from database into Redis"""
        async def async_test():
            # Load tournament from database
            tournament = await redis_backed_tournament_manager.get_tournament(200)
            self.assertIsNotNone(tournament)
            
            # Verify data loaded correctly
            tournament_id = await tournament.get_tournament_id()
            self.assertEqual(tournament_id, 200)
            
            name = await tournament.redis_state.get_name()
            self.assertEqual(name, "Integration Test Tournament")
            
            # Load players from database
            success = await tournament.load_players_from_db()
            self.assertTrue(success)
            
            # Verify players loaded
            players = await tournament.get_players()
            self.assertEqual(set(players), {10, 11})
            
            nbr_players = await tournament.get_nbr_player()
            self.assertEqual(nbr_players, 2)
            
            # Clean up
            await redis_backed_tournament_manager.remove_tournament(200)
        
        asyncio.run(async_test())


if __name__ == '__main__':
    # Run tests directly
    import django
    from django.conf import settings
    from django.test.utils import get_runner
    
    if not settings.configured:
        django.setup()
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(['pong_app.test_redis_tournament_manager'])
    
    if failures:
        exit(1)
