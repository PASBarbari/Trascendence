import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .signals import GameState
from .models import Game

active_games = {}
player_ready = {}

class GameTableConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		print('connected')
		self.room_id = self.scope['url_route']['kwargs']['room_id']
		self.room_group_name = f'game_{self.room_id}'
		# Join room group
		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)
  
		await self.accept()

	async def disconnect(self, close_code):
		if self.room_id in active_games:
			GameState.quit_game()
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
		active_games[self.room_id] = GameState(data['player1'], data['player2'], self.room_id, data.get('player_length', 10))
		asyncio.create_task(active_games[self.room_id].start())

	async def up(self, data):
		player = data['player']
		active_games[self.room_id].up(data, player)

	async def down(self, data):
		player = data['player']
		active_games[self.room_id].down(data, player)

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
		'game_state': game_state,
		'game_over': game_over,
		'quit_game': quit_game,
	}