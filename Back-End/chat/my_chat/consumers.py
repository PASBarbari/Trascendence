import json
import logging
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from my_chat.models import ChatRoom, ChatMessage, ChatMember, UserProfile
from asgiref.sync import sync_to_async

logger = logging.getLogger('django')

class ChatConsumer(AsyncWebsocketConsumer):
	async def connect(self):		
		# Estrai room_id dai parametri query
		query_string = parse_qs(self.scope["query_string"].decode())
		if 'room_id' not in query_string:
			logger.error("WebSocket connection attempt without room_id")
			await self.close(code=4000)
			return
		
		self.room_id = query_string['room_id'][0]
		self.room_group_name = f'chat_{self.room_id}'
		
		# Controlla connessione Redis
		await self.log_redis_connection()
		
		# Join room group
		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)
		
		logger.info(f"User {self.scope['user']} connected to chat {self.room_id}")
		await self.accept()

	@database_sync_to_async
	def is_chat_member(self):
		try:
			user = self.scope['user']
			# Se l'utente è AnonymousUser, non è membro
			if not hasattr(user, 'user_id'):
				return False
				
			# Verifica nel database
			return ChatMember.objects.filter(
				user_id=user.user_id,
				chat_room_id=self.room_id,
				is_active=True
			).exists()
		except Exception as e:
			logger.error(f"Error checking chat membership: {str(e)}")
			return False

	@database_sync_to_async
	def is_user_blocked(self, sender_username):
		"""Verifica se l'utente corrente ha bloccato il sender"""
		try:
			current_user = self.scope['user']
			if not hasattr(current_user, 'user_id'):
				return False
				
			sender_profile = UserProfile.objects.get(username=sender_username)
			current_user_profile = UserProfile.objects.get(user_id=current_user.user_id)
			
			return current_user_profile.is_blocked_by(sender_profile)
		except Exception as e:
			logger.error(f"Error checking if user is blocked: {str(e)}")
			return False
		
	async def log_redis_connection(self):
		try:
			# Test della connessione Redis senza accedere a connection_pool
			# Prova un'operazione semplice per verificare che Redis funzioni
			await self.channel_layer.group_add("test_connection", self.channel_name)
			await self.channel_layer.group_discard("test_connection", self.channel_name)
			
			# Log con informazioni disponibili
			if hasattr(self.channel_layer, 'hosts'):
				logger.info(f"Redis connection info: {self.channel_layer.hosts}")
			else:
				config = getattr(self.channel_layer, 'config', {})
				logger.info(f"Redis layer config: {config}")
				logger.info("Redis connection test successful")
		except Exception as e:
			logger.error(f"Error checking Redis connection: {str(e)}")

	async def disconnect(self, close_code):
		# Leave room group
		await self.channel_layer.group_discard(
			self.room_group_name,
			self.channel_name
		)

	async def save_message(self, room_id, message, sender_username, timestamp, message_type='text'):
		try:
			room = await sync_to_async(ChatRoom.objects.get)(room_id=room_id)
			
			sender_profile = await sync_to_async(UserProfile.objects.get)(username=sender_username)
			
			await sync_to_async(ChatMessage.objects.create)(
				room=room,
				message=message,
				sender=sender_profile,
				timestamp=timestamp,
				message_type=message_type
			)
			logger.info(f"Message saved: {message_type} message from {sender_username} in room {room_id}")
			return None
		except ChatRoom.DoesNotExist:
			return {'error': 'Room does not exist'}
		except UserProfile.DoesNotExist:
			logger.error(f"User profile not found for username: {sender_username}")
			if hasattr(self.scope['user'], 'user_id'):
				try:
					sender_profile = await sync_to_async(UserProfile.objects.get)(user_id=self.scope['user'].user_id)
					await sync_to_async(ChatMessage.objects.create)(
						room=room,
						message=message,
						sender=sender_profile,
						timestamp=timestamp,
						message_type=message_type
					)
					return None
				except Exception as e:
					logger.error(f"Fallback failed: {str(e)}")
					
			return {'error': 'User profile not found'}
		except Exception as e:
			logger.error(f"Error saving message: {str(e)}")
			return {'error': f'Error saving message: {str(e)}'}

	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
			message_type = data.get('type', 'text')
			
			if message_type == 'text':
				await self.handle_text_message(data)
			elif message_type == 'game_invitation':
				await self.handle_game_invitation(data)
			else:
				logger.warning(f"Unknown message type: {message_type}")
				
		except json.JSONDecodeError:
			logger.error("Invalid JSON received")
		except Exception as e:
			logger.error(f"Error processing message: {str(e)}")

	async def handle_text_message(self, data):
		"""Handle regular text messages"""
		message = data['message']
		room_id = data['room_id']
		sender = data['sender']
		timestamp = data.get('timestamp')

		await self.channel_layer.group_send(
			self.room_group_name,
			{
				'type': 'chat_message',
				'message': message,
				'room_id': room_id,
				'timestamp': timestamp,
				'sender': sender,
				'sender_id': self.scope['user'].user_id if hasattr(self.scope['user'], 'user_id') else None
			}
		)

		error = await self.save_message(room_id, message, sender, timestamp, 'text')
		if error:
			await self.send(text_data=json.dumps(error))

	async def handle_game_invitation(self, data):
		"""Handle game invitation messages"""
		sender = data.get('sender')
		message = data.get('message', f"{sender} invited you to play a game!")
		room_id = data.get('room_id')
		timestamp = data.get('timestamp')

		# Broadcast game invitation to all users in the room
		await self.channel_layer.group_send(
			self.room_group_name,
			{
				'type': 'game_invitation_message',
				'message': message,
				'room_id': room_id,
				'sender': sender,
				'timestamp': timestamp,
				'sender_id': self.scope['user'].user_id if hasattr(self.scope['user'], 'user_id') else None
			}
		)

		# Save to database as game_invitation type
		error = await self.save_message(room_id, message, sender, timestamp, 'game_invitation')
		if error:
			await self.send(text_data=json.dumps(error))


	async def chat_message(self, event):
		# Send message to WebSocket
		await self.send(text_data=json.dumps({
			'type': 'text',
			'message': event['message'],
			'room_id': event['room_id'],
			'sender': event['sender'],
			'timestamp': event['timestamp'],
			'sender_id': event['sender_id']
		}))

	async def game_invitation_message(self, event):
		"""Send game invitation to WebSocket"""
		await self.send(text_data=json.dumps({
			'type': 'game_invitation',
			'message': event['message'],
			'room_id': event['room_id'],
			'sender': event['sender'],
			'timestamp': event['timestamp'],
			'sender_id': event['sender_id']
		}))
