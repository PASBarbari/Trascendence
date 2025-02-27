import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .signals import GameState ,TournamentState
from .models import Game

active_games = {}
active_tournaments = {}
player_ready = {}

class GameTableConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		print('connected')
		self.room_id = self.scope['url_route']['kwargs']['room_id']
		self.channel_name = f'game_{self.room_id}'
		self.tournament_id = self.scope['url_route']['kwargs']['tournament_id']
		# Join room group
		await self.channel_layer.group_add(
			self.channel_name
		)

		await self.accept()

	async def disconnect(self, close_code):
		if self.room_id in active_games:
			active_games[self.room_id].quit_game()
			del active_games[self.room_id]

	async def receive(self, text_data):
		data = json.loads(text_data)
		message_type = data.get('type')
		# print(f"message_type: {message_type}")
		handler = self.message_handlers.get(message_type, self.default_handler)
		await handler(self, data)

	async def default_handler(self, data):
		print(f"Unhandled message type: {data['type']}")

	async def chat_message(self, data):
		message = data['message']
		await self.send(text_data=json.dumps({
			'message': message
		}))

	async def player_ready(self, data):
		player = data['player']
		if self.room_id not in player_ready:
			player_ready[self.room_id] = [False, False]
		player_ready[self.room_id][player] = True
		print(player_ready[self.room_id])
		if all(player_ready[self.room_id]):
			await self.send(text_data=json.dumps({
				'message': 'All players are ready!',
				'ready': True
			}))
			# data['player1'] = await sync_to_async((Game.objects.get)(id=self.room_id).player_1)
			# data['player2'] = await sync_to_async((Game.objects.get)(id=self.room_id).player_2)
			game = await sync_to_async(Game.objects.get)(id=self.room_id)
			data['player1'] = await sync_to_async(lambda: game.player_1)()
			data['player2'] = await sync_to_async(lambda: game.player_2)()
			await self.start_game(data)
		else:
			await self.send(text_data=json.dumps({
				'message': 'Waiting for players to be ready...',
				'ready': False
			}))

	async def start_game(self, data):
		if self.room_id in active_games:
			return
		del player_ready[self.room_id]
		active_games[self.room_id] = GameState(data['player1'], data['player2'], self.room_id, data.get('player_length', 10), self.tournament_id if self.tournament_id else None)
		asyncio.create_task(active_games[self.room_id].start())

	async def up(self, data):
		player = data['player']
		active_games[self.room_id].up(player)

	async def down(self, data):
		player = data['player']
		active_games[self.room_id].down(player)

	async def stop(self, data):
		player = data['player']
		active_games[self.room_id].stop(player)

	async def game_init(self, data):
		print(f"game_init: {data}")
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


	async def game_state(self, data):
		# print(data)
		await self.send(text_data=json.dumps({
			'type': 'game_state',
			'game_state': data['game_state']
		}))

	async def game_over(self, data):
		await self.send(text_data=json.dumps({
			'message': 'Game Over!',
			'game_over': True
		}))
		del active_games[self.room_id]
		
	async def quit_game(self, data):
		player = data['player']
		await self.send(text_data=json.dumps({
			'type': 'quit_game',
			'message': f'Player {player} has quit the game!',
			'game_over': True
		}))
		GameState.quit_game(player)
		del active_games[self.room_id]

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
		self.tournament_id = self.scope['url_route']['kwargs']['tournament_id']
		if not self.tournament_id:
			pass #TODO boh
		self.channel_name = f'tournament_{self.tournament_id}'
		# Join room group
		await self.channel_layer.group_add(
			self.channel_name
		)

		await self.accept()
		

	async def disconnect(self, close_code):
		if self.room_id in active_games:
			active_games[self.room_id].quit_game()
			del active_games[self.room_id]

	async def receive(self, text_data):
		data = json.loads(text_data)
		message_type = data.get('type')
		# print(f"message_type: {message_type}")
		handler = self.message_handlers.get(message_type, self.default_handler)
		await handler(self, data)

	async def default_handler(self, data):
		print(f"Unhandled message type: {data['type']}")

	async def join(self, data):
		if not self.tournament_id in active_tournaments:
			try:
				name = data.get('name')
				max_p = data.get('max_p')
				req_lvl = data.get('req_lvl')
				player = data.get('player')
				player_id = player.user_id
				active_tournaments[self.tournament_id] = TournamentState(self.tournament_id, name, max_p, req_lvl, player_id)
			except Exception as e:
				self.send(text_data=json.dumps({
					'type' : 'error',
					'error' : f'creation failed because {e}'
				}))
			else:
				self.send(text_data=json.dumps({
					'type' : 'success',
					'success' : f'Tournament {name} created'
				}))
		else:
			player = data.get('player')
			ret = active_tournaments[self.tournament_id].add_player(player)
			if ret != "Player added to the tournament":
				self.send(text_data=json.dumps({
					'type' : 'error',
					'error' : ret
				}))
			else:
				self.send(text_data=json.dumps({
					'type' : 'success',
					'success' : ret
				}))
		
	async def start(self, data):
		player = data.get('player')
		if self.tournament_id in active_tournaments:
			if player.user_id == active_tournaments[self.tournament_id].creator:
				ret = active_tournaments[self.tournament_id].start()
				self.send(text_data=ret)
			else:
				self.send(text_data=json.dumps({
					'type' : 'error',
					'error' : 'Only the creator can start the tournament'
				}))
		else:
			self.send(text_data=json.dumps({
				'type' : 'error',
				'error' : 'Tournament empty'
			}))
	
	async def create_game(self, data):
		player_1 = data.get('player_1')
		player_2 = data.get('player_2')
		self.send(text_data=json.dumps({
			'type' : 'create_game',
			'player_1' : player_1,
			'player_2' : player_2,
			'tournament_id' : self.tournament_id
		}))

	async def game_result(self, data):
		if self.tournament_id in active_tournaments:
			winner = data.get('winner')
			ret = active_tournaments[self.tournament_id].brackets(winner)
			if ret != "Tournament ended" or ret != "Game registered successfully":
				self.send(text_data=json.dumps({
					'type' : 'error',
					'error' : ret
				}))
			else:
				self.send(text_data=json.dumps({
					'type' : 'success',
					'success' : ret
				}))
		else:
			self.send(text_data=json.dumps({
				'type' : 'error',
				'error' : 'Tournament empty'
			}))

	message_handlers = {
		'join': join,
		'start': start,
		'create_game': create_game,
		'game_result': game_result,
	}