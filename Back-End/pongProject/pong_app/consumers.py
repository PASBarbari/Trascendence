import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .signals import GameState, TournamentState
from .models import Game
import logging
from asgiref.sync import sync_to_async

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
			player_ready[self.room_id] = [False, False]
		
		player_ready[self.room_id][player] = True
		logger.info(f"Player {player} ready in game {self.room_id}. Status: {player_ready[self.room_id]}")
		
		if all(player_ready[self.room_id]):
			logger.info(f"All players ready in game {self.room_id}, starting game")
			await self.send(text_data=json.dumps({
				'message': 'All players are ready!',
				'ready': True
			}))
			
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

	async def up(self, data):
		try:
			# Use authenticated user from connection instead of client data
			player = self.player_id
			active_games[self.room_id].up(player)
			logger.debug(f"Player {player} moved up in game {self.room_id}")
		except KeyError:
			logger.error(f"Game {self.room_id} not found for UP movement")
		except Exception as e:
			logger.error(f"Error in UP movement: {str(e)}")

	async def down(self, data):
		try:
			# Use authenticated user from connection instead of client data
			player = self.player_id
			active_games[self.room_id].down(player)
			logger.debug(f"Player {player} moved down in game {self.room_id}")
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
		logger.info(f"Join request for tournament {self.tournament_id}")

		# Use authenticated user from connection instead of scope
		player_id = self.player_id
		user = self.scope.get('user')

		if not self.tournament_id in active_tournaments:
			try:
				name = data.get('name')
				max_p = data.get('max_p')
				logger.info(f"Creating new tournament: {name}, max_players={max_p}, creator={player_id}")
				active_tournaments[self.tournament_id] = TournamentState(
					tournament_id=self.tournament_id, 
					name=name, 
					max_p=max_p, 
					player_id=player_id
				)
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
				# Create user dict format expected by add_player
				user_dict = {
					'user_id': player_id,
					'username': getattr(user, 'username', f'User_{player_id}')
				}
				ret = active_tournaments[self.tournament_id].add_player(user_dict)
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
					
					# Check if tournament is ready to start (all slots filled)
					tournament = active_tournaments[self.tournament_id]
					if tournament.nbr_player >= tournament.max_p:
						logger.info(f"Tournament {self.tournament_id} is full, auto-starting")
						start_result = tournament.start()
						if start_result['type'] == 'success':
							await self.channel_layer.group_send(
								self.room_name,
								{
									'type': 'tournament_auto_start',
									'message': 'Tournament is full and starting automatically!',
									'tournament_data': {
										'players': tournament.players,
										'max_players': tournament.max_p
									}
								}
							)
						
			except Exception as e:
				logger.error(f"Error adding player to tournament: {str(e)}", exc_info=True)
				await self.send(text_data=json.dumps({
					'type': 'error',
					'error': f'Error joining tournament: {str(e)}'
				}))

	async def get_ready(self, data):
		"""Message handler for preparing all players for next round"""
		logger.info(f"Get ready message for tournament {self.tournament_id}")
		
		# Use authenticated user from connection
		player_id = self.player_id
		
		try:
			if self.tournament_id in active_tournaments:
				tournament = active_tournaments[self.tournament_id]
				
				# Broadcast get ready message to all tournament participants
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

	async def start_round(self, data):
		"""Message handler for creator to start tournament round"""
		logger.info(f"Start round request for tournament {self.tournament_id}")
		
		# Use authenticated user from connection
		player_id = self.player_id
		
		try:
			if self.tournament_id in active_tournaments:
				tournament = active_tournaments[self.tournament_id]
				
				# Check if this player is the tournament creator
				if tournament.creator_id == player_id:
					# Call the tournament's start_round method
					result = await tournament.start_round()
					
					if result['type'] == 'success':
						logger.info(f"Round started successfully by creator {player_id} in tournament {self.tournament_id}")
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
						'error': 'Only tournament creator can start rounds'
					}))
			else:
				await self.send(text_data=json.dumps({
					'type': 'error',
					'error': 'Tournament not found'
				}))
		except Exception as e:
			logger.error(f"Error in start_round: {str(e)}", exc_info=True)
			await self.send(text_data=json.dumps({
				'type': 'error',
				'error': f'Error starting round: {str(e)}'
			}))

	async def end_round(self, data):
		"""Message handler for ending tournament round"""
		logger.info(f"End round message for tournament {self.tournament_id}")
		
		# Use authenticated user from connection
		player_id = self.player_id
		
		try:
			if self.tournament_id in active_tournaments:
				tournament = active_tournaments[self.tournament_id]
				
				# Check if this player is the tournament creator
				if tournament.creator_id == player_id:
					# Call the tournament's end_round method
					result = await tournament.end_round(auto_ended=False)
					
					if result['type'] == 'success':
						logger.info(f"Round ended successfully by creator {player_id} in tournament {self.tournament_id}")
						await self.send(text_data=json.dumps({
							'type': 'success',
							'success': result['success'],
							'winner': result.get('winner')
						}))
					else:
						await self.send(text_data=json.dumps({
							'type': 'error',
							'error': result['error']
						}))
				else:
					await self.send(text_data=json.dumps({
						'type': 'error',
						'error': 'Only tournament creator can end rounds'
					}))
			else:
				await self.send(text_data=json.dumps({
					'type': 'error',
					'error': 'Tournament not found'
				}))
		except Exception as e:
			logger.error(f"Error in end_round: {str(e)}", exc_info=True)
			await self.send(text_data=json.dumps({
				'type': 'error',
				'error': f'Error ending round: {str(e)}'
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

	async def tournament_auto_start(self, event):
		"""Handle tournament auto-start notification"""
		await self.send(text_data=json.dumps({
			'type': 'tournament_auto_start',
			'message': event['message'],
			'tournament_data': event.get('tournament_data', {})
		}))

	# Message handlers dictionary
	message_handlers = {
		'join': join,
		'get_ready': get_ready,
		'start_round': start_round,
		'end_round': end_round,
	}