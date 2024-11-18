# import json
# from channels.generic.websocket import AsyncWebsocketConsumer
# from my_chat.models import ChatRoom, ChatMessage
# from .user_services import register_user
# from asgiref.sync import sync_to_async

# class ChatConsumer(AsyncWebsocketConsumer):
# 		async def connect(self):
# 				self.room_name = self.scope['url_route']['kwargs']['room_name']
# 				self.room_group_name = f'chat_{self.room_name}'
# 				print(self.room_group_name)
# 				print(self.room_name)
# 				user = self.scope["user"]
# 				print(user)
#         # Accept connection if the user is authenticated
# 				if user.is_authenticated:
# 					await self.accept()
# 				else:
#             # Attempt to register the user
# 					await sync_to_async(register_user)(user.username)
# 					await self.accept()

#         # Join room group
# 				await self.channel_layer.group_add(
# 					self.room_group_name,
# 					self.channel_name
# 				)

# 		async def disconnect(self, close_code):
#         # Leave room group
# 				await self.channel_layer.group_discard(
# 						self.room_group_name,
# 						self.channel_name
# 				)

# 		async def receive(self, text_data):
# 				text_data_json = json.loads(text_data)
# 				message = text_data_json['message']
# 				room_id = text_data_json['room_id']
# 				sender = text_data_json['sender']
# 				timestamp = text_data_json.get('timestamp')  # Optional timestamp

#         # Retrieve the chat room asynchronously
# 				try:
# 						room = await sync_to_async(ChatRoom.objects.get)(id=room_id)
# 				except ChatRoom.DoesNotExist:
#             # Send error back if room does not exist
# 					await self.send(text_data=json.dumps({
#                 'error': 'Room does not exist'
#             }))

#         # Save message to the database
# 				await sync_to_async(ChatMessage.objects.create)(
# 					room=room,
# 					message=message,
# 					sender=sender,
# 					timestamp=timestamp
# 				)

#         # Send message to room group
# 				await self.channel_layer.group_send(
# 						self.room_group_name,
# 						{
# 							'type': 'chat_message',
# 							'message': message,
# 							'room_id': room_id,
# 							'timestamp': timestamp,
# 							'sender': sender
# 						}
# 				)

# 		async def chat_message(self, event):
#         # Send message to WebSocket
# 				await self.send(text_data=json.dumps({
# 						'message': event['message'],
# 						'room_id': event['room_id'],
# 						'timestamp': event['timestamp'],
# 						'sender': event['sender']
# 				}))

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from my_chat.models import ChatRoom, ChatMessage
from .user_services import register_user
from asgiref.sync import sync_to_async
from my_chat.models import ChatRoom, ChatMessage

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
#         self.room_name = self.scope['url_route']['kwargs']['room_name']
#         self.room_group_name = f'chat_{self.room_name}'

#         user = self.scope["user"]

#         # Accept connection if the user is authenticated
#         if user.is_authenticated:
#             await self.accept()
#         else:
#             # Attempt to register the user
#             await sync_to_async(register_user)(user.username)
#             await self.accept()

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def save_message(self, room_id, message, sender, timestamp):
        try:
            room = await sync_to_async(ChatRoom.objects.get)(room_id=room_id)
        except ChatRoom.DoesNotExist:
            return {'error': 'Room does not exist'}
#         # Retrieve the chat room asynchronously
#         try:
#             room = await sync_to_async(ChatRoom.objects.get)(id=room_id)
#         except ChatRoom.DoesNotExist:
#             # Send error back if room does not exist
#             await self.send(text_data=json.dumps({
#                 'error': 'Room does not exist'
#             }))
#             return

        # Save message to the database
        await sync_to_async(ChatMessage.objects.create)(
            room=room,
            message=message,
            sender=sender,
            timestamp=timestamp
        )
        return None

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        room_id = text_data_json['room_id']
        sender = text_data_json['sender']
        timestamp = text_data_json.get('timestamp')

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'room_id': room_id,
                'timestamp': timestamp,
                'sender': sender
            }
        )

        error = await self.save_message(room_id, message, sender, timestamp)
        if error:
            await self.send(text_data=json.dumps(error))

    async def chat_message(self, event):
        message = event['message']
        room_id = event['room_id']
        sender = event['sender']
        timestamp = event['timestamp']

    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'room_id': event['room_id'],
            'sender': event['sender'],
            'timestamp': event['timestamp']
        }))
