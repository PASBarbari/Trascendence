import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .signals import GameState, TournamentState
from .models import Game
from .game_config import GAME_CONFIG  # Assuming you have a game_config.py with GAME_CONFIG defined
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
				self.room_name,
				{
					'type': 'quit_game',
					'player': player or 'unknown',
					'message': f'Player disconnected unexpectedly',
					'game_over': True
				}
			)

			# Clean up game resources
			try:
				game_state.quit_game()
				del active_games[self.room_id]
				logger.info(f"Game {self.room_id} resources cleaned up after disconnect")
			except Exception as e:
				logger.error(f"Error cleaning up game {self.room_id}: {str(e)}")

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
		logger.info(f"🔥 PLAYER_READY CALLED! Player: {self.player_id}, Room: {self.room_id}")
		player = self.player_id

		if self.room_id not in player_ready:
			player_ready[self.room_id] = {}

		player_ready[self.room_id][player] = True
		logger.info(f"Player {player} ready in game {self.room_id}. Status: {player_ready[self.room_id]}")

		if len(player_ready[self.room_id]) >= 2 and all(player_ready[self.room_id].values()):
			logger.info(f"All players ready in game {self.room_id}, starting game")

			await self.channel_layer.group_send(
				self.room_name,
				{
					'type': 'both_players_ready',
					'message': 'All players are ready!',
					'ready': True
				}
			)

			try:
				game = await sync_to_async(Game.objects.get)(id=self.room_id)
				player1_obj = await sync_to_async(lambda: game.player_1)()
				player2_obj = await sync_to_async(lambda: game.player_2)()

				# ✅ INIZIALIZZA IL GIOCO IN active_games CON PARAMETRI CORRETTI
				from .signals import GameState
				game_state = GameState(
					player1_obj.user_id,  # ✅ USA user_id NON id
					player2_obj.user_id,  # ✅ USA user_id NON id
					self.room_id,         # game_id
					GAME_CONFIG['player_length'],
					self.tournament_id if self.tournament_id else None  # tournament_id
				)

				# ✅ IMPOSTA VALORI DEFAULT PER IL GIOCO
				game_state.ring_length = GAME_CONFIG['ring_length']
				game_state.ring_height = GAME_CONFIG['ring_height']
				game_state.ring_width = GAME_CONFIG['ring_width']
				game_state.ring_thickness = GAME_CONFIG['ring_thickness']
				game_state.p_length = GAME_CONFIG['player_length']
				game_state.p_height = GAME_CONFIG['player_height']
				game_state.p_width = GAME_CONFIG['player_width']
				game_state.ball_radius = GAME_CONFIG['ball_radius']
				game_state.ball_speed = GAME_CONFIG['ball_speed']  # ✅ IMPORTANTE: Imposta una velocità iniziale
				game_state.p_speed = GAME_CONFIG['player_speed']

				# ✅ POSIZIONA I PLAYER AI LATI OPPOSTI
				game_state.player_1_pos = [GAME_CONFIG['player_1_start_x'], GAME_CONFIG['player_start_y']] # Sinistra
				game_state.player_2_pos = [GAME_CONFIG['player_2_start_x'], GAME_CONFIG['player_start_y']] # Destra
				game_state.ball_pos = [GAME_CONFIG['ball_start_x'], GAME_CONFIG['ball_start_y']]


				active_games[self.room_id] = game_state
				logger.info(f"✅ Game {self.room_id} initialized with shared config")

				# ✅ AVVIA IL LOOP DI GIOCO
				asyncio.create_task(game_state.start())
				logger.info(f"✅ Game loop started for room {self.room_id}")

				# ✅ INVIA GAME_START AI CLIENT
				await self.channel_layer.group_send(
					self.room_name,
					{
						'type': 'game_start',
						'message': 'Game is starting!',
						'player_1': player1_obj.username,
						'player_2': player2_obj.username,
						'game_config': GAME_CONFIG  # Passa la configurazione del gioco
					}
				)

			except Exception as e:
				logger.error(f"Error initializing game: {str(e)}", exc_info=True)
		else:
			await self.channel_layer.group_send(
				self.room_name,
				{
					'type': 'waiting_for_players',
					'message': 'Waiting for players to be ready...',
					'ready': False
				}
			)

# ✅ ASSICURATI CHE QUESTI HANDLER SIANO ALLO STESSO LIVELLO
	async def both_players_ready(self, event):
		await self.send(text_data=json.dumps({
			'type': 'both_players_ready',
			'message': event['message'],
			'ready': event['ready']
		}))

	async def waiting_for_players(self, event):
		await self.send(text_data=json.dumps({
			'type': 'waiting_for_players',
			'message': event['message'],
			'ready': event['ready']
		}))

	async def game_start(self, event):
		await self.send(text_data=json.dumps({
			'type': 'game_start',
			'message': event['message'],
			'player_1': event.get('player_1'),
			'player_2': event.get('player_2'),
			'game_config': event.get('game_config', GAME_CONFIG)
		}))

	async def start_game(self, data):
		if self.room_id in active_games:
			logger.info(f"Game {self.room_id} already started, ignoring start request")
			return

		logger.info(f"Starting game {self.room_id} with players {data['player1']} and {data['player2']}")
		try:
			del player_ready[self.room_id]
			active_games[self.room_id] = GameState(
				data['player1'],
				data['player2'],
				self.room_id,
				data.get('player_length', 10),
				self.tournament_id if self.tournament_id else None
			)
			asyncio.create_task(active_games[self.room_id].start())
			logger.info(f"Game {self.room_id} successfully started")
		except Exception as e:
			logger.error(f"Error starting game {self.room_id}: {str(e)}", exc_info=True)

	# Continue updating the rest of the methods with logging...
	async def up(self, data):
		try:
			player_id = self.player_id
			logger.debug(f"UP movement request from player {player_id} in game {self.room_id}")
			logger.debug(f"Active games: {list(active_games.keys())}")

			if self.room_id in active_games:
				active_games[self.room_id].up(player_id)
				logger.debug(f"Player {player_id} moved up in game {self.room_id}")

				await self.channel_layer.group_send(
					self.room_name,
					{
						'type': 'player_movement',
						'player_id': player_id,
						'direction': 'up'
					}
				)
			else:
				logger.error(f"Game {self.room_id} not found for UP movement. Active games: {list(active_games.keys())}")
		except Exception as e:
			logger.error(f"Error in UP movement: {str(e)}", exc_info=True)

	async def down(self, data):
		try:
			player_id = self.player_id
			logger.debug(f"DOWN movement request from player {player_id} in game {self.room_id}")

			if self.room_id in active_games:
				active_games[self.room_id].down(player_id)
				logger.debug(f"Player {player_id} moved down in game {self.room_id}")

				await self.channel_layer.group_send(
					self.room_name,
					{
						'type': 'player_movement',
						'player_id': player_id,
						'direction': 'down'
					}
				)
			else:
				logger.error(f"Game {self.room_id} not found for DOWN movement. Active games: {list(active_games.keys())}")
		except Exception as e:
			logger.error(f"Error in DOWN movement: {str(e)}", exc_info=True)

	async def stop(self, data):
		try:
			player_id = self.player_id
			logger.debug(f"STOP movement request from player {player_id} in game {self.room_id}")

			if self.room_id in active_games:
				active_games[self.room_id].stop(player_id)
				logger.debug(f"Player {player_id} stopped in game {self.room_id}")

				await self.channel_layer.group_send(
					self.room_name,
					{
						'type': 'player_movement',
						'player_id': player_id,
						'direction': 'stop'
					}
				)
			else:
				logger.error(f"Game {self.room_id} not found for STOP movement. Active games: {list(active_games.keys())}")
		except Exception as e:
			logger.error(f"Error in STOP movement: {str(e)}", exc_info=True)

	async def player_movement(self, event):
		await self.send(text_data=json.dumps({
			'type': 'player_movement',
			'player_id': event['player_id'],
			'direction': event['direction']
		}))

	async def game_state(self, event):
		await self.send(text_data=json.dumps({
			'type': 'game_state',
			'game_state': event['game_state']
		}))

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
		player = data.get('player', 'unknown')
		logger.info(f"Player {player} quit game {self.room_id}")
		await self.send(text_data=json.dumps({
			'type': 'quit_game',
			'message': f'Player {player} has quit the game!',
			'game_over': True
		}))
		try:
			if self.room_id in active_games:
				active_games[self.room_id].quit_game()
				del active_games[self.room_id]
				logger.info(f"Game {self.room_id} resources cleaned up after player quit")
		except KeyError:
			logger.warning(f"Game {self.room_id} already removed from active_games")
		except Exception as e:
			logger.error(f"Error during game quit: {str(e)}", exc_info=True)

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