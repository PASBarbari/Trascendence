"""
Redis-based Tournament State Manager

This module provides Redis-backed tournament state management to support
multi-process environments while maintaining the same external API.
"""

import asyncio
import json
import logging
import redis.asyncio as redis
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from django.conf import settings

logger = logging.getLogger('pong_app')


class RedisTournamentManager:
    """
    Redis-backed tournament manager for multi-process environments
    """
    
    def __init__(self):
        self.redis_client = None
        self._init_redis()
        
        # Redis key patterns
        self.TOURNAMENT_KEY = "tournament:{tournament_id}"
        self.ACTIVE_TOURNAMENTS_KEY = "active_tournaments"
        self.TOURNAMENT_TASKS_KEY = "tournament_tasks"
        self.TOURNAMENT_LOCK_KEY = "tournament_lock:{tournament_id}"
        self.ACTIVE_GAMES_KEY = "tournament:{tournament_id}:active_games"
        self.NEXT_ROUND_KEY = "tournament:{tournament_id}:next_round"
        self.BRACKETS_KEY = "tournament:{tournament_id}:brackets"
        
        # Lock timeouts
        self.LOCK_TIMEOUT = 30  # seconds
        self.OPERATION_TIMEOUT = 10  # seconds
        
        # Key expiration times
        self.TOURNAMENT_TTL = 7200  # 2 hours for tournament data
        self.ACTIVE_GAMES_TTL = 360  # 6 minutes for active games
        self.ROUND_DATA_TTL = 1800  # 30 minutes for round data
        self.BRACKET_TTL = 7200  # 2 hours for bracket data
    
    def _init_redis(self):
        """Initialize Redis connection"""
        try:
            redis_host = getattr(settings, 'REDIS_HOST', 'localhost')
            redis_port = getattr(settings, 'REDIS_PORT', '6379')
            redis_db = getattr(settings, 'REDIS_CACHE_DB', '1')
            
            self.redis_client = redis.Redis(
                host=redis_host,
                port=int(redis_port),
                db=int(redis_db),
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            logger.info(f"Redis tournament manager initialized: {redis_host}:{redis_port}/{redis_db}")
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            raise
    
    async def _acquire_lock(self, tournament_id: int, timeout: float = None) -> bool:
        """Acquire distributed lock for tournament operations"""
        timeout = timeout or self.LOCK_TIMEOUT
        lock_key = self.TOURNAMENT_LOCK_KEY.format(tournament_id=tournament_id)
        
        try:
            # Try to acquire lock with expiration
            acquired = await self.redis_client.set(
                lock_key, 
                f"process_{asyncio.current_task().get_name()}", 
                nx=True, 
                ex=int(timeout)
            )
            return bool(acquired)
        except Exception as e:
            logger.error(f"Failed to acquire lock for tournament {tournament_id}: {e}")
            return False
    
    async def _release_lock(self, tournament_id: int):
        """Release distributed lock for tournament operations"""
        lock_key = self.TOURNAMENT_LOCK_KEY.format(tournament_id=tournament_id)
        try:
            await self.redis_client.delete(lock_key)
        except Exception as e:
            logger.warning(f"Failed to release lock for tournament {tournament_id}: {e}")
    
    async def create_tournament(self, tournament_id: int, name: str, max_players: int, creator_id: int) -> 'RedisTournamentState':
        """Create a new tournament and store in Redis"""
        tournament_data = {
            'tournament_id': tournament_id,
            'name': name,
            'max_p': max_players,
            'creator_id': creator_id,
            'players': [],
            'nbr_player': 0,
            'initialized': False,
            'is_complete': False,
            'status': 'pending',
            'current_round': 0,
            'is_round_active': False,
            'partecipants': [],
            'winner': None,
            'created_at': datetime.now().isoformat(),
            'round_start_time': None,
            'completion_time': None
        }
        
        try:
            # Store tournament data
            tournament_key = self.TOURNAMENT_KEY.format(tournament_id=tournament_id)
            await self.redis_client.hset(tournament_key, mapping={
                k: json.dumps(v) if isinstance(v, (list, dict)) else str(v)
                for k, v in tournament_data.items()
            })
            
            # Set TTL for tournament data
            await self.redis_client.expire(tournament_key, self.TOURNAMENT_TTL)
            
            # Add to active tournaments set
            await self.redis_client.sadd(self.ACTIVE_TOURNAMENTS_KEY, tournament_id)
            
            # Initialize empty collections with TTL
            active_games_key = self.ACTIVE_GAMES_KEY.format(tournament_id=tournament_id)
            next_round_key = self.NEXT_ROUND_KEY.format(tournament_id=tournament_id)
            brackets_key = self.BRACKETS_KEY.format(tournament_id=tournament_id)
            
            await self.redis_client.delete(active_games_key)
            await self.redis_client.delete(next_round_key)
            await self.redis_client.delete(brackets_key)
            
            # Set TTL on the keys even if they're empty (Redis will maintain the TTL)
            await self.redis_client.expire(active_games_key, self.ACTIVE_GAMES_TTL)
            await self.redis_client.expire(next_round_key, self.ROUND_DATA_TTL)
            await self.redis_client.expire(brackets_key, self.BRACKET_TTL)
            
            logger.info(f"Tournament {tournament_id} created in Redis with TTL settings")
            
            # Return tournament state wrapper
            return RedisTournamentState(tournament_id, self)
            
        except Exception as e:
            logger.error(f"Failed to create tournament {tournament_id} in Redis: {e}")
            raise
    
    async def get_tournament(self, tournament_id: int) -> Optional['RedisTournamentState']:
        """Get tournament by ID from Redis"""
        try:
            tournament_key = self.TOURNAMENT_KEY.format(tournament_id=tournament_id)
            exists = await self.redis_client.exists(tournament_key)
            
            if exists:
                return RedisTournamentState(tournament_id, self)
            
            # Try to load from database if not in Redis
            return await self._load_from_database(tournament_id)
            
        except Exception as e:
            logger.error(f"Failed to get tournament {tournament_id} from Redis: {e}")
            return None
    
    async def _load_from_database(self, tournament_id: int) -> Optional['RedisTournamentState']:
        """Load tournament from database and cache in Redis"""
        try:
            from channels.db import database_sync_to_async
            from .models import Tournament
            
            tournament_db = await database_sync_to_async(Tournament.objects.get)(id=tournament_id)
            
            # Get creator_id safely in async context
            creator_id = await database_sync_to_async(
                lambda: tournament_db.creator.user_id if tournament_db.creator else None
            )()
            logger.info(f"Loading tournament {tournament_id} from database with creator {creator_id}")
            # Get winner_id safely in async context
            winner_id = await database_sync_to_async(
                lambda: tournament_db.winner.user_id if tournament_db.winner else None
            )()
            
            # Get created_at safely in async context
            created_at = await database_sync_to_async(
                lambda: tournament_db.created_at.isoformat() if hasattr(tournament_db, 'created_at') else datetime.now().isoformat()
            )()
            
            # Convert database model to Redis format
            tournament_data = {
                'tournament_id': tournament_id,
                'name': tournament_db.name,
                'max_p': tournament_db.max_partecipants,
                'creator_id': creator_id,
                'status': tournament_db.status,
                'initialized': tournament_db.status in ['active', 'completed'],
                'is_complete': tournament_db.status == 'completed',
                'winner': winner_id,
                'players': [],
                'nbr_player': 0,
                'current_round': 0,
                'is_round_active': False,
                'partecipants': [],
                'created_at': created_at,
                'round_start_time': None,
                'completion_time': None
            }
            
            # Load players safely in async context
            participants = await database_sync_to_async(
                lambda: list(tournament_db.player.all())
            )()
            
            # Extract player IDs safely
            player_ids = await database_sync_to_async(
                lambda: [p.user_id for p in participants]
            )()
            
            tournament_data['players'] = player_ids
            tournament_data['nbr_player'] = len(player_ids)
            
            # Store in Redis
            tournament_key = self.TOURNAMENT_KEY.format(tournament_id=tournament_id)
            await self.redis_client.hset(tournament_key, mapping={
                k: json.dumps(v) if isinstance(v, (list, dict)) else str(v)
                for k, v in tournament_data.items()
            })
            
            # Set TTL for tournament data
            await self.redis_client.expire(tournament_key, self.TOURNAMENT_TTL)
            
            if tournament_data['status'] != 'completed':
                await self.redis_client.sadd(self.ACTIVE_TOURNAMENTS_KEY, tournament_id)
            
            logger.info(f"Tournament {tournament_id} loaded from database to Redis with TTL")
            return RedisTournamentState(tournament_id, self)
            
        except Exception as e:
            logger.warning(f"Failed to load tournament {tournament_id} from database: {e}")
            return None
    
    async def remove_tournament(self, tournament_id: int):
        """Remove tournament from Redis"""
        try:
            # Remove from active tournaments
            await self.redis_client.srem(self.ACTIVE_TOURNAMENTS_KEY, tournament_id)
            
            # Remove tournament data
            tournament_key = self.TOURNAMENT_KEY.format(tournament_id=tournament_id)
            await self.redis_client.delete(tournament_key)
            
            # Remove related data
            await self.redis_client.delete(self.ACTIVE_GAMES_KEY.format(tournament_id=tournament_id))
            await self.redis_client.delete(self.NEXT_ROUND_KEY.format(tournament_id=tournament_id))
            await self.redis_client.delete(self.BRACKETS_KEY.format(tournament_id=tournament_id))
            
            # Remove lock
            await self._release_lock(tournament_id)
            
            logger.info(f"Tournament {tournament_id} removed from Redis")
            
        except Exception as e:
            logger.error(f"Failed to remove tournament {tournament_id} from Redis: {e}")
    
    async def get_active_tournaments(self) -> Set[int]:
        """Get set of active tournament IDs"""
        try:
            tournament_ids = await self.redis_client.smembers(self.ACTIVE_TOURNAMENTS_KEY)
            return {int(tid) for tid in tournament_ids}
        except Exception as e:
            logger.error(f"Failed to get active tournaments: {e}")
            return set()
    
    async def cleanup_expired_games(self, tournament_id: int):
        """Cleanup expired active games for a tournament"""
        try:
            games_key = self.ACTIVE_GAMES_KEY.format(tournament_id=tournament_id)
            
            # Check if the key exists and its TTL
            ttl = await self.redis_client.ttl(games_key)
            if ttl == -2:  # Key doesn't exist
                logger.info(f"Active games key for tournament {tournament_id} has expired and been cleaned up")
                return True
            elif ttl == -1:  # Key exists but has no TTL
                logger.warning(f"Active games key for tournament {tournament_id} has no TTL, setting one")
                await self.redis_client.expire(games_key, self.ACTIVE_GAMES_TTL)
            
            return False  # Key still exists
        except Exception as e:
            logger.error(f"Failed to cleanup expired games for tournament {tournament_id}: {e}")
            return False
    
    async def extend_game_ttl(self, tournament_id: int, additional_time: int = 300):
        """Extend TTL for active games (useful for long tournaments)"""
        try:
            games_key = self.ACTIVE_GAMES_KEY.format(tournament_id=tournament_id)
            current_ttl = await self.redis_client.ttl(games_key)
            
            if current_ttl > 0:
                new_ttl = current_ttl + additional_time
                await self.redis_client.expire(games_key, new_ttl)
                logger.info(f"Extended active games TTL for tournament {tournament_id} by {additional_time}s")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to extend game TTL for tournament {tournament_id}: {e}")
            return False


class RedisTournamentState:
    """
    Redis-backed tournament state that maintains the same API as TournamentState
    """
    
    def __init__(self, tournament_id: int, manager: RedisTournamentManager):
        self.tournament_id = tournament_id
        self.manager = manager
        self._cached_data = {}
        self._cache_expiry = None
        self._cache_ttl = 10  # seconds
    
    async def _get_data(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Get tournament data from Redis with caching"""
        now = datetime.now()
        
        if (not force_refresh and 
            self._cached_data and 
            self._cache_expiry and 
            now < self._cache_expiry):
            return self._cached_data
        
        try:
            tournament_key = self.manager.TOURNAMENT_KEY.format(tournament_id=self.tournament_id)
            data = await self.manager.redis_client.hgetall(tournament_key)
            
            if not data:
                logger.warning(f"Tournament {self.tournament_id} not found in Redis")
                return {}
            
            # Parse JSON fields
            parsed_data = {}
            for key, value in data.items():
                try:
                    # Try to parse as JSON for lists/dicts
                    if value.startswith('[') or value.startswith('{'):
                        parsed_data[key] = json.loads(value)
                    else:
                        # Handle primitives
                        if value.lower() in ('true', 'false'):
                            parsed_data[key] = value.lower() == 'true'
                        elif value.isdigit():
                            parsed_data[key] = int(value)
                        elif value in ('None', ''):
                            parsed_data[key] = None
                        else:
                            parsed_data[key] = value
                except json.JSONDecodeError:
                    parsed_data[key] = value
            
            self._cached_data = parsed_data
            self._cache_expiry = now + timedelta(seconds=self._cache_ttl)
            return parsed_data
            
        except Exception as e:
            logger.error(f"Failed to get tournament {self.tournament_id} data: {e}")
            return {}
    
    async def _update_data(self, updates: Dict[str, Any]):
        """Update tournament data in Redis and invalidate cache"""
        try:
            tournament_key = self.manager.TOURNAMENT_KEY.format(tournament_id=self.tournament_id)
            
            # Serialize updates
            serialized_updates = {
                k: json.dumps(v) if isinstance(v, (list, dict)) else str(v)
                for k, v in updates.items()
            }
            
            await self.manager.redis_client.hset(tournament_key, mapping=serialized_updates)
            
            # Invalidate cache
            self._cached_data = {}
            self._cache_expiry = None
            
        except Exception as e:
            logger.error(f"Failed to update tournament {self.tournament_id} data: {e}")
            raise
    
    # Properties that mirror the original TournamentState
    async def get_tournament_id(self) -> int:
        return self.tournament_id
    
    async def get_name(self) -> str:
        data = await self._get_data()
        return data.get('name', '')
    
    async def get_max_p(self) -> int:
        data = await self._get_data()
        return data.get('max_p', 0)
    
    async def get_creator_id(self) -> int:
        data = await self._get_data()
        return data.get('creator_id', 0)
    
    async def get_players(self) -> List[int]:
        data = await self._get_data()
        return data.get('players', [])
    
    async def get_nbr_player(self) -> int:
        data = await self._get_data()
        return data.get('nbr_player', 0)
    
    async def get_initialized(self) -> bool:
        data = await self._get_data()
        return data.get('initialized', False)
    
    async def get_is_complete(self) -> bool:
        data = await self._get_data()
        return data.get('is_complete', False)
    
    async def get_status(self) -> str:
        data = await self._get_data()
        return data.get('status', 'pending')
    
    async def get_current_round(self) -> int:
        data = await self._get_data()
        return data.get('current_round', 0)
    
    async def get_is_round_active(self) -> bool:
        data = await self._get_data()
        return data.get('is_round_active', False)
    
    async def get_winner(self) -> Optional[int]:
        data = await self._get_data()
        return data.get('winner')
    
    async def get_active_games(self) -> Dict[int, Dict]:
        """Get active games from Redis"""
        try:
            games_key = self.manager.ACTIVE_GAMES_KEY.format(tournament_id=self.tournament_id)
            games_data = await self.manager.redis_client.hgetall(games_key)
            
            # Parse JSON values
            active_games = {}
            for game_id, game_info_json in games_data.items():
                try:
                    active_games[int(game_id)] = json.loads(game_info_json)
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Failed to parse game {game_id} info: {e}")
            
            return active_games
        except Exception as e:
            logger.error(f"Failed to get active games for tournament {self.tournament_id}: {e}")
            return {}
    
    async def add_active_game(self, game_id: int, game_info: Dict):
        """Add active game to Redis with TTL"""
        try:
            games_key = self.manager.ACTIVE_GAMES_KEY.format(tournament_id=self.tournament_id)
            await self.manager.redis_client.hset(games_key, game_id, json.dumps(game_info))
            # Set/refresh TTL for active games (6 minutes)
            await self.manager.redis_client.expire(games_key, self.manager.ACTIVE_GAMES_TTL)
            logger.info(f"Active game {game_id} added with {self.manager.ACTIVE_GAMES_TTL}s TTL")
        except Exception as e:
            logger.error(f"Failed to add active game {game_id}: {e}")
            raise
    
    async def remove_active_game(self, game_id: int) -> Optional[Dict]:
        """Remove and return active game from Redis"""
        try:
            games_key = self.manager.ACTIVE_GAMES_KEY.format(tournament_id=self.tournament_id)
            
            # Get game info before removing
            game_info_json = await self.manager.redis_client.hget(games_key, game_id)
            if not game_info_json:
                return None
            
            # Remove the game
            await self.manager.redis_client.hdel(games_key, game_id)
            
            # Parse and return game info
            try:
                return json.loads(game_info_json)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse removed game {game_id} info")
                return None
        except Exception as e:
            logger.error(f"Failed to remove active game {game_id}: {e}")
            return None
    
    async def get_next_round_players(self) -> List[int]:
        """Get next round players from Redis"""
        try:
            next_round_key = self.manager.NEXT_ROUND_KEY.format(tournament_id=self.tournament_id)
            players = await self.manager.redis_client.lrange(next_round_key, 0, -1)
            return [int(p) for p in players]
        except Exception as e:
            logger.error(f"Failed to get next round players: {e}")
            return []
    
    async def add_next_round_player(self, player_id: int):
        """Add player to next round with TTL refresh"""
        try:
            next_round_key = self.manager.NEXT_ROUND_KEY.format(tournament_id=self.tournament_id)
            await self.manager.redis_client.rpush(next_round_key, player_id)
            # Refresh TTL for round data
            await self.manager.redis_client.expire(next_round_key, self.manager.ROUND_DATA_TTL)
        except Exception as e:
            logger.error(f"Failed to add player {player_id} to next round: {e}")
            raise
    
    async def remove_next_round_player(self, player_id: int):
        """Remove player from next round"""
        try:
            next_round_key = self.manager.NEXT_ROUND_KEY.format(tournament_id=self.tournament_id)
            await self.manager.redis_client.lrem(next_round_key, 0, player_id)
        except Exception as e:
            logger.error(f"Failed to remove player {player_id} from next round: {e}")
            raise
    
    async def clear_next_round(self):
        """Clear next round players and reset TTL"""
        try:
            next_round_key = self.manager.NEXT_ROUND_KEY.format(tournament_id=self.tournament_id)
            await self.manager.redis_client.delete(next_round_key)
            # Set TTL even on empty key to ensure cleanup
            await self.manager.redis_client.expire(next_round_key, self.manager.ROUND_DATA_TTL)
        except Exception as e:
            logger.error(f"Failed to clear next round: {e}")
            raise
    
    async def get_brackets(self) -> Dict[int, List[int]]:
        """Get tournament brackets from Redis"""
        try:
            brackets_key = self.manager.BRACKETS_KEY.format(tournament_id=self.tournament_id)
            brackets_data = await self.manager.redis_client.hgetall(brackets_key)
            
            brackets = {}
            for round_num, players_json in brackets_data.items():
                try:
                    brackets[int(round_num)] = json.loads(players_json)
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Failed to parse bracket round {round_num}: {e}")
            
            return brackets
        except Exception as e:
            logger.error(f"Failed to get brackets: {e}")
            return {}
    
    async def set_bracket_round(self, round_num: int, players: List[int]):
        """Set players for a bracket round with TTL"""
        try:
            brackets_key = self.manager.BRACKETS_KEY.format(tournament_id=self.tournament_id)
            await self.manager.redis_client.hset(brackets_key, round_num, json.dumps(players))
            # Refresh TTL for bracket data
            await self.manager.redis_client.expire(brackets_key, self.manager.BRACKET_TTL)
        except Exception as e:
            logger.error(f"Failed to set bracket round {round_num}: {e}")
            raise


# Global Redis tournament manager instance
redis_tournament_manager = RedisTournamentManager()
