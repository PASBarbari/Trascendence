import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from datetime import datetime, timedelta

logger = logging.getLogger('pong_app')

class TournamentManager:
    """
    Async tournament manager using asyncio tasks for auto-round progression
    """
    
    def __init__(self):
        self.active_tournaments: Dict[int, 'TournamentState'] = {}
        self.tournament_tasks: Dict[int, asyncio.Task] = {}
        self.channel_layer = get_channel_layer()
    
    async def create_tournament(self, tournament_id: int, name: str, max_players: int, creator_id: int) -> 'TournamentState':
        """Create a new tournament and start its management task"""
        tournament = TournamentState(
            tournament_id=tournament_id,
            name=name,
            max_p=max_players,
            creator_id=creator_id,
            manager=self
        )
        
        self.active_tournaments[tournament_id] = tournament
        
        # Start the tournament management task
        task = asyncio.create_task(self._manage_tournament(tournament))
        self.tournament_tasks[tournament_id] = task
        
        logger.info(f"Tournament {tournament_id} created and management task started")
        return tournament
    
    async def get_tournament(self, tournament_id: int) -> Optional['TournamentState']:
        """Get tournament by ID"""
        return self.active_tournaments.get(tournament_id)
    
    async def remove_tournament(self, tournament_id: int):
        """Remove tournament and cancel its management task"""
        if tournament_id in self.tournament_tasks:
            self.tournament_tasks[tournament_id].cancel()
            del self.tournament_tasks[tournament_id]
        
        if tournament_id in self.active_tournaments:
            del self.active_tournaments[tournament_id]
        
        logger.info(f"Tournament {tournament_id} removed and task cancelled")
    
    async def _manage_tournament(self, tournament: 'TournamentState'):
        """Main tournament management loop"""
        try:
            logger.info(f"Starting tournament management for {tournament.tournament_id}")
            
            # Wait for tournament to be initialized (brackets created)
            while not tournament.initialized:
                await asyncio.sleep(1)
            
            logger.info(f"Tournament {tournament.tournament_id} initialized, starting auto-round progression")
            
            # Auto-start rounds until tournament is complete
            while not tournament.is_complete:
                if tournament.can_start_next_round():
                    await tournament.start_round()
                    
                    # Wait for round to complete (with timeout)
                    await self._wait_for_round_completion(tournament)
                else:
                    # Wait a bit before checking again
                    await asyncio.sleep(2)
            
            logger.info(f"Tournament {tournament.tournament_id} completed!")
            
        except asyncio.CancelledError:
            logger.info(f"Tournament {tournament.tournament_id} management cancelled")
        except Exception as e:
            logger.error(f"Error in tournament {tournament.tournament_id} management: {e}", exc_info=True)
    
    async def _wait_for_round_completion(self, tournament: 'TournamentState'):
        """Wait for round to complete with timeout handling"""
        round_timeout = 300  # 5 minutes per round
        start_time = datetime.now()
        
        while tournament.is_round_active and not tournament.is_complete:
            # Check if round timeout exceeded
            if datetime.now() - start_time > timedelta(seconds=round_timeout):
                logger.warning(f"Round timeout in tournament {tournament.tournament_id}")
                await tournament.handle_round_timeout()
                break
            
            await asyncio.sleep(5)  # Check every 5 seconds


class TournamentState:
    """
    Enhanced tournament state with asyncio task integration
    """
    
    def __init__(self, tournament_id: int, name: str, max_p: int, creator_id: int, manager: TournamentManager = None):
        self.tournament_id = tournament_id
        self.name = name
        self.max_p = max_p
        self.creator_id = creator_id
        self.manager = manager
        
        # Tournament state
        self.players: List[int] = []
        self.nbr_player = 0
        self.initialized = False
        self.is_complete = False
        
        # Round management
        self.current_round = 0
        self.is_round_active = False
        self.partecipants: List[int] = []
        self.next_round: List[int] = []
        self.active_games: Dict[int, Dict] = {}  # game_id -> game_info
        self.round_start_time: Optional[datetime] = None
        
        # Tournament structure
        self.brackets: Dict[int, List[int]] = {}  # round -> [players]
        self.winner: Optional[int] = None
        
        logger.info(f"TournamentState created: {name} (ID: {tournament_id})")
    
    def add_player(self, user_dict: Dict[str, Any]) -> str:
        """Add player to tournament"""
        player_id = user_dict['user_id']
        
        if self.initialized:
            return "Tournament has already started"
        
        if self.nbr_player >= self.max_p:
            return "Tournament is full"
        
        if player_id in self.players:
            return "Player already in tournament"
        
        self.players.append(player_id)
        self.nbr_player += 1
        
        logger.info(f"Player {player_id} added to tournament {self.tournament_id}. Players: {self.nbr_player}/{self.max_p}")
        return "Player added to the tournament"
    
    def start(self) -> Dict[str, Any]:
        """Initialize tournament brackets"""
        if self.initialized:
            return {'type': 'error', 'error': 'Tournament already initialized'}
        
        if self.nbr_player < 2:
            return {'type': 'error', 'error': 'Need at least 2 players to start tournament'}
        
        # Initialize brackets
        self.partecipants = self.players.copy()
        self.next_round = self.players.copy()
        self.current_round = 0
        self.initialized = True
        
        # Create initial bracket structure
        self.brackets[0] = self.players.copy()
        
        logger.info(f"Tournament {self.tournament_id} initialized with {self.nbr_player} players")
        return {'type': 'success', 'success': 'Tournament initialized successfully'}
    
    def can_start_next_round(self) -> bool:
        """Check if next round can be started"""
        if not self.initialized or self.is_complete or self.is_round_active:
            return False
        
        # Check if we have players for next round
        if len(self.next_round) < 2:
            return False
        
        # If only one player left, tournament is complete
        if len(self.next_round) == 1:
            self.winner = self.next_round[0]
            self.is_complete = True
            return False
        
        return True
    
    async def start_round(self) -> Dict[str, Any]:
        """Start the next tournament round (auto-called by manager)"""
        if not self.can_start_next_round():
            return {'type': 'error', 'error': 'Cannot start round'}
        
        self.current_round += 1
        self.is_round_active = True
        self.round_start_time = datetime.now()
        self.partecipants = self.next_round.copy()
        
        # Create bracket for this round
        self.brackets[self.current_round] = self.partecipants.copy()
        
        # Create games for this round
        games = []
        remaining_players = self.partecipants.copy()
        
        # Pair players for games
        while len(remaining_players) >= 2:
            player_1 = remaining_players.pop(0)
            player_2 = remaining_players.pop(0)
            
            # Send game creation message
            await self._create_game(player_1, player_2)
            games.append({'player_1': player_1, 'player_2': player_2})
        
        # Handle odd player (bye)
        if remaining_players:
            bye_player = remaining_players[0]
            logger.info(f"Player {bye_player} gets a bye in round {self.current_round}")
            # Automatically advance bye player
            await self.register_game_result(None, bye_player, None, auto_advance=True)
        
        logger.info(f"Round {self.current_round} started in tournament {self.tournament_id} with {len(games)} games")
        
        # Broadcast round start to all players
        await self._broadcast_round_start(games)
        
        return {'type': 'success', 'success': f'Round {self.current_round} started'}
    
    async def register_game_result(self, game_id: Optional[int], winner_id: int, loser_id: Optional[int], auto_advance: bool = False):
        """Register game completion and advance winner"""
        if not auto_advance:
            logger.info(f"Game {game_id} completed: {winner_id} defeats {loser_id}")
            # Remove game from active games
            if game_id in self.active_games:
                del self.active_games[game_id]
        else:
            logger.info(f"Player {winner_id} auto-advanced (bye or timeout)")
        
        # Add winner to next round
        if winner_id not in self.next_round:
            self.next_round.append(winner_id)
        
        # Check if round is complete
        expected_winners = (len(self.partecipants) + 1) // 2  # Account for byes
        if len(self.next_round) >= expected_winners:
            await self._complete_round()
    
    async def _complete_round(self):
        """Complete the current round"""
        self.is_round_active = False
        
        logger.info(f"Round {self.current_round} completed in tournament {self.tournament_id}")
        logger.info(f"Winners advancing: {self.next_round}")
        
        # Check if tournament is complete
        if len(self.next_round) == 1:
            self.winner = self.next_round[0]
            self.is_complete = True
            await self._broadcast_tournament_complete()
        else:
            # Prepare for next round
            self.partecipants = []  # Clear current round participants
            await self._broadcast_round_complete()
    
    async def handle_round_timeout(self):
        """Handle round timeout by checking connections and advancing players"""
        logger.warning(f"Handling round timeout for tournament {self.tournament_id}")
        
        # Check for incomplete games and resolve them
        unfinished_games = list(self.active_games.values())
        
        for game_info in unfinished_games:
            player_1 = game_info['player_1']
            player_2 = game_info['player_2']
            
            # Check player connections (simplified - in real implementation, check WebSocket connections)
            player_1_connected = await self._check_player_connection(player_1)
            player_2_connected = await self._check_player_connection(player_2)
            
            if player_1_connected and not player_2_connected:
                winner = player_1
            elif player_2_connected and not player_1_connected:
                winner = player_2
            else:
                # Both connected or both disconnected - random choice
                import random
                winner = random.choice([player_1, player_2])
            
            logger.info(f"Timeout resolution: {winner} advances (connection check)")
            await self.register_game_result(game_info['game_id'], winner, None, auto_advance=True)
    
    async def _check_player_connection(self, player_id: int) -> bool:
        """Check if player is connected (simplified implementation)"""
        # In a real implementation, you'd check WebSocket connections in channel layer
        # For now, return True (assume connected)
        return True
    
    async def _create_game(self, player_1: int, player_2: int):
        """Create a game between two players"""
        try:
            from .models import Tournament, UserProfile, Game
            
            # Get the players and tournament
            player_1_obj = await database_sync_to_async(UserProfile.objects.get)(user_id=player_1)
            player_2_obj = await database_sync_to_async(UserProfile.objects.get)(user_id=player_2)
            tournament_obj = await database_sync_to_async(Tournament.objects.get)(id=self.tournament_id)
            
            # Create the game
            game = await database_sync_to_async(Game.objects.create)(
                player_1=player_1_obj,
                player_2=player_2_obj,
                tournament_id=tournament_obj
            )
            
            # Store game info
            self.active_games[game.id] = {
                'game_id': game.id,
                'player_1': player_1,
                'player_2': player_2,
                'created_at': datetime.now()
            }
            
            # Broadcast game creation to tournament players
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                f'tournament_{self.tournament_id}',
                {
                    'type': 'create_game',
                    'player_1': player_1,
                    'player_2': player_2,
                    'tournament_id': self.tournament_id
                }
            )
            
            logger.info(f"Game {game.id} created for tournament {self.tournament_id}: {player_1} vs {player_2}")
            
        except Exception as e:
            logger.error(f"Error creating game for tournament: {e}", exc_info=True)
    
    async def _broadcast_round_start(self, games: List[Dict]):
        """Broadcast round start to all tournament players"""
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'tournament_{self.tournament_id}',
            {
                'type': 'tournament_start_round',
                'message': f'Round {self.current_round} has started!',
                'round_data': {
                    'round_number': self.current_round,
                    'games_count': len(games)
                },
                'games': games
            }
        )
    
    async def _broadcast_round_complete(self):
        """Broadcast round completion to all tournament players"""
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'tournament_{self.tournament_id}',
            {
                'type': 'tournament_end_round',
                'message': f'Round {self.current_round} completed!',
                'results': {
                    'round': self.current_round,
                    'winners': self.next_round
                },
                'next_round_info': {
                    'players_advancing': len(self.next_round),
                    'next_round_number': self.current_round + 1
                }
            }
        )
    
    async def _broadcast_tournament_complete(self):
        """Broadcast tournament completion"""
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'tournament_{self.tournament_id}',
            {
                'type': 'tournament_complete',
                'message': f'Tournament completed!',
                'winner': self.winner,
                'tournament_data': {
                    'tournament_id': self.tournament_id,
                    'name': self.name,
                    'total_rounds': self.current_round,
                    'total_players': self.nbr_player
                }
            }
        )
    
    def get_brackets(self) -> Dict[str, Any]:
        """Get tournament brackets data for frontend"""
        return {
            'tournament_id': self.tournament_id,
            'name': self.name,
            'max_partecipants': self.max_p,
            'current_partecipants': self.nbr_player,
            'creator_id': self.creator_id,
            'players': self.players,
            'current_round': self.current_round,
            'is_round_active': self.is_round_active,
            'initialized': self.initialized,
            'is_complete': self.is_complete,
            'winner': self.winner,
            'brackets': self.brackets,
            'active_games': list(self.active_games.values()),
            'next_round_players': self.next_round,
            'round_start_time': self.round_start_time.isoformat() if self.round_start_time else None
        }


# Global tournament manager instance
tournament_manager = TournamentManager()
