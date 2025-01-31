import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async

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
		# Send message to WebSocket
		await self.send(text_data=json.dumps({
			'message': message
		}))

	async def start(self, event):
		pass

	async def up(self, event, player):
		pass

	async def down(self, event, player):
		pass

	async def game_state(self, event):
		self.send(text_data=json.dumps({
			'game_state': event['game_state']
		}))

