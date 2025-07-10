import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .signals import GameState, TournamentState
from .models import Game
import logging

# Get dedicated loggers
logger = logging.getLogger('pong_app')
websocket_logger = logging.getLogger('websockets')

active_games = {}
active_tournaments = {}
player_ready = {}

class GameTableConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		websocket_logger.info('New WebSocket connection attempt')
		self.room_id = self.scope['url_route']['kwargs']['room_id']
		self.room_name = f'game_{self.room_id}'
		self.tournament_id = self.scope['url_route']['kwargs'].get('tournament_id', None)

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
				self.channel_name,
				{
					'type': 'quit_game',
					'player': player,
					'message': f'Player disconnected unexpectedly',
					'game_over': True
				}
			)

			# Clean up game resources
			game_state.quit_game()
			del active_games[self.room_id]
			logger.info(f"Game {self.room_id} resources cleaned up after disconnect")

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
		player = data.get('player', self.player_id)
		websocket_logger.info(f"Player {player} ready for game {self.room_id}")

		# Inizializza la struttura se non esiste
		if self.room_id not in player_ready:
			player_ready[self.room_id] = {}

		# Marca il player come pronto
		player_ready[self.room_id][str(player)] = True

		# Invia conferma al player
		await self.send(text_data=json.dumps({
			'type': 'player_ready_confirmed',
			'player': player,
			'room_id': self.room_id
		}))

		try:
			# Controlla se entrambi i player sono pronti usando database_sync_to_async
			game = await database_sync_to_async(Game.objects.get)(id=self.room_id)

			# Accesso ai campi del modello tramite database_sync_to_async
			player_1_id = await database_sync_to_async(lambda: game.player_1.user_id)()
			player_2_id = await database_sync_to_async(lambda: game.player_2.user_id)()

			player_1_ready = player_ready[self.room_id].get(str(player_1_id), False)
			player_2_ready = player_ready[self.room_id].get(str(player_2_id), False)

			websocket_logger.info(f"Game {self.room_id} ready status - P1: {player_1_ready}, P2: {player_2_ready}")

			if player_1_ready and player_2_ready:
				# Avvia il gioco con informazioni sui ruoli
				await self.channel_layer.group_send(
					self.room_name,
					{
						'type': 'start_game',
						'message': f'Game {self.room_id} started! Both players ready.',
						'game_id': self.room_id,
						'player_1_id': player_1_id,
						'player_2_id': player_2_id
					}
				)
		except Exception as e:
			websocket_logger.error(f"Error in player_ready: {str(e)}")
			await self.send(text_data=json.dumps({
				'type': 'error',
				'error': f'Failed to process player ready: {str(e)}'
			}))

	async def start_game(self, event):
		"""Handle start_game message from channel layer"""
		await self.send(text_data=json.dumps({
			'type': 'game_start',
			'message': event['message'],
			'game_id': event['game_id'],
			'player_1_id': event.get('player_1_id'),
			'player_2_id': event.get('player_2_id'),
			'your_player_id': self.player_id
		}))

	async def game_state(self, data):
		"""Handle game state updates"""
		if self.room_id in active_games:
			game_state = active_games[self.room_id]
			await self.send(text_data=json.dumps({
				'type': 'game_state',
				'game_state': {
					'player_1_pos': game_state.player_1_pos,
					'player_2_pos': game_state.player_2_pos,
					'ball_pos': game_state.ball_pos,
					'ball_velocity': game_state.ball_velocity,
					'p1_score': game_state.p1_score,
					'p2_score': game_state.p2_score
				}
			}))

	# Input handlers for paddle synchronization only
	async def player_input(self, data):
		"""Handle player input - only for paddle movement synchronization"""
		try:
			input_type = data.get('input')
			player = data.get('player')
			timestamp = data.get('timestamp', 0)

			# Instead of updating server-side game state, just broadcast the input to other players
			await self.channel_layer.group_send(
				self.room_name,
				{
					'type': 'paddle_movement',
					'input': input_type,
					'player': player,
					'timestamp': timestamp,
					'sender_channel': self.channel_name  # Don't send back to sender
				}
			)

			logger.debug(f"Player {player} input '{input_type}' broadcasted in game {self.room_id}")
		except Exception as e:
			websocket_logger.error(f"Error handling player input: {str(e)}")

	async def paddle_movement(self, event):
		"""Broadcast paddle movement to all players (including sender for better sync)"""
		# Send to all players now, including the sender for better synchronization
		await self.send(text_data=json.dumps({
			'type': 'paddle_movement',
			'input': event['input'],
			'player': event['player'],
			'timestamp': event['timestamp']
		}))

	async def ball_state(self, data):
		"""Handle ball state updates"""
		try:
			position = data.get('position', [0, 0, 0])
			velocity = data.get('velocity', [0, 0, 0])
			timestamp = data.get('timestamp', 0)

			websocket_logger.info(f"📨 Forwarding ball state to group {self.room_name}")

			# Send to ALL clients in the room (including sender for full sync)
			await self.channel_layer.group_send(
				self.room_name,
				{
					'type': 'ball_state_update',
					'position': position,
					'velocity': velocity,
					'timestamp': timestamp
				}
			)
		except Exception as e:
			websocket_logger.error(f"Error in ball_state: {str(e)}")

	async def ball_state_update(self, event):
		"""Send ball state update to client"""
		await self.send(text_data=json.dumps({
			'type': 'ball_state',
			'position': event['position'],
			'velocity': event['velocity'],
			'timestamp': event['timestamp']
		}))

	async def score_update(self, data):
		"""Handle score updates"""
		try:
			p1_score = data.get('p1_score')
			p2_score = data.get('p2_score')
			timestamp = data.get('timestamp', 0)

			websocket_logger.info(f"📨 Forwarding score update to group {self.room_name}: P1={p1_score}, P2={p2_score}")

			# Send to ALL clients in the room (including sender for full sync)
			await self.channel_layer.group_send(
				self.room_name,
				{
					'type': 'score_update_broadcast',
					'p1_score': p1_score,
					'p2_score': p2_score,
					'timestamp': timestamp
				}
			)

			logger.debug(f"Score update broadcasted in game {self.room_id}: P1={p1_score}, P2={p2_score}")
		except Exception as e:
			websocket_logger.error(f"Error handling score update: {str(e)}")

	async def score_update_broadcast(self, event):
		"""Send score update to all clients"""
		await self.send(text_data=json.dumps({
			'type': 'score_update',
			'p1_score': event['p1_score'],
			'p2_score': event['p2_score'],
			'timestamp': event['timestamp']
		}))

	async def field_dimensions(self, data):
		"""Handle field dimensions synchronization"""
		try:
			dimensions = data.get('dimensions')
			timestamp = data.get('timestamp', 0)

			websocket_logger.info(f"📨 Forwarding field dimensions to group {self.room_name}")

			# Send to ALL clients in the room (including sender for full sync)
			await self.channel_layer.group_send(
				self.room_name,
				{
					'type': 'field_dimensions_update',
					'dimensions': dimensions,
					'timestamp': timestamp,
				}
			)

			logger.debug(f"Field dimensions broadcasted in game {self.room_id}")
		except Exception as e:
			websocket_logger.error(f"Error handling field dimensions: {str(e)}")

	async def field_dimensions_update(self, event):
		"""Send field dimensions to all clients"""
		await self.send(text_data=json.dumps({
			'type': 'field_dimensions',
			'dimensions': event['dimensions'],
			'timestamp': event['timestamp']
		}))

	# Legacy handlers - keeping for backward compatibility but simplified
	async def up(self, data):
		player = data['player']
		logger.debug(f"Player {player} moved up in game {self.room_id}")

	async def down(self, data):
		player = data['player']
		logger.debug(f"Player {player} moved down in game {self.room_id}")

	async def stop(self, data):
		player = data['player']
		logger.debug(f"Player {player} stopped in game {self.room_id}")

	async def game_init(self, data):
		logger.info(f"Game initialization for {self.room_id}")
		try:
			game_state = active_games[self.room_id]
			game_state.ring_length = data.get('ring_length', 0)
			game_state.ring_height = data.get('ring_height', 0)
			game_state.ring_width = data.get('ring_width', 0)
			game_state.ring_thickness = data.get('ring_thickness', 0)
			game_state.p_length = data.get('p_length', 0)
			game_state.p_width = data.get('p_width', 0)
			game_state.p_height = data.get('p_height', 0)
			game_state.ball_radius = data.get('ball_radius', 0)
			game_state.player_1_pos = data.get('player_1_pos', [0, 0])
			game_state.player_2_pos = data.get('player_2_pos', [0, 0])
			game_state.ball_speed = data.get('ball_speed', 0)
			game_state.p_speed = data.get('p_speed', 0)
			await game_state.update()
			logger.info(f'Game state updated: {game_state.game_state}')
			logger.info(f"Game {self.room_id} initialized with configuration")
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
		await self.send(text_data=json.dumps({
			'message': 'Game Over!',
			'game_over': True
		}))
		try:
			del active_games[self.room_id]
			logger.info(f"Game {self.room_id} resources cleaned up after game over")
		except KeyError:
			logger.warning(f"Game {self.room_id} already removed from active_games")

	async def quit_game(self, data):
		player = data['player']
		logger.info(f"Player {player} quit game {self.room_id}")
		await self.send(text_data=json.dumps({
			'type': 'quit_game',
			'message': f'Player {player} has quit the game!',
			'game_over': True
		}))
		try:
			GameState.quit_game(player)
			del active_games[self.room_id]
			logger.info(f"Game {self.room_id} resources cleaned up after player quit")
		except KeyError:
			logger.warning(f"Game {self.room_id} already removed from active_games")
		except Exception as e:
			logger.error(f"Error during game quit: {str(e)}", exc_info=True)

	async def player_position(self, data):
		"""Handle player position updates"""
		try:
			player = data.get('player')
			position = data.get('position')
			timestamp = data.get('timestamp', 0)

			websocket_logger.info(f"📨 Forwarding player {player} position to group {self.room_name}")

			# Send to ALL clients in the room (including sender for full sync)
			await self.channel_layer.group_send(
				self.room_name,
				{
					'type': 'player_position_update',
					'player': player,
					'position': position,
					'timestamp': timestamp
				}
			)

			logger.debug(f"Player {player} position broadcasted in game {self.room_id}")
		except Exception as e:
			websocket_logger.error(f"Error handling player position: {str(e)}")

	async def player_position_update(self, event):
		"""Broadcast player position update"""
		await self.send(text_data=json.dumps({
			'type': 'player_position',
			'player': event['player'],
			'position': event['position'],
			'timestamp': event['timestamp']
		}))

	message_handlers = {
		'chat_message': chat_message,
		'player_ready': player_ready,
		'player_input': player_input,  # Updated to use new paddle-only system
		'player_position': player_position,  # New: Handle player positions
		'ball_state': ball_state,      # New: Handle ball state from master
		'score_update': score_update,  # New: Handle score updates from master
		'field_dimensions': field_dimensions,  # New: Handle field dimensions sync
		'up': up,
		'down': down,
		'stop': stop,
		'game_state': game_state,
		'game_init': game_init,
		'game_over': game_over,
		'quit_game': quit_game,
	}

class TournamentConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		self.tournament_id = self.scope['url_route']['kwargs'].get('tournament_id', None)
		self.channel_name = f'tournament_{self.tournament_id}'
		websocket_logger.info(f"New tournament connection: {self.tournament_id}")

		# Join room group
		await self.channel_layer.group_add(
			self.channel_name
		)

		await self.accept()
		logger.info(f"Tournament websocket connection accepted: {self.tournament_id}")

	async def disconnect(self, close_code):
		websocket_logger.info(f"Tournament disconnected: {self.tournament_id}, code={close_code}")
		# Handle cleanup for tournament resources if needed
		if hasattr(self, 'room_id') and self.room_id in active_games:
			logger.info(f"Cleaning up game resources for tournament {self.tournament_id}")
			active_games[self.room_id].quit_game()
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
		logger.info(f"Join request for tournament {self.tournament_id}")

		# Use the authenticated user from WebSocket scope
		user = self.scope.get('user')
		if not user or not user.is_authenticated:
			logger.warning("Unauthenticated user attempted to join tournament")
			await self.send(text_data=json.dumps({
				'type': 'error',
				'error': 'Authentication required'
			}))
			return

		player_id = user.user_id

		if not self.tournament_id in active_tournaments:
			try:
				name = data.get('name')
				max_p = data.get('max_p')
				req_lvl = data.get('req_lvl')
				logger.info(f"Creating new tournament: {name}, max_players={max_p}, min_level={req_lvl}, creator={player_id}")
				active_tournaments[self.tournament_id] = TournamentState(self.tournament_id, name, max_p, req_lvl, player_id)
			except Exception as e:
				logger.error(f"Tournament creation failed: {str(e)}", exc_info=True)
				await self.send(text_data=json.dumps({
					'type': 'error',
					'error': f'Creation failed because {e}'
				}))
			else:
				logger.info(f"Tournament {name} created successfully")
				await self.send(text_data=json.dumps({
					'type': 'success',
					'success': f'Tournament {name} created'
				}))
		else:
			logger.info(f"Player {player_id} joining existing tournament {self.tournament_id}")
			try:
				ret = active_tournaments[self.tournament_id].add_player(user)
				if ret != "Player added to the tournament":
					logger.warning(f"Player join failed: {ret}")
					await self.send(text_data=json.dumps({
						'type': 'error',
						'error': ret
					}))
				else:
					logger.info(f"Player {player_id} successfully joined tournament {self.tournament_id}")
					await self.send(text_data=json.dumps({
						'type': 'success',
						'success': ret
					}))
			except Exception as e:
				logger.error(f"Error adding player to tournament: {str(e)}", exc_info=True)
				await self.send(text_data=json.dumps({
					'type': 'error',
					'error': f'Error joining tournament: {str(e)}'
				}))