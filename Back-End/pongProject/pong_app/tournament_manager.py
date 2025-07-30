import asyncio
import logging
import random
from sre_constants import SUCCESS
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
				"""Get tournament by ID, loading from database if not in memory"""
				tournament = self.active_tournaments.get(tournament_id)
				logger.info(f"Fetching tournament {tournament_id} from active tournaments: {self.active_tournaments.keys()}")
				if not tournament:
						# Try to load from database
						try:
								from .models import Tournament
								tournament_db = await database_sync_to_async(Tournament.objects.get)(id=tournament_id)
								
								# Create tournament state from database
								tournament = TournamentState(
										tournament_id=tournament_id,
										name=tournament_db.name,
										max_p=tournament_db.max_partecipants,
										creator_id=await database_sync_to_async(lambda: tournament_db.creator.user_id if tournament_db.creator else None)(),
										manager=self
								)
								
						except Exception as e:
								logger.warning(f"Failed to load tournament {tournament_id} from database: {e}")
								return None
						try:
								# Load players from database
								success = await database_sync_to_async(tournament.load_players_from_db)()
								
								# Add to active tournaments but don't start management task for completed tournaments
								self.active_tournaments[tournament_id] = tournament
								
								if tournament_db.status != 'completed':
										# Start management task only for active tournaments
										task = asyncio.create_task(self._manage_tournament(tournament))
										self.tournament_tasks[tournament_id] = task
								
								logger.info(f"Tournament {tournament_id} loaded from database with {tournament.nbr_player} players")
								
						except Exception as e:
								logger.warning(f"Failed to load tournament {tournament_id} from database: {e}")
								return None
				
				return tournament
		
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
				round_timeout = 300	# 5 minutes per round
				start_time = datetime.now()
				
				while tournament.is_round_active and not tournament.is_complete:
						# Check if round timeout exceeded
						if datetime.now() - start_time > timedelta(seconds=round_timeout):
								logger.warning(f"Round timeout in tournament {tournament.tournament_id}")
								await tournament.handle_round_timeout()
								break
						
						await asyncio.sleep(5)	# Check every 5 seconds


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
				self.status = 'pending'	# Initialize with pending status
				
				# Round management
				self.current_round = 0
				self.is_round_active = False
				self.partecipants: List[int] = []
				self.next_round: List[int] = []
				self.active_games: Dict[int, Dict] = {}	# game_id -> game_info
				self.round_start_time: Optional[datetime] = None
				
				# Tournament structure
				self.brackets: Dict[int, List[int]] = {}	# round -> [players]
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
		
		def load_players_from_db(self):
				"""Load players from database and sync with in-memory state (sync version)"""
				try:
						from .models import Tournament
						tournament_db = Tournament.objects.get(id=self.tournament_id)
						participants = list(tournament_db.player.all())
						# Update in-memory state
						self.players = [p.user_id for p in participants]
						self.nbr_player = len(self.players)
						# Load tournament status and other fields
						self.status = tournament_db.status
						if tournament_db.winner:
								self.winner = tournament_db.winner.user_id
								self.is_complete = True
						# Set initialized flag based on status
						if self.status in ['active', 'completed']:
								self.initialized = True
						logger.info(f"Loaded tournament {self.tournament_id} from database: {self.nbr_player} players, status: {self.status}")
						return True
				except Exception as e:
						logger.error(f"Failed to load players from database for tournament {self.tournament_id}: {e}")
						return False
		
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
				self.status = 'active'	# Set tournament status to active
				# Create initial bracket structure
				self.brackets[0] = self.players.copy()
				
				logger.info(f"Tournament {self.tournament_id} initialized with {self.nbr_player} players")
				
				# Update tournament status in database
				asyncio.create_task(self._update_tournament_status_in_db('active'))
				
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
				random.shuffle(self.partecipants)  # Shuffle participants for fair pairing

				# Clear next_round for this round (only winners will be added back)
				self.next_round = []
				
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
				
				logger.info(f"Round {self.current_round} started in tournament {self.tournament_id}")
				logger.info(f"Participants: {self.partecipants}")
				logger.info(f"Games created: {len(games)}")
				logger.info(f"Active games: {list(self.active_games.keys())}")
				
				# Broadcast round start to all players
				await self._broadcast_round_start(games)
				self.is_round_active = True
				return {'type': 'success', 'success': f'Round {self.current_round} started'}
		
		async def register_game_result(self, game_id: str, winner: str, loser: str, auto_advance: bool = False) -> Dict[str, Any]:
				"""Register the result of a tournament game"""
				# if not self.is_round_active:
				# 		logger.warning(f"Attempted to register result for {game_id} but no active round in tournament {self.tournament_id}")
				# 		return {'type': 'error', 'error': 'No active round'}
				logger.info(f"active games: {self.active_games.keys()}")

				# Handle bye advancement
				if auto_advance:
						logger.info(f"Auto-advancing {winner} (bye) in tournament {self.tournament_id}")
						if winner not in self.next_round:
								self.next_round.append(winner)
								logger.info(f"Bye player {winner} added to next round. Current next_round: {self.next_round}")
						await self._check_round_completion()
						return {'type': 'success', 'success': f'{winner} advanced (bye)'}
				
				# Check if this game belongs to the tournament
				if game_id not in self.active_games:
						logger.warning(f"Game {game_id} not found in tournament {self.tournament_id} active games: {list(self.active_games.keys())}")
						return {'type': 'error', 'error': 'Game not found in tournament'}
				
				# Remove the completed game
				game_info = self.active_games.pop(game_id)
				logger.info(f"Game {game_id} completed in tournament {self.tournament_id}: {winner} beat {loser}")
				logger.info(f"Game info: {game_info}")
				logger.info(f"Remaining active games: {list(self.active_games.keys())}")
				
				# In single elimination, only the winner advances
				if winner in self.partecipants:
						if winner not in self.next_round:
								self.next_round.append(winner)
								logger.info(f"Winner {winner} added to next round. Current next_round: {self.next_round}")
								logger.info(f"Loser {loser} eliminated from tournament")
						else:
								logger.warning(f"Winner {winner} already in next round: {self.next_round}")
				else:
						logger.error(f"Winner {winner} not in current participants: {self.partecipants}")
				if loser in self.next_round:
						self.next_round.remove(loser)
						logger.info(f"Loser {loser} removed from next round. Current next_round: {self.next_round}")
				else:
						logger.info(f"Loser {loser} eliminated from tournament")
				# Check if round is complete (all games finished)
				logger.info(f"Checking round completion. Active games remaining: {len(self.active_games)}")
				await self._check_round_completion()
				
				return {'type': 'success', 'success': f'Result registered: {winner} beats {loser}'}
		
		async def _check_round_completion(self):
				"""Check if current round is complete and handle progression"""
				if not self.is_round_active:
						logger.warning(f"_check_round_completion called but no active round in tournament {self.tournament_id}")
						return
				
				# Round is complete when no more active games
				if len(self.active_games) == 0:
						logger.info(f"Round {self.current_round} completed in tournament {self.tournament_id}")
						logger.info(f"Winners advancing to next round: {self.next_round}")
						
						# Mark round as inactive
						self.is_round_active = False
						
						# Check if tournament is complete
						if len(self.next_round) <= 1:
								logger.info(f"Tournament {self.tournament_id} completed!")
								if self.next_round:
										winner = self.next_round[0]
										self.winner = winner	# Set the winner
										logger.info(f"Tournament winner: {winner}")
										await self._broadcast_tournament_complete(winner)
								else:
										logger.error(f"Tournament {self.tournament_id} completed but no winner found!")
								
								# Mark tournament as complete
								self.status = 'completed'
								self.is_complete = True
								self.completion_time = datetime.now()
								
								# Update database
								await self._update_tournament_in_db()
								
								# Tournament is complete, don't schedule next round
								return
						
						# Broadcast round end
						await self._broadcast_round_end()
						
						# Schedule next round (wait a bit for clients to process round end)
						await asyncio.sleep(3)
						logger.info(f"Scheduling next round for tournament {self.tournament_id}")
						await self.start_round()
				else:
						logger.info(f"Round {self.current_round} still active. Games remaining: {len(self.active_games)}")
						logger.info(f"Active games: {list(self.active_games.keys())}")
						logger.info(f"Current next_round: {self.next_round}")
		
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
						self.partecipants = []	# Clear current round participants
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
								'created_at': datetime.now(),
								'tournament_id': self.tournament_id
						}
						
						# Broadcast game creation to tournament players
						channel_layer = get_channel_layer()
						if channel_layer:
							await channel_layer.group_send(
									f'tournament_{self.tournament_id}',
									{
											'type': 'create_game',
											'game_id': game.id,
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
				if channel_layer:
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
				if channel_layer:
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
		
		async def _broadcast_round_end(self):
				"""Broadcast round end to all tournament players"""
				channel_layer = get_channel_layer()
				if channel_layer:
					await channel_layer.group_send(
							f'tournament_{self.tournament_id}',
							{
									'type': 'tournament_round_end',
									'message': f'Round {self.current_round} has ended!',
									'round_data': {
											'round_number': self.current_round,
											'winners': self.next_round,
											'players_advancing': len(self.next_round)
									}
							}
					)
		
		async def _broadcast_tournament_complete(self, winner=None):
				"""Broadcast tournament completion"""
				tournament_winner = winner or self.winner
				channel_layer = get_channel_layer()
				if channel_layer:
					# Notify all players in the tournament group
					await channel_layer.group_send(
							f'tournament_{self.tournament_id}',
							{
									'type': 'tournament_complete',
									'message': f'Tournament completed!',
									'winner': tournament_winner,
									'tournament_data': {
											'tournament_id': self.tournament_id,
											'name': self.name,
											'total_rounds': self.current_round,
											'total_players': self.nbr_player
									}
							}
					)
		
		async def _update_tournament_in_db(self):
				"""Update tournament status in database"""
				try:
						from .models import Tournament
						
						def update_tournament():
								tournament_obj = Tournament.objects.get(id=self.tournament_id)
								tournament_obj.status = self.status
								if hasattr(self, 'winner') and self.winner:
										from .models import UserProfile
										winner_obj = UserProfile.objects.get(user_id=self.winner)
										tournament_obj.winner = winner_obj
								tournament_obj.save()
								return tournament_obj
						
						tournament_obj = await database_sync_to_async(update_tournament)()
						
						# await database_sync_to_async(tournament_obj.save)()
						logger.info(f"Tournament {self.tournament_id} updated in database with status: {self.status}")
						
				except Exception as e:
						logger.error(f"Failed to update tournament {self.tournament_id} in database: {e}")

		async def _update_tournament_status_in_db(self, status: str):
				"""Update tournament status in database"""
				try:
						from .models import Tournament
						
						tournament_obj = await database_sync_to_async(Tournament.objects.get)(id=self.tournament_id)
						tournament_obj.status = status
						await database_sync_to_async(tournament_obj.save)()
						logger.info(f"Tournament {self.tournament_id} status updated to '{status}' in database")
						
				except Exception as e:
						logger.error(f"Failed to update tournament {self.tournament_id} status in database: {e}")
		
		def get_brackets(self) -> Dict[str, Any]:
				"""Get tournament brackets data for frontend"""
				# Convert active games to JSON-serializable format
				active_games_serializable = []
				for game_info in self.active_games.values():
						game_data = game_info.copy()
						# Convert datetime to string if present
						if 'created_at' in game_data and isinstance(game_data['created_at'], datetime):
								game_data['created_at'] = game_data['created_at'].isoformat()
						active_games_serializable.append(game_data)
				
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
						'active_games': active_games_serializable,
						'next_round_players': self.next_round,
						'round_start_time': self.round_start_time.isoformat() if self.round_start_time else None,
						'completion_time': self.completion_time.isoformat() if hasattr(self, 'completion_time') and self.completion_time else None
				}

# Global tournament manager instance
tournament_manager = TournamentManager()
