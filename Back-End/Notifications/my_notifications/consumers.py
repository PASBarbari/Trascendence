import json
import logging
from channels.layers import get_channel_layer
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger('django')
import json

class UserNotificationConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		try:
			logger.info(f"Notification WebSocket connection attempt for user: {self.scope.get('user', 'Unknown')}")
			
			self.user = self.scope['user']
			
			# Check if user is authenticated
			if not hasattr(self.user, 'user_id'):
				logger.warning(f"Unauthenticated user attempted to connect: {self.user}")
				await self.close(code=4001)
				return
				
			self.group_name = f'user_notifications_{self.user.user_id}'
			
			# Test Redis connection
			await self.log_redis_connection()

			await self.channel_layer.group_add(
				self.group_name,
				self.channel_name
			)

			await self.accept()
			await self.set_user_online()
			logger.info(f"User {self.user.user_id} successfully connected to notifications WebSocket")

		except Exception as e:
			logger.error(f"Error in notifications connect: {e}")
			await self.close(code=4000)
		# queued_notifications = await self.get_queued_notifications()
		# for notification in queued_notifications:
		# 	await self.send(text_data=json.dumps(notification.message))
		# 	await self.mark_notification_as_sent(notification)

	async def disconnect(self, close_code):
		try:
			logger.info(f"User {getattr(self, 'user', 'Unknown')} disconnecting from notifications WebSocket with code {close_code}")
			await self.set_user_offline()

			if hasattr(self, 'group_name'):
				await self.channel_layer.group_discard(
					self.group_name,
					self.channel_name
				)
			logger.info(f"User {getattr(self, 'user', 'Unknown')} successfully disconnected")
		except Exception as e:
			logger.error(f"Error in disconnect: {e}")

	async def receive(self, text_data):
		try:
			logger.info(f"Received message from user {getattr(self, 'user', 'Unknown')}: {text_data}")
			data = json.loads(text_data)
			# Handle received data if needed
		except Exception as e:
			logger.error(f"Error in receive: {e}")

	async def send_notification(self, event):
		try:
			await self.send(text_data=json.dumps(event['message']))
			logger.info(f"Sent notification: {event['message']}")
		except Exception as e:
			logger.error(f"Error in send_notification: {e}")

	async def check_online(self, event):
		try:
			await self.send(text_data=json.dumps({'is_online': True}))
		except Exception as e:
			logger.error(f"Error in check_online: {e}")

	@database_sync_to_async
	def set_user_online(self):
		try:
			from .models import UserProfile
			UserProfile.objects.filter(user_id=self.user.user_id).update(is_online=True)
			logger.info(f"User {self.user.user_id} set to online")
		except Exception as e:
			logger.error(f"Error in set_user_online: {e}")

	@database_sync_to_async
	def set_user_offline(self):
		try:
			from .models import UserProfile
			UserProfile.objects.filter(user_id=self.user.user_id).update(is_online=False)
			logger.info(f"User {self.user.user_id} set to offline")
		except Exception as e:
			logger.error(f"Error in set_user_offline: {e}")

	@database_sync_to_async
	def get_queued_notifications(self):
		try:
			from .models import QueuedNotification
			notifications = QueuedNotification.objects.filter(user_id=self.user.user_id, is_sent=False)
			logger.info(f"Retrieved {notifications.count()} queued notifications for user {self.user.user_id}")
			return notifications
		except Exception as e:
			logger.error(f"Error in get_queued_notifications: {e}")
			return []

	@database_sync_to_async
	def mark_notification_as_sent(self, notification):
		try:
			notification.is_sent = True
			notification.save()
			logger.info(f"Marked notification {notification.id} as sent")
		except Exception as e:
			logger.error(f"Error in mark_notification_as_sent: {e}")

	async def log_redis_connection(self):
		try:
			# Test della connessione Redis
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

class GroupNotificationConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		self.group_id = self.scope['url_route']['kwargs']['group_id']
		self.group_name = f'group_notifications_{self.group_id}'

		await self.channel_layer.group_add(
			self.group_name,
			self.channel_name
		)

		await self.accept()

	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(
			self.group_name,
			self.channel_name
		)

	async def receive(self, text_data):
		pass

	async def send_notification(self, event):
		
		message = event['text']

		await self.channel_layer.group_send(
			self.group_name,
			{
				'type': 'send_notification',
				'text': message
			}
		)
		from .models import NotificationsGroup
		group = NotificationsGroup.objects.get(id=self.group_id)
		users_in_group = group.users.all()


		for user in users_in_group:
			user_group_name = f'notifications_{user.user_id}'

			# Check if the user is online
			online = await self.check_user_online(user_group_name)

			if not online:
				from .models import QueuedNotification

				QueuedNotification.objects.create(
					user_id=user.user_id,
					group_id=None,
					message=message,
					is_read=False
				)

	async def check_online(self, event):
		await self.send(text_data=json.dumps({'is_online': True}))


