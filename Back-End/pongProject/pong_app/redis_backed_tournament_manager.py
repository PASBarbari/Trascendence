"""
Redis-backed Tournament Manager with same external API

This module provides a Redis-backed implementation of the tournament management
system that maintains the same external API while supporting multi-process environments.
"""

import asyncio
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer

from .redis_tournament_manager import redis_tournament_manager, RedisTournamentState

logger = logging.getLogger('pong_app')


class RedisBackedTournamentManager:
    """
    Tournament manager that uses Redis for state storage while maintaining
    the same external API as the original TournamentManager
    """
    
    def __init__(self):
        self.redis_manager = redis_tournament_manager
        self.tournament_tasks: Dict[int, asyncio.Task] = {}  # Keep tasks in memory per process
        self.channel_layer = get_channel_layer()
    
    async def create_tournament(self, tournament_id: int, name: str, max_players: int, creator_id: int) -> 'RedisBackedTournamentState':
        """Create a new tournament and start its management task"""
        # Create tournament in Redis
        redis_state = await self.redis_manager.create_tournament(
            tournament_id, name, max_players, creator_id
        )
        
        # Create wrapper that maintains original API
        tournament = RedisBackedTournamentState(redis_state, self)
        
        # Start the tournament management task
        task = asyncio.create_task(self._manage_tournament(tournament))
        self.tournament_tasks[tournament_id] = task
        
        logger.info(f"Tournament {tournament_id} created in Redis and management task started")
        return tournament
    
    async def get_tournament(self, tournament_id: int) -> Optional['RedisBackedTournamentState']:
        """Get tournament by ID, loading from Redis or database if needed"""
        redis_state = await self.redis_manager.get_tournament(tournament_id)
        if not redis_state:
            logger.info(f"Tournament {tournament_id} not found in Redis")
            return None
        
        tournament = RedisBackedTournamentState(redis_state, self)
        
        # Start management task if tournament is active and not already managed
        if (tournament_id not in self.tournament_tasks and 
            await tournament.get_status() == 'active' and 
            not await tournament.get_is_complete()):
            task = asyncio.create_task(self._manage_tournament(tournament))
            self.tournament_tasks[tournament_id] = task
            logger.info(f"Started management task for existing tournament {tournament_id}")
        
        return tournament
    
    async def remove_tournament(self, tournament_id: int):
        """Remove tournament and cancel its management task"""
        # Cancel local management task
        if tournament_id in self.tournament_tasks:
            self.tournament_tasks[tournament_id].cancel()
            del self.tournament_tasks[tournament_id]
        
        # Remove from Redis
        await self.redis_manager.remove_tournament(tournament_id)
        
        logger.info(f"Tournament {tournament_id} removed and task cancelled")
    
    async def _manage_tournament(self, tournament: 'RedisBackedTournamentState'):
        """Main tournament management loop"""
        try:
            tournament_id = await tournament.get_tournament_id()
            logger.info(f"Starting tournament management for {tournament_id}")
            
            # Wait for tournament to be initialized (brackets created)
            while not await tournament.get_initialized():
                await asyncio.sleep(1)
            
            logger.info(f"Tournament {tournament_id} initialized, starting auto-round progression")
            
            # Auto-start rounds until tournament is complete
            while not await tournament.get_is_complete():
                if await tournament.can_start_next_round():
                    await tournament.start_round()
                    
                    # Wait for round to complete (with timeout)
                    await self._wait_for_round_completion(tournament)
                else:
                    # Wait a bit before checking again
                    await asyncio.sleep(2)
            
            logger.info(f"Tournament {tournament_id} completed!")
            
        except asyncio.CancelledError:
            tournament_id = await tournament.get_tournament_id()
            logger.info(f"Tournament {tournament_id} management cancelled")
        except Exception as e:
            tournament_id = await tournament.get_tournament_id()
            logger.error(f"Error in tournament {tournament_id} management: {e}", exc_info=True)
    
    async def _wait_for_round_completion(self, tournament: 'RedisBackedTournamentState'):
        """Wait for round to complete with timeout handling"""
        round_timeout = 300  # 5 minutes per round
        start_time = datetime.now()
        
        while (await tournament.get_is_round_active() and 
               not await tournament.get_is_complete()):
            # Check if round timeout exceeded
            if datetime.now() - start_time > timedelta(seconds=round_timeout):
                tournament_id = await tournament.get_tournament_id()
                logger.warning(f"Round timeout in tournament {tournament_id}")
                await tournament.handle_round_timeout()
                break
            
            await asyncio.sleep(5)  # Check every 5 seconds


class RedisBackedTournamentState:
    """
    Wrapper around RedisTournamentState that maintains the original TournamentState API
    """
    
    def __init__(self, redis_state: RedisTournamentState, manager: RedisBackedTournamentManager = None):
        self.redis_state = redis_state
        self.manager = manager
        # Cache properties to avoid repeated async calls in sync contexts
        self._cached_properties = {}
    
    # Sync property access for backward compatibility (with caching)
    @property 
    def tournament_id(self) -> int:
        if 'tournament_id' not in self._cached_properties:
            # This will be populated by the async getter when first called
            return self.redis_state.tournament_id
        return self._cached_properties['tournament_id']
    
    # Async methods for full functionality
    async def get_tournament_id(self) -> int:
        self._cached_properties['tournament_id'] = self.redis_state.tournament_id
        return self.redis_state.tournament_id
    
    @property
    async def name(self) -> str:
        return await self.redis_state.get_name()
    
    @property
    async def max_p(self) -> int:
        return await self.redis_state.get_max_p()
    
    @property
    async def creator_id(self) -> int:
        return await self.redis_state.get_creator_id()
    
    async def get_players(self) -> List[int]:
        return await self.redis_state.get_players()
    
    async def get_nbr_player(self) -> int:
        return await self.redis_state.get_nbr_player()
    
    async def get_initialized(self) -> bool:
        return await self.redis_state.get_initialized()
    
    async def get_is_complete(self) -> bool:
        return await self.redis_state.get_is_complete()
    
    async def get_status(self) -> str:
        return await self.redis_state.get_status()
    
    async def get_current_round(self) -> int:
        return await self.redis_state.get_current_round()
    
    async def get_is_round_active(self) -> bool:
        """Check if round is active based on game state rather than a flag"""
        if not await self.get_initialized() or await self.get_is_complete():
            return False
        
        # Round is active if there are active games
        active_games = await self.redis_state.get_active_games()
        tournament_id = await self.get_tournament_id()
        logger.info(f"DEBUG: get_is_round_active for tournament {tournament_id}: active_games={len(active_games)}")
        return len(active_games) > 0
    
    async def get_winner(self) -> Optional[int]:
        return await self.redis_state.get_winner()
    
    async def add_player(self, user_dict: Dict[str, Any]) -> str:
        """Add player to tournament"""
        player_id = user_dict['user_id']
        
        # Acquire lock for tournament modification
        if not await self.redis_state.manager._acquire_lock(self.redis_state.tournament_id):
            return "Tournament is currently being modified, try again"
        
        try:
            if await self.get_initialized():
                return "Tournament has already started"
            
            current_players = await self.get_nbr_player()
            max_players = await self.redis_state.get_max_p()
            
            if current_players >= max_players:
                return "Tournament is full"
            
            players = await self.get_players()
            if player_id in players:
                return "Player already in tournament"
            
            # Add player
            players.append(player_id)
            await self.redis_state._update_data({
                'players': players,
                'nbr_player': len(players)
            })
            
            tournament_id = await self.get_tournament_id()
            logger.info(f"Player {player_id} added to tournament {tournament_id}. Players: {len(players)}/{max_players}")
            return "Player added to the tournament"
            
        finally:
            await self.redis_state.manager._release_lock(self.redis_state.tournament_id)
    
    async def load_players_from_db(self) -> bool:
        """Load players from database and sync with Redis state"""
        try:
            from .models import Tournament
            tournament_db = await database_sync_to_async(Tournament.objects.get)(id=self.redis_state.tournament_id)
            participants = await database_sync_to_async(list)(tournament_db.player.all())
            
            # Update Redis state
            players = [p.user_id for p in participants]
            status = tournament_db.status
            winner_id = tournament_db.winner.user_id if tournament_db.winner else None
            
            updates = {
                'players': players,
                'nbr_player': len(players),
                'status': status,
                'is_complete': status == 'completed',
                'initialized': status in ['active', 'completed'],
                'winner': winner_id
            }
            
            await self.redis_state._update_data(updates)
            
            tournament_id = await self.get_tournament_id()
            logger.info(f"Loaded tournament {tournament_id} from database: {len(players)} players, status: {status}")
            return True
            
        except Exception as e:
            tournament_id = await self.get_tournament_id()
            logger.error(f"Failed to load players from database for tournament {tournament_id}: {e}")
            return False
    
    async def start(self) -> Dict[str, Any]:
        """Initialize tournament brackets"""
        # Acquire lock for tournament modification
        if not await self.redis_state.manager._acquire_lock(self.redis_state.tournament_id):
            return {'type': 'error', 'error': 'Tournament is currently being modified'}
        
        try:
            if await self.get_initialized():
                return {'type': 'error', 'error': 'Tournament already initialized'}
            
            nbr_players = await self.get_nbr_player()
            if nbr_players < 2:
                return {'type': 'error', 'error': 'Need at least 2 players to start tournament'}
            
            # Initialize tournament
            players = await self.get_players()
            
            updates = {
                'initialized': True,
                'status': 'active',
                'current_round': 0,
                'partecipants': players.copy()
            }
            
            await self.redis_state._update_data(updates)
            
            # Initialize next round and brackets
            await self.redis_state.clear_next_round()
            for player_id in players:
                await self.redis_state.add_next_round_player(player_id)
            
            await self.redis_state.set_bracket_round(0, players.copy())
            
            tournament_id = await self.get_tournament_id()
            logger.info(f"Tournament {tournament_id} initialized with {nbr_players} players letsgoski")
            
            # Update tournament status in database
            asyncio.create_task(self._update_tournament_status_in_db('active'))
            
            return {'type': 'success', 'success': 'Tournament initialized successfully'}
            
        finally:
            await self.redis_state.manager._release_lock(self.redis_state.tournament_id)
    
    async def can_start_next_round(self) -> bool:
        """Check if next round can be started"""
        tournament_id = await self.get_tournament_id()
        is_initialized = await self.get_initialized()
        is_complete = await self.get_is_complete()
        is_round_active = await self.get_is_round_active()
        
        logger.info(f"DEBUG: can_start_next_round for tournament {tournament_id}: initialized={is_initialized}, complete={is_complete}, round_active={is_round_active}")
        
        if (not is_initialized or is_complete or is_round_active):
            return False
        
        next_round_players = await self.redis_state.get_next_round_players()
        logger.info(f"DEBUG: Next round players for tournament {tournament_id}: {next_round_players}")
        
        # Check if we have players for next round
        if len(next_round_players) < 2:
            logger.info(f"DEBUG: Not enough players for next round: {len(next_round_players)}")
            return False
        
        # If only one player left, tournament is complete
        if len(next_round_players) == 1:
            logger.info(f"DEBUG: Only one player left, completing tournament {tournament_id}")
            # Mark tournament as complete
            await self.redis_state._update_data({
                'winner': next_round_players[0],
                'is_complete': True,
                'status': 'completed',
                'completion_time': datetime.now().isoformat()
            })
            # Update database immediately
            await self._update_tournament_in_db()
            return False
        
        return True
    
    async def start_round(self) -> Dict[str, Any]:
        """Start the next tournament round"""
        # Acquire lock for round operations
        if not await self.redis_state.manager._acquire_lock(self.redis_state.tournament_id):
            return {'type': 'error', 'error': 'Tournament is currently being modified'}
        
        try:
            if not await self.can_start_next_round():
                return {'type': 'error', 'error': 'Cannot start round'}
            
            current_round = await self.get_current_round()
            new_round = current_round + 1
            
            # Update round state
            tournament_id = await self.get_tournament_id()
            logger.info(f"DEBUG: Starting round {new_round} for tournament {tournament_id}")
            await self.redis_state._update_data({
                'current_round': new_round,
                'round_start_time': datetime.now().isoformat()
            })
            
            # Get participants for this round
            participants = await self.redis_state.get_next_round_players()
            random.shuffle(participants)  # Shuffle for fair pairing
            
            # Clear next round (winners will be added back)
            await self.redis_state.clear_next_round()
            
            # Create bracket for this round
            await self.redis_state.set_bracket_round(new_round, participants.copy())
            
            # Create games for this round
            games = []
            remaining_players = participants.copy()
            
            # Pair players for games
            while len(remaining_players) >= 2:
                player_1 = remaining_players.pop(0)
                player_2 = remaining_players.pop(0)
                
                # Create game
                await self._create_game(player_1, player_2)
                games.append({'player_1': player_1, 'player_2': player_2})
            
            # Handle odd player (bye)
            if remaining_players:
                bye_player = remaining_players[0]
                tournament_id = await self.get_tournament_id()
                logger.info(f"Player {bye_player} gets a bye in round {new_round}")
                # Automatically advance bye player
                await self.register_game_result(None, bye_player, None, auto_advance=True)
            
            tournament_id = await self.get_tournament_id()
            logger.info(f"Round {new_round} started in tournament {tournament_id}")
            logger.info(f"Participants: {participants}")
            logger.info(f"Games created: {len(games)}")
            
            # Broadcast round start to all players
            await self._broadcast_round_start(games)
            
            return {'type': 'success', 'success': f'Round {new_round} started'}
            
        finally:
            await self.redis_state.manager._release_lock(self.redis_state.tournament_id)
    
    async def register_game_result(self, game_id: int, winner: int, loser: int, auto_advance: bool = False) -> Dict[str, Any]:
        """Register the result of a tournament game - maintains original API signature"""
        # Convert parameters to proper types for backward compatibility
        game_id = str(game_id) if game_id is not None else None
        winner = str(winner) if winner is not None else None
        loser = str(loser) if loser is not None else None
        
        # Acquire lock for game result processing
        if not await self.redis_state.manager._acquire_lock(self.redis_state.tournament_id):
            return {'type': 'error', 'error': 'Tournament is currently being modified'}
        
        try:
            tournament_id = await self.get_tournament_id()
            active_games = await self.redis_state.get_active_games()
            logger.info(f"Registering game result in tournament {tournament_id}. Game: {game_id}, Winner: {winner}, Loser: {loser}")
            logger.info(f"Active games: {list(active_games.keys())}")
            
            # Handle bye advancement
            if auto_advance:
                logger.info(f"Auto-advancing {winner} (bye) in tournament {tournament_id}")
                next_round_players = await self.redis_state.get_next_round_players()
                if int(winner) not in next_round_players:
                    await self.redis_state.add_next_round_player(int(winner))
                    logger.info(f"Bye player {winner} added to next round")
                await self._check_round_completion()
                return {'type': 'success', 'success': f'{winner} advanced (bye)'}
            
            # Check if this game belongs to the tournament
            if int(game_id) not in active_games:
                logger.warning(f"Game {game_id} not found in tournament {tournament_id} active games: {list(active_games.keys())}")
                return {'type': 'error', 'error': 'Game not found in tournament'}
            
            # Remove the completed game
            game_info = await self.redis_state.remove_active_game(int(game_id))
            logger.info(f"Game {game_id} completed in tournament {tournament_id}: {winner} beat {loser}")
            
            # Add winner to next round
            next_round_players = await self.redis_state.get_next_round_players()
            if int(winner) not in next_round_players:
                await self.redis_state.add_next_round_player(int(winner))
                logger.info(f"Winner {winner} added to next round")
            
            # Remove loser from next round if present
            try:
                await self.redis_state.remove_next_round_player(int(loser))
                logger.info(f"Loser {loser} removed from next round")
            except:
                logger.info(f"Loser {loser} was not in next round (eliminated)")
            
            # Check if round is complete
            remaining_active_games = await self.redis_state.get_active_games()
            logger.info(f"Checking round completion. Active games remaining: {len(remaining_active_games)}")
            await self._check_round_completion()
            
            return {'type': 'success', 'success': f'Result registered: {winner} beats {loser}'}
            
        finally:
            await self.redis_state.manager._release_lock(self.redis_state.tournament_id)
    
    async def _check_round_completion(self):
        """Check if current round is complete and handle progression"""
        tournament_id = await self.get_tournament_id()
        logger.info(f"DEBUG: _check_round_completion called for tournament {tournament_id}")
        
        # Check for expired games first
        expired = await self.redis_state.manager.cleanup_expired_games(tournament_id)
        if expired:
            logger.warning(f"Active games for tournament {tournament_id} have expired due to TTL")
            # End tournament due to timeout
            await self.redis_state._update_data({
                'status': 'completed',
                'is_complete': True,
                'completion_time': datetime.now().isoformat()
            })
            await self._update_tournament_in_db()
            await self._broadcast_tournament_complete()
            return

        # Round is complete when no more active games
        active_games = await self.redis_state.get_active_games()
        logger.info(f"DEBUG: Retrieved active games: {list(active_games.keys()) if active_games else 'None'}")
        logger.info(f"DEBUG: Active games count: {len(active_games)}")
        
        if len(active_games) == 0:
            current_round = await self.get_current_round()
            next_round_players = await self.redis_state.get_next_round_players()
            
            logger.info(f"Round {current_round} completed in tournament {tournament_id}")
            logger.info(f"Winners advancing to next round: {next_round_players}")
            
            # Check if tournament is complete
            if len(next_round_players) <= 1:
                logger.info(f"Tournament {tournament_id} completed!")
                if next_round_players:
                    winner = next_round_players[0]
                    logger.info(f"Tournament winner: {winner}")
                else:
                    logger.error(f"Tournament {tournament_id} completed but no winner found!")
                    winner = None
                
                # Mark tournament as complete
                await self.redis_state._update_data({
                    'status': 'completed',
                    'is_complete': True,
                    'completion_time': datetime.now().isoformat(),
                    'winner': winner
                })
                
                # Update database BEFORE broadcasting
                logger.info(f"DEBUG: Updating database for completed tournament {tournament_id}")
                await self._update_tournament_in_db()
                
                # Broadcast completion
                await self._broadcast_tournament_complete(winner)
                return
            
            # Broadcast round end
            await self._broadcast_round_end()
            
            # Schedule next round (wait a bit for clients to process round end)
            await asyncio.sleep(3)
            logger.info(f"Scheduling next round for tournament {tournament_id}")
            await self.start_round()
        else:
            current_round = await self.get_current_round()
            next_round_players = await self.redis_state.get_next_round_players()
            
            logger.info(f"Round {current_round} still active. Games remaining: {len(active_games)}")
            logger.info(f"Active games: {list(active_games.keys())}")
            logger.info(f"Current next_round: {next_round_players}")
            
            # Check if games are taking too long and extend TTL if needed
            round_start_data = await self.redis_state._get_data()
            round_start_time_str = round_start_data.get('round_start_time')
            if round_start_time_str:
                try:
                    round_start_time = datetime.fromisoformat(round_start_time_str)
                    if datetime.now() - round_start_time > timedelta(minutes=4):  # 4 minutes into round
                        logger.info(f"Round has been active for >4 minutes, extending game TTL for tournament {tournament_id}")
                        await self.redis_state.manager.extend_game_ttl(tournament_id, 300)  # Extend by 5 more minutes
                except Exception as e:
                    logger.warning(f"Failed to parse round start time or extend TTL: {e}")
    
    async def handle_round_timeout(self):
        """Handle round timeout by checking connections and advancing players"""
        tournament_id = await self.get_tournament_id()
        logger.warning(f"Handling round timeout for tournament {tournament_id}")
        
        # Get incomplete games and resolve them
        active_games = await self.redis_state.get_active_games()
        
        for game_id, game_info in active_games.items():
            player_1 = game_info['player_1']
            player_2 = game_info['player_2']
            
            # Check player connections (simplified)
            player_1_connected = await self._check_player_connection(player_1)
            player_2_connected = await self._check_player_connection(player_2)
            
            if player_1_connected and not player_2_connected:
                winner = player_1
            elif player_2_connected and not player_1_connected:
                winner = player_2
            else:
                # Both connected or both disconnected - random choice
                winner = random.choice([player_1, player_2])
            
            logger.info(f"Timeout resolution: {winner} advances (connection check)")
            await self.register_game_result(game_id, winner, None, auto_advance=True)
    
    async def _check_player_connection(self, player_id: int) -> bool:
        """Check if player is connected (simplified implementation)"""
        # In a real implementation, you'd check WebSocket connections in channel layer
        return True
    
    async def _create_game(self, player_1: int, player_2: int):
        """Create a game between two players"""
        try:
            from .models import Tournament, UserProfile, Game
            
            # Get the players and tournament
            player_1_obj = await database_sync_to_async(UserProfile.objects.get)(user_id=player_1)
            player_2_obj = await database_sync_to_async(UserProfile.objects.get)(user_id=player_2)
            tournament_obj = await database_sync_to_async(Tournament.objects.get)(id=self.redis_state.tournament_id)
            
            # Create the game
            game = await database_sync_to_async(Game.objects.create)(
                player_1=player_1_obj,
                player_2=player_2_obj,
                tournament_id=tournament_obj
            )
            
            # Store game info in Redis
            game_info = {
                'game_id': game.id,
                'player_1': player_1,
                'player_2': player_2,
                'created_at': datetime.now().isoformat(),
                'tournament_id': self.redis_state.tournament_id
            }
            
            await self.redis_state.add_active_game(game.id, game_info)
            
            # Broadcast game creation to tournament players
            channel_layer = get_channel_layer()
            if channel_layer:
                await channel_layer.group_send(
                    f'tournament_{self.redis_state.tournament_id}',
                    {
                        'type': 'create_game',
                        'game_id': game.id,
                        'player_1': player_1,
                        'player_2': player_2,
                        'tournament_id': self.redis_state.tournament_id
                    }
                )
                logger.info(f"Game {game.id} created for tournament {self.redis_state.tournament_id}: {player_1} vs {player_2}")
        
        except Exception as e:
            logger.error(f"Error creating game for tournament: {e}", exc_info=True)
    
    async def _broadcast_round_start(self, games: List[Dict]):
        """Broadcast round start to all tournament players"""
        channel_layer = get_channel_layer()
        if channel_layer:
            current_round = await self.get_current_round()
            await channel_layer.group_send(
                f'tournament_{self.redis_state.tournament_id}',
                {
                    'type': 'tournament_start_round',
                    'message': f'Round {current_round} has started!',
                    'round_data': {
                        'round_number': current_round,
                        'games_count': len(games)
                    },
                    'games': games
                }
            )
    
    async def _broadcast_round_end(self):
        """Broadcast round end to all tournament players"""
        channel_layer = get_channel_layer()
        if channel_layer:
            current_round = await self.get_current_round()
            next_round_players = await self.redis_state.get_next_round_players()
            await channel_layer.group_send(
                f'tournament_{self.redis_state.tournament_id}',
                {
                    'type': 'tournament_round_end',
                    'message': f'Round {current_round} has ended!',
                    'round_data': {
                        'round_number': current_round,
                        'winners': next_round_players,
                        'players_advancing': len(next_round_players)
                    }
                }
            )
    
    async def _broadcast_tournament_complete(self, winner=None):
        """Broadcast tournament completion"""
        tournament_winner = winner or await self.get_winner()
        channel_layer = get_channel_layer()
        if channel_layer:
            tournament_id = await self.get_tournament_id()
            name = await self.redis_state.get_name()
            current_round = await self.get_current_round()
            nbr_player = await self.get_nbr_player()
            
            await channel_layer.group_send(
                f'tournament_{tournament_id}',
                {
                    'type': 'tournament_complete',
                    'message': f'Tournament completed!',
                    'winner': tournament_winner,
                    'tournament_data': {
                        'tournament_id': tournament_id,
                        'name': name,
                        'total_rounds': current_round,
                        'total_players': nbr_player
                    }
                }
            )
    
    async def _update_tournament_in_db(self):
        """Update tournament status in database"""
        try:
            from .models import Tournament, UserProfile
            
            tournament_id = await self.get_tournament_id()
            logger.info(f"DEBUG: Updating tournament {tournament_id} in database")
            
            tournament_obj = await database_sync_to_async(Tournament.objects.get)(id=self.redis_state.tournament_id)
            
            # Update tournament status
            status = await self.get_status()
            winner_id = await self.get_winner()
            
            logger.info(f"DEBUG: Tournament {tournament_id} - status: {status}, winner_id: {winner_id}")
            
            tournament_obj.status = status
            if winner_id:
                try:
                    winner_obj = await database_sync_to_async(UserProfile.objects.get)(user_id=winner_id)
                    tournament_obj.winner = winner_obj
                    logger.info(f"DEBUG: Set winner {winner_id} for tournament {tournament_id}")
                except Exception as e:
                    logger.error(f"Failed to get winner UserProfile {winner_id}: {e}")
                    logger.warning(f"Failed to set winner {winner_id} in database")
            
            await database_sync_to_async(tournament_obj.save)()
            
            logger.info(f"Tournament {tournament_id} updated in database: status={status}, winner={winner_id}")
            
        except Exception as e:
            tournament_id = await self.get_tournament_id()
            logger.error(f"Failed to update tournament {tournament_id} in database: {e}", exc_info=True)
    
    async def _update_tournament_status_in_db(self, status: str):
        """Update tournament status in database"""
        try:
            from .models import Tournament
            
            tournament_obj = await database_sync_to_async(Tournament.objects.get)(id=self.redis_state.tournament_id)
            tournament_obj.status = status
            await database_sync_to_async(tournament_obj.save)()
            
            tournament_id = await self.get_tournament_id()
            logger.info(f"Tournament {tournament_id} status updated to {status} in database")
            
        except Exception as e:
            tournament_id = await self.get_tournament_id()
            logger.error(f"Failed to update tournament {tournament_id} status in database: {e}")
    
    async def get_brackets(self) -> Dict[str, Any]:
        """Get tournament brackets data for frontend"""
        # Get active games in serializable format
        active_games = await self.redis_state.get_active_games()
        active_games_serializable = []
        for game_info in active_games.values():
            serializable_game = game_info.copy()
            # Convert datetime to string if needed
            if 'created_at' in serializable_game and isinstance(serializable_game['created_at'], datetime):
                serializable_game['created_at'] = serializable_game['created_at'].isoformat()
            active_games_serializable.append(serializable_game)
        
        # Get brackets
        brackets = await self.redis_state.get_brackets()
        
        # Get other data
        tournament_id = await self.get_tournament_id()
        name = await self.redis_state.get_name()
        max_p = await self.redis_state.get_max_p()
        nbr_player = await self.get_nbr_player()
        creator_id = await self.redis_state.get_creator_id()
        players = await self.get_players()
        current_round = await self.get_current_round()
        is_round_active = await self.get_is_round_active()
        initialized = await self.get_initialized()
        is_complete = await self.get_is_complete()
        winner = await self.get_winner()
        next_round_players = await self.redis_state.get_next_round_players()
        
        # Get timing data
        data = await self.redis_state._get_data()
        round_start_time = data.get('round_start_time')
        completion_time = data.get('completion_time')
        
        return {
            'tournament_id': tournament_id,
            'name': name,
            'max_partecipants': max_p,
            'current_partecipants': nbr_player,
            'creator_id': creator_id,
            'players': players,
            'current_round': current_round,
            'is_round_active': is_round_active,
            'initialized': initialized,
            'is_complete': is_complete,
            'winner': winner,
            'brackets': brackets,
            'active_games': active_games_serializable,
            'next_round_players': next_round_players,
            'round_start_time': round_start_time,
            'completion_time': completion_time
        }


# Global Redis-backed tournament manager instance
redis_backed_tournament_manager = RedisBackedTournamentManager()
