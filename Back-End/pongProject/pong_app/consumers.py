import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .signals import GameState

active_games = {}
player_ready = {}
class GameTableConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		self.room_id = self.scope['room_id']
		self.room_group_name = f'game_{self.room_id}'
		# Join room group
		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)
  
		await self.accept()

	async def disconnect(self, close_code):
		pass

	async def chat_message(self, event):
		message = event['message']
		await self.send(text_data=json.dumps({
			'message': message
		}))

	async def start(self, event):
		if self.room_id in active_games:
			return
		player_ready[self.room_id] = {event['player1']: False, event['player2']: False}
		await self.send(text_data=json.dumps({
			'message': 'Waiting for players to be ready...',
			'ready': False
		}))

	async def player_ready(self, event):
		player = event['player']
		player_ready[self.room_id][player] = True
		if all(player_ready[self.room_id].values()):
			await self.send(text_data=json.dumps({
				'message': 'All players are ready!',
				'ready': True
			}))
			await self.start_game(event)
		else:
			await self.send(text_data=json.dumps({
				'message': 'Waiting for players to be ready...',
				'ready': False
			}))


	async def start_game(self, event):
		if self.room_id in active_games:
			return
		del player_ready[self.room_id]
		active_games[self.room_id] = GameState(event['player1'], event['player2'], self.room_id, event.get('player_length', 10))
		await active_games[self.room_id].start()

	async def up(self, event, player):
		active_games[self.room_id].up(event, player)

	async def down(self, event, player):
		active_games[self.room_id].down(event, player)

	async def game_state(self, event):
		self.send(text_data=json.dumps({
			'game_state': event['game_state']
		}))

	async def game_over(self, event):
		await self.send(text_data=json.dumps({
			'message': 'Game Over!',
			'game_over': True
		}))
		del active_games[self.room_id]
	
	async def quit_game(self, event, player):
		await self.send(text_data=json.dumps({
			'message': f'Player {player} has quit the game!',
			'game_over': True
		}))
		GameState.quit_game(player)
		del active_games[self.room_id]