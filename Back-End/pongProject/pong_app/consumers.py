import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .signals import GameState
from .tournament_manager import tournament_manager
from .models import Game
import logging
from asgiref.sync import sync_to_async

# Get dedicated loggers
logger = logging.getLogger('pong_app')
websocket_logger = logging.getLogger('websockets')

active_games = {}
player_ready = {}

class GameTableConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		websocket_logger.info('New WebSocket connection attempt')
		self.room_id = self.scope['url_route']['kwargs']['room_id']
		self.room_name = f'game_{self.room_id}'
		
		# Check authentication - reject AnonymousUser
		user = self.scope.get('user')
		if not user or not hasattr(user, 'user_id'):
			websocket_logger.warning(f"Unauthenticated WebSocket connection attempt for game {self.room_id}")
			await self.close(code=4001)  # Custom close code for authentication failure
			return
		
		# Store authenticated user info
		self.player_id = user.user_id
		websocket_logger.info(f"Authenticated user {self.player_id} connected to game {self.room_id}")

		# Join room group
		await self.channel_layer.group_add(
			self.room_name,
			self.channel_name
		)
		
		await self.accept()
		logger.info(f"WebSocket connection accepted for game {self.room_id}")
		
		# Send welcome message to confirm successful connection
		await self.send(text_data=json.dumps({
			'type': 'connection_success',
			'message': f'Welcome to game {self.room_id}!',
			'player_id': self.player_id
		}))

	async def disconnect(self, close_code):
		websocket_logger.info(f"WebSocket disconnected: game={self.room_id}, code={close_code}")
		
		# Handle unexpected disconnections
		if self.room_id in active_games:
			# Get the game state
			game_state = active_games[self.room_id]
			
			# Identify disconnected player (you need to store this during connect)
			player = getattr(self, 'player_id', None)
			
			# Send notification to other players
			logger.info(f"Player {player} disconnected unexpectedly from game {self.room_id}")
			await self.channel_layer.group_send(
				self.room_name,  # Use room_name instead of channel_name
				{
					'type': 'quit_game',
					'player': player,
					'message': f'Player disconnected unexpectedly',
					'game_over': True
				}
			)
			
			# Clean up game resources
			game_state.quit_game(player)
			if self.room_id in active_games:
				# Remove game from active games
				del active_games[self.room_id]
			logger.info(f"Game {self.room_id} resources cleaned up after disconnect")
		
		# Leave room group
		await self.channel_layer.group_discard(
			self.room_name,
			self.channel_name
		)

	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
			message_type = data.get('type')
			websocket_logger.debug(f"Received WebSocket message: type={message_type}, game={self.room_id}")
			handler = self.message_handlers.get(message_type, self.default_handler)
			await handler(self, data)
		except json.JSONDecodeError:
			websocket_logger.error(f"Invalid JSON received: {text_data[:100]}")
		except Exception as e:
			websocket_logger.exception(f"Error processing WebSocket message: {str(e)}")

	async def default_handler(self, data):
		websocket_logger.warning(f"Unhandled message type: {data.get('type')}")

	async def chat_message(self, data):
		message = data['message']
		logger.debug(f"Chat message in game {self.room_id}: {message[:30]}...")
		await self.send(text_data=json.dumps({
			'message': message
		}))

	async def player_ready(self, data):
		# Use authenticated user from connection instead of client data
		player = self.player_id
		if self.room_id not in player_ready:
			player_ready[self.room_id] = set()

		player_ready[self.room_id].add(player)
		logger.info(f"Player {player} ready in game {self.room_id}. Ready players: {len(player_ready[self.room_id])}")

		if len(player_ready[self.room_id]) == 2:
			logger.info(f"All players ready in game {self.room_id}, starting game")
			await self.channel_layer.group_send(
				self.room_name,
				{
					'type': 'all_players_ready',
					'message': 'All players are ready!'
				}
			)
			
			try:
				game = await sync_to_async(Game.objects.get)(id=self.room_id)
				data['player1'] = await sync_to_async(lambda: game.player_1)()
				data['player2'] = await sync_to_async(lambda: game.player_2)()
				await self.start_game(data)
			except Exception as e:
				logger.error(f"Error retrieving game data: {str(e)}", exc_info=True)
		else:
			await self.send(text_data=json.dumps({
				'message': 'Waiting for players to be ready...',
				'ready': False
			}))

	async def start_game(self, data):
		if self.room_id in active_games:
			logger.info(f"Game {self.room_id} already started, ignoring start request")
			return

		logger.info(f"Starting game {self.room_id} with players {data}")
		try:
			self.tournament_id = await database_sync_to_async(self.get_tournament_id)()
			del player_ready[self.room_id]
			active_games[self.room_id] = GameState(
				data['player1'], 
				data['player2'], 
				self.room_id, 
				data.get('player_length', 10), 
				tournament_id=self.tournament_id,
			)
			asyncio.create_task(active_games[self.room_id].start())
			logger.info(f"Game {self.room_id} successfully started")
		except Exception as e:
			logger.error(f"Error starting game {self.room_id}: {str(e)}", exc_info=True)

	async def up(self, data):
		try:
			# Use authenticated user from connection instead of client data
			player = self.player_id
			active_games[self.room_id].up(player)
		except KeyError:
			logger.error(f"Game {self.room_id} not found for UP movement")
		except Exception as e:
			logger.error(f"Error in UP movement: {str(e)}")

	async def down(self, data):
		try:
			# Use authenticated user from connection instead of client data
			player = self.player_id
			active_games[self.room_id].down(player)
		except KeyError:
			logger.error(f"Game {self.room_id} not found for DOWN movement")
		except Exception as e:
			logger.error(f"Error in DOWN movement: {str(e)}")

	async def stop(self, data):
		try:
			# Use authenticated user from connection instead of client data
			player = self.player_id
			active_games[self.room_id].stop(player)
			logger.debug(f"Player {player} stopped in game {self.room_id}")
		except KeyError:
			logger.error(f"Game {self.room_id} not found for STOP movement")
		except Exception as e:
			logger.error(f"Error in STOP movement: {str(e)}")

	async def game_init(self, data):
		logger.info(f"Game initialization for {self.room_id}")
		try:
			game_state = active_games[self.room_id]
			game_state.ring_length = data.get('ring_length', 160)
			game_state.ring_height = data.get('ring_height', 90)
			game_state.ring_width = data.get('ring_width', 200)
			game_state.ring_thickness = data.get('ring_thickness', 3)
			game_state.p_length = data.get('p_length', 20)
			game_state.p_width = data.get('p_width', 2.5)
			game_state.p_height = data.get('p_height', 2.5)
			game_state.ball_radius = data.get('ball_radius', 2.5)
			game_state.player_1_pos = data.get('player_1_pos', [-75, 0])
			game_state.player_2_pos = data.get('player_2_pos', [75, 0])
			game_state.ball_pos = data.get('ball_pos', [0, 0])
			game_state.ball_speed = data.get('ball_speed', 1.2)
			game_state.p_speed = data.get('p_speed', 1.5)
			
			# ✅ CRITICAL: Don't call update() immediately to avoid spamming
			# await game_state.update()
			
			# ✅ Use to_dict() method instead of non-existent game_state attribute
			state_dict = game_state.to_dict()
			logger.info(f'Game {self.room_id} initialized with ball_speed: {game_state.ball_speed}')
			logger.debug(f'Game state configuration: {state_dict}')
		except KeyError:
			logger.error(f"Game {self.room_id} not found during initialization")
		except Exception as e:
			logger.error(f"Error during game initialization: {str(e)}", exc_info=True)

	async def game_state(self, data):
		# Avoid excessive logging for high-frequency state updates
		logger.debug(f"Game state update for {self.room_id}")
		await self.send(text_data=json.dumps({
			'type': 'game_state',
			'game_state': data['game_state']
		}))

	async def game_over(self, data):
		logger.info(f"Game over for {self.room_id}")
		
		# Send game over message with results
		await self.send(text_data=json.dumps({
			'type': 'game_over',
			'message': 'Game Over!',
			'game_over': True,
			'winner': data.get('winner'),
			'loser': data.get('loser'),
			'final_scores': data.get('final_scores', {})
		}))
		
		try:
			# Clean up game resources
			if self.room_id in active_games:
				del active_games[self.room_id]
			logger.info(f"Game {self.room_id} resources cleaned up after game over")
		except KeyError:
			logger.warning(f"Game {self.room_id} already removed from active_games")
		
		# Leave the room group to prevent further messages
		try:
			await self.channel_layer.group_discard(
				self.room_name,
				self.channel_name
			)
			logger.info(f"Player left game group {self.room_name} after game over")
		except Exception as e:
			logger.error(f"Error leaving game group: {str(e)}")
		
		# Close the WebSocket connection gracefully after a short delay
		# This gives time for the client to receive the game_over message
		import asyncio
		await asyncio.sleep(1)  # 1 second delay
		await self.close(code=1000)  # Normal closure
		
	async def quit_game(self, data):
		# Use authenticated user from connection instead of client data
		player = self.player_id
		logger.info(f"Player {player} quit game {self.room_id}")
		await self.send(text_data=json.dumps({
			'type': 'quit_game',
			'message': f'Player {player} has quit the game!',
			'game_over': True
		}))
		try:
			if self.room_id in active_games:
				active_games[self.room_id].quit_game(player)
				del active_games[self.room_id]
				logger.info(f"Game {self.room_id} resources cleaned up after player quit")
		except KeyError:
			logger.warning(f"Game {self.room_id} already removed from active_games")
		except Exception as e:
			logger.error(f"Error during game quit: {str(e)}", exc_info=True)
		
		# Leave the room group and close connection after quit
		try:
			await self.channel_layer.group_discard(
				self.room_name,
				self.channel_name
			)
			logger.info(f"Player left game group {self.room_name} after quit")
		except Exception as e:
			logger.error(f"Error leaving game group after quit: {str(e)}")
		
		# Close the WebSocket connection
		import asyncio
		await asyncio.sleep(0.5)  # Brief delay for message delivery
		await self.close(code=1000)  # Normal closure

	async def all_players_ready(self, event):
		"""Handle the all_players_ready group message"""
		logger.info(f"Broadcasting all players ready message for game {self.room_id}")
		await self.send(text_data=json.dumps({
			'type': 'all_players_ready',
			'message': event.get('message', 'All players are ready!'),
			'ready': True
		}))
	def get_tournament_id(self):
		"""Get the tournament ID from the db"""
		if hasattr(self, 'tournament_id'):
			return self.tournament_id
		try:
			from .models import Game
			game = Game.objects.get(id=self.room_id)
			return game.tournament_id
		except Game.DoesNotExist:
			return None
		except Exception as e:
			logger.error(f"Error retrieving tournament ID for game {self.room_id}: {str(e)}")
			return None

	message_handlers = {
		'chat_message': chat_message,
		'player_ready': player_ready,
		'up': up,
		'down': down,
		'stop': stop,
		'game_state': game_state,
		'game_init': game_init,
		'game_over': game_over,
		'quit_game': quit_game,
		'all_players_ready': all_players_ready,
	}

class TournamentConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		self.tournament_id = self.scope['url_route']['kwargs'].get('tournament_id', None)
		self.room_name = f'tournament_{self.tournament_id}'  # Consistent naming
		websocket_logger.info(f"New tournament connection: {self.tournament_id}")

		# Check authentication - reject AnonymousUser
		user = self.scope.get('user')
		if not user or not hasattr(user, 'user_id'):
			websocket_logger.warning(f"Unauthenticated tournament connection attempt for {self.tournament_id}")
			await self.close(code=4001)
			return

		# Store authenticated user info
		self.player_id = user.user_id
		websocket_logger.info(f"Authenticated user {self.player_id} connected to tournament {self.tournament_id}")

		# Join room group
		await self.channel_layer.group_add(
			self.room_name,
			self.channel_name
		)

		await self.accept()
		logger.info(f"Tournament websocket connection accepted: {self.tournament_id}")

		# Send welcome message
		await self.send(text_data=json.dumps({
			'type': 'tournament_connection_success',
			'message': f'Welcome to tournament {self.tournament_id}!',
			'player_id': self.player_id
		}))

		await self.join(data={})

	async def disconnect(self, close_code):
		websocket_logger.info(f"Tournament disconnected: {self.tournament_id}, code={close_code}")
		
		# Leave room group
		await self.channel_layer.group_discard(
			self.room_name,  # Use room_name instead of channel_name
			self.channel_name
		)
		
		# Handle cleanup for tournament resources if needed
		if hasattr(self, 'room_id') and self.room_id in active_games:
			logger.info(f"Cleaning up game resources for tournament {self.tournament_id}")
			active_games[self.room_id].quit_game(getattr(self, 'player_id', None))
			del active_games[self.room_id]

	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
			message_type = data.get('type')
			websocket_logger.debug(f"Received tournament message: type={message_type}, tournament={self.tournament_id}")
			handler = self.message_handlers.get(message_type, self.default_handler)
			await handler(self, data)
		except json.JSONDecodeError:
			websocket_logger.error(f"Invalid JSON received in tournament: {text_data[:100]}")
		except Exception as e:
			websocket_logger.exception(f"Error processing tournament message: {str(e)}")

	async def default_handler(self, data):
		websocket_logger.warning(f"Unhandled tournament message type: {data.get('type')}")

	async def join(self, data):
		"""Simplified join function with clear flow"""
		logger.info(f"Join request for tournament {self.tournament_id} by player {self.player_id}")
		
		try:
			# Step 1: Get or create the tournament
			tournament = await self._get_or_create_tournament(data)
			if not tournament:
				return  # Error already sent
			
			# Step 2: Check if player is already in tournament
			current_players = await tournament.get_players()
			if self.player_id in current_players:
				await self._send_already_joined_response(tournament)
				return
			
			# Step 3: Add player to tournament
			success = await self._add_player_to_tournament(tournament)
			if not success:
				return  # Error already sent
			
			# Step 4: Send success response
			await self._send_join_success_response(tournament)
			
			# Step 5: Check if tournament is full
			await self._check_tournament_full(tournament)
			
		except Exception as e:
			logger.error(f"Error in join for tournament {self.tournament_id}: {str(e)}", exc_info=True)
			await self.send(text_data=json.dumps({
				'type': 'error',
				'error': f'Failed to join tournament: {str(e)}'
			}))

	async def _get_or_create_tournament(self, data):
		"""Get existing tournament or create new one"""
		tournament = await tournament_manager.get_tournament(self.tournament_id)
		
		if tournament:
			logger.info(f"Found existing tournament {self.tournament_id}")
			return tournament
		
		# Tournament doesn't exist in memory, try to load from database
		try:
			from .models import Tournament
			tournament_db = await database_sync_to_async(Tournament.objects.get)(id=self.tournament_id)
			
			# Create tournament manager instance
			tournament = await tournament_manager.create_tournament(
				tournament_id=self.tournament_id,
				name=tournament_db.name,
				max_players=tournament_db.max_partecipants,
				creator_id=await database_sync_to_async(lambda: tournament_db.creator.user_id if tournament_db.creator else None)(),
			)
			
			# Load existing participants from database
			await tournament.load_players_from_db()
			nbr_player = await tournament.get_nbr_player()
			creator_id = await tournament.redis_state.get_creator_id()
			logger.info(f"Loaded tournament {tournament_db.name} from database with {nbr_player} players and creator {creator_id}")
			return tournament
			
		except Exception as db_error:
			logger.warning(f"Failed to load tournament from database: {str(db_error)}")
			
			# Fallback: create new tournament (for cases where tournament doesn't exist in DB yet)
			try:
				name = data.get('name', f'Tournament_{self.tournament_id}')
				max_p = data.get('max_p', 8)
				
				tournament = await tournament_manager.create_tournament(
					tournament_id=self.tournament_id,
					name=name,
					max_players=max_p,
					creator_id=None	# Creator will be set later
				)
				logger.info(f"Created new tournament {name} with creator {self.player_id}")
				return tournament
				
			except Exception as create_error:
				logger.error(f"Failed to create tournament: {str(create_error)}")
				await self.send(text_data=json.dumps({
					'type': 'error',
					'error': f'Failed to create tournament: {str(create_error)}'
				}))
				return None

	async def _send_already_joined_response(self, tournament):
		"""Send response for player already in tournament"""
		logger.info(f"Player {self.player_id} already in tournament {self.tournament_id}")
		
		# Get tournament data using async methods
		name = await tournament.redis_state.get_name()
		nbr_player = await tournament.get_nbr_player()
		max_p = await tournament.redis_state.get_max_p()
		creator_id = await tournament.redis_state.get_creator_id()
		players = await tournament.get_players()
		initialized = await tournament.get_initialized()
		is_complete = await tournament.get_is_complete()
		
		await self.send(text_data=json.dumps({
			'type': 'success',
			'success': f'Welcome back to tournament {name}',
			'already_joined': True,
			'tournament_data': {
				'name': name,
				'current_players': nbr_player,
				'max_players': max_p,
				'creator_id': creator_id,
				'players': players,
				'initialized': initialized,
				'is_complete': is_complete
			}
		}))

	async def _add_player_to_tournament(self, tournament):
		"""Add player to tournament and database"""
		user = self.scope.get('user')
		user_dict = {
			'user_id': self.player_id,
			'username': getattr(user, 'username', f'User_{self.player_id}')
		}
		
		# Add to tournament memory
		result = await tournament.add_player(user_dict)
		if result != "Player added to the tournament":
			logger.warning(f"Failed to add player {self.player_id} to tournament: {result}")
			await self.send(text_data=json.dumps({
				'type': 'error',
				'error': result
			}))
			return False
		
		# Add to database
		try:
			from .models import Tournament, UserProfile
			tournament_db = await database_sync_to_async(Tournament.objects.get)(id=self.tournament_id)
			user_profile_result = await database_sync_to_async(UserProfile.objects.get_or_create)(
				user_id=self.player_id,
				defaults={
					'username': getattr(user, 'username', f'User_{self.player_id}'),
					'email': f'user_{self.player_id}@example.com'
				}
			)
			user_profile = user_profile_result[0]
			await database_sync_to_async(user_profile.tournaments.add)(tournament_db)
			tournament_db.partecipants = await tournament.get_nbr_player()
			await database_sync_to_async(tournament_db.save)()
			logger.info(f"Player {self.player_id} added to tournament {self.tournament_id} in database")
			
		except Exception as db_error:
			logger.error(f"Failed to add player to database: {str(db_error)}")
			# Continue anyway, memory state is correct
		
		return True

	async def _send_join_success_response(self, tournament):
		"""Send success response for joining tournament"""
		# Get tournament data using async methods
		name = await tournament.redis_state.get_name()
		nbr_player = await tournament.get_nbr_player()
		max_p = await tournament.redis_state.get_max_p()
		creator_id = await tournament.redis_state.get_creator_id()
		players = await tournament.get_players()
		initialized = await tournament.get_initialized()
		is_complete = await tournament.get_is_complete()
		
		await self.send(text_data=json.dumps({
			'type': 'success',
			'success': f'Successfully joined tournament {name}',
			'newly_joined': True,
			'tournament_data': {
				'name': name,
				'current_players': nbr_player,
				'max_players': max_p,
				'creator_id': creator_id,
				'players': players,
				'initialized': initialized,
				'is_complete': is_complete
			}
		}))

	async def _check_tournament_full(self, tournament):
		"""Check if tournament is full and notify if ready to start"""
		nbr_player = await tournament.get_nbr_player()
		max_p = await tournament.redis_state.get_max_p()
		
		if nbr_player >= max_p:
			logger.info(f"Tournament {self.tournament_id} is full with {nbr_player} players")
			players = await tournament.get_players()
			
			await self.channel_layer.group_send(
				self.room_name,
				{
					'type': 'tournament_auto_start',
					'message': 'Tournament is full! Creator can now start the tournament.',
					'tournament_data': {
						'players': players,
						'max_players': max_p,
						'ready_to_start': True
					}
				}
			)

	async def get_ready(self, data):
		"""Message handler for preparing all players for next round"""
		logger.info(f"Get ready message for tournament {self.tournament_id}")
		
		# Use authenticated user from connection
		player_id = self.player_id
		
		try:
			tournament = await tournament_manager.get_tournament(self.tournament_id)
			if tournament:
				# Broadcast get ready message to all tournament partecipants
				await self.channel_layer.group_send(
					self.room_name,  # Use room_name instead of channel_name
					{
						'type': 'tournament_get_ready',
						'message': 'Get ready for the next round!',
						'round_info': data.get('round_info', {}),
						'sender': player_id
					}
				)
				
				logger.info(f"Get ready message sent to all players in tournament {self.tournament_id}")
			else:
				await self.send(text_data=json.dumps({
					'type': 'error',
					'error': 'Tournament not found'
				}))
		except Exception as e:
			logger.error(f"Error in get_ready: {str(e)}", exc_info=True)
			await self.send(text_data=json.dumps({
				'type': 'error',
				'error': f'Error preparing round: {str(e)}'
			}))

	async def start_tournament(self, data):
		"""Message handler for creator to initialize tournament brackets"""
		logger.info(f"Start tournament request for tournament {self.tournament_id}")
		
		# Use authenticated user from connection
		player_id = self.player_id
		
		try:
			tournament = await tournament_manager.get_tournament(self.tournament_id)
			if tournament:
				# Check if this player is the tournament creator
				creator_id = await tournament.redis_state.get_creator_id()
				if creator_id == player_id:
					# Call the tournament's start method to initialize brackets
					result = await tournament.start()
					
					if result['type'] == 'success':
						logger.info(f"Tournament initialized successfully by creator {player_id} in tournament {self.tournament_id}")
						
						# Get tournament data for notification
						players = await tournament.get_players()
						max_p = await tournament.redis_state.get_max_p()
						
						# Notify all players that tournament has been initialized
						await self.channel_layer.group_send(
							self.room_name,
							{
								'type': 'tournament_initialized',
								'message': 'Tournament brackets have been initialized! Rounds will start automatically.',
								'tournament_data': {
									'players': players,
									'max_players': max_p,
									'initialized': True,
									'auto_rounds': True
								}
							}
						)
						
						await self.send(text_data=json.dumps({
							'type': 'success',
							'success': result['success']
						}))
					else:
						await self.send(text_data=json.dumps({
							'type': 'error',
							'error': result['error']
						}))
				else:
					await self.send(text_data=json.dumps({
						'type': 'error',
						'error': 'Only tournament creator can start the tournament'
					}))
			else:
				await self.send(text_data=json.dumps({
					'type': 'error',
					'error': 'Tournament not found'
				}))
		except Exception as e:
			logger.error(f"Error in start_tournament: {str(e)}", exc_info=True)
			await self.send(text_data=json.dumps({
				'type': 'error',
				'error': f'Error starting tournament: {str(e)}'
			}))

	async def start_round(self, data):
		"""Message handler for creator to start tournament round (legacy - now auto-started)"""
		logger.info(f"Manual start round request for tournament {self.tournament_id} (rounds are now auto-started)")
		
		await self.send(text_data=json.dumps({
			'type': 'info',
			'message': 'Rounds start automatically in this tournament system'
		}))

	async def end_round(self, data):
		"""Message handler for ending tournament round (legacy - now auto-ended)"""
		logger.info(f"Manual end round request for tournament {self.tournament_id} (rounds end automatically)")
		
		await self.send(text_data=json.dumps({
			'type': 'info',
			'message': 'Rounds end automatically when all games complete in this tournament system'
		}))

	# Channel layer message handlers (these handle group_send messages)
	async def tournament_get_ready(self, event):
		"""Handle get ready broadcast message"""
		await self.send(text_data=json.dumps({
			'type': 'get_ready',
			'message': event['message'],
			'round_info': event.get('round_info', {}),
			'sender': event.get('sender')
		}))

	async def tournament_start_round(self, event):
		"""Handle start round broadcast message"""
		await self.send(text_data=json.dumps({
			'type': 'start_round',
			'message': event['message'],
			'round_data': event.get('round_data', {}),
			'games': event.get('games', []),
			'creator': event.get('creator')
		}))

	async def tournament_end_round(self, event):
		"""Handle end round broadcast message"""
		await self.send(text_data=json.dumps({
			'type': 'end_round',
			'message': event['message'],
			'results': event.get('results', {}),
			'next_round_info': event.get('next_round_info', {}),
			'creator': event.get('creator')
		}))

	async def tournament_game_completed(self, event):
		"""Handle tournament game completion notification"""
		logger.info(f"Tournament game completed: {event.get('game_id')} - Winner: {event.get('winner')}")
		await self.send(text_data=json.dumps({
			'type': 'game_completed',
			'game_id': event.get('game_id'),
			'winner': event.get('winner'),
			'loser': event.get('loser'),
			'scores': event.get('scores', {}),
			'message': f"Game {event.get('game_id')} completed!"
		}))

	async def get_brackets(self, data):
		"""Message handler for getting tournament brackets"""
		logger.info(f"Get brackets request for tournament {self.tournament_id}")
		
		# Use authenticated user from connection
		player_id = self.player_id
		
		try:
			tournament = await tournament_manager.get_tournament(self.tournament_id)
			if tournament:
				# Generate brackets data using the new method
				brackets_data = await tournament.get_brackets()
				
				await self.send(text_data=json.dumps({
					'type': 'brackets',
					'brackets': brackets_data,
					'message': 'Tournament brackets retrieved successfully'
				}))
			else:
				await self.send(text_data=json.dumps({
					'type': 'error',
					'error': 'Tournament not found in active tournaments'
				}))
				
		except Exception as e:
			logger.error(f"Error getting tournament brackets: {str(e)}", exc_info=True)
			await self.send(text_data=json.dumps({
				'type': 'error',
				'error': f'Error getting brackets: {str(e)}'
			}))

	async def tournament_auto_start(self, event):
		"""Handle tournament auto-start notification"""
		await self.send(text_data=json.dumps({
			'type': 'tournament_auto_start',
			'message': event['message'],
			'tournament_data': event.get('tournament_data', {})
		}))

	async def tournament_initialized(self, event):
		"""Handle tournament initialization notification"""
		await self.send(text_data=json.dumps({
			'type': 'tournament_initialized',
			'message': event['message'],
			'tournament_data': event.get('tournament_data', {})
		}))

	async def tournament_brackets_update(self, event):
		"""Handle tournament brackets update broadcast"""
		await self.send(text_data=json.dumps({
			'type': 'brackets_update',
			'message': event.get('message', 'Tournament brackets updated'),
			'brackets': event.get('brackets', {}),
			'round_info': event.get('round_info', {})
		}))

	async def tournament_complete(self, event):
		"""Handle tournament completion notification"""
		await self.send(text_data=json.dumps({
			'type': 'tournament_complete',
			'message': event['message'],
			'winner': event.get('winner'),
			'tournament_data': event.get('tournament_data', {})
		}))

	async def create_game(self, event):
		"""Handle create_game notification from tournament manager"""
		logger.info(f"Tournament game notification: {event.get('player_1')} vs {event.get('player_2')} for tournament {self.tournament_id}")
		
		try:
				player_1_id = event.get('player_1')
				player_2_id = event.get('player_2')
				# tournament_id = event.get('tournament_id')
				game_id = event.get('game_id')
				
				# Only send notification if this consumer belongs to one of the players in the game
				if self.player_id not in [player_1_id, player_2_id]:
						logger.debug(f"Player {self.player_id} not involved in game {game_id}, skipping notification")
						return
				
				# Get player usernames for display
				try:
						from .models import UserProfile
						player_1 = await database_sync_to_async(UserProfile.objects.get)(user_id=player_1_id)
						player_2 = await database_sync_to_async(UserProfile.objects.get)(user_id=player_2_id)
						
						player_1_username = await database_sync_to_async(lambda: player_1.username)()
						player_2_username = await database_sync_to_async(lambda: player_2.username)()
				except Exception:
						player_1_username = f"Player_{player_1_id}"
						player_2_username = f"Player_{player_2_id}"
				
				# Notify only the relevant player
				await self.send(text_data=json.dumps({
						'type': 'game_created',
						'message': f'Your match is ready! {player_1_username} vs {player_2_username}',
						'game_data': {
								'game_id': game_id,
								'player_1': {
										'user_id': player_1_id,
										'username': player_1_username
								},
								'player_2': {
										'user_id': player_2_id,
										'username': player_2_username
								},
								'tournament_id': self.tournament_id
						}
				}))
				
				logger.info(f"Game notification sent to player {self.player_id} for game {game_id}")
				
		except Exception as e:
				logger.error(f"Error handling game creation notification: {str(e)}")

	# Message handlers dictionary
	message_handlers = {
		'join': join,
		'get_ready': get_ready,
		'start_tournament': start_tournament,
		'start_round': start_round,
		'end_round': end_round,
		'get_brackets': get_brackets,
	}