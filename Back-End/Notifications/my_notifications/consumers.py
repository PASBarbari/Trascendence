from channels.layers import get_channel_layer
from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .models import QueuedNotification , UserProfile , NotificationsGroup

class UserNotificationConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		self.user = self.scope['user']
		self.group_name = f'user_notifications_{self.user.id}'

		await self.channel_layer.group_add(
			self.group_name,
			self.channel_name
		)

		await self.accept()

		UserProfile.objects.filter(user_id=self.user.id).update(is_online=True)

		queued_notifications = QueuedNotification.objects.filter(user_id=self.user.id, is_sent=False)
		for notification in queued_notifications:
			await self.send(text_data=json.dumps(notification.message))
			notification.is_sent = True
			notification.save() # after the save the notifications are moved elsewhere

	async def disconnect(self, close_code):
		
		UserProfile.objects.filter(user_id=self.user.id).update(is_online=False)

		await self.channel_layer.group_discard(
			self.group_name,
			self.channel_name
		)

	async def receive(self, text_data):
		pass

	async def send_notification(self, event):
		await self.send(text_data=json.dumps(event['text']))

	async def check_online(self, event):
		if await self.send(text_data=json.dumps({'is_online': True})):
			return True
		else:
			return False

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

		group = NotificationsGroup.objects.get(id=self.group_id)
		users_in_group = group.users.all()


		for user in users_in_group:
			user_group_name = f'notifications_{user.user_id}'

			# Check if the user is online
			online = await self.check_user_online(user_group_name)

			if not online:
				QueuedNotification.objects.create(
					user_id=user.user_id,
					group_id=None,
					message=message,
					is_read=False
				)

	async def check_online(self, event):
		await self.send(text_data=json.dumps({'is_online': True}))


	