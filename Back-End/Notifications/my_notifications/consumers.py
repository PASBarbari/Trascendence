from channels.layers import get_channel_layer
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import json

class UserNotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.user = self.scope['user']
            self.group_name = f'user_notifications_{self.user.id}'

            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            await self.accept()
            await self.set_user_online()

        except Exception as e:
            print(f"Error in connect: {e}")
            queued_notifications = await self.get_queued_notifications()
            for notification in queued_notifications:
                await self.send(text_data=json.dumps(notification.message))
                await self.mark_notification_as_sent(notification)

    async def disconnect(self, close_code):
        try:
            await self.set_user_offline()

            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
        except Exception as e:
            print(f"Error in disconnect: {e}")

    async def receive(self, text_data):
        try:
            pass
        except Exception as e:
            print(f"Error in receive: {e}")

    async def send_notification(self, event):
        try:
            await self.send(text_data=json.dumps(event['text']))
        except Exception as e:
            print(f"Error in send_notification: {e}")

    async def check_online(self, event):
        try:
            if await self.send(text_data=json.dumps({'is_online': True})):
                return True
            else:
                return False
        except Exception as e:
            print(f"Error in check_online: {e}")
            return False

    @database_sync_to_async
    def set_user_online(self):
        try:
            from .models import UserProfile
            UserProfile.objects.filter(user_id=self.user.id).update(is_online=True)
        except Exception as e:
            print(f"Error in set_user_online: {e}")

    @database_sync_to_async
    def set_user_offline(self):
        try:
            from .models import UserProfile
            UserProfile.objects.filter(user_id=self.user.id).update(is_online=False)
        except Exception as e:
            print(f"Error in set_user_offline: {e}")

    @database_sync_to_async
    def get_queued_notifications(self):
        try:
            from .models import QueuedNotification
            return QueuedNotification.objects.filter(user_id=self.user.id, is_sent=False)
        except Exception as e:
            print(f"Error in get_queued_notifications: {e}")
            return []

    @database_sync_to_async
    def mark_notification_as_sent(self, notification):
        try:
            notification.is_sent = True
            notification.save()
        except Exception as e:
            print(f"Error in mark_notification_as_sent: {e}")
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


	