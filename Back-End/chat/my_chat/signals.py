import signal
from django.dispatch import receiver
from django.db.models.signals import post_save
from .models import UserProfile, ChatRoom, ChatMessage
from .notification import ImmediateNotification, SendNotificationSync

@receiver(post_save, sender=ChatRoom)
def chat_room_created(sender, instance, created, **kwargs):
	if created:
		for user in instance.users.all():
				print('passed')
				notification = ImmediateNotification(
				Sender='Chat',
				message=f'Chat Room {instance.room_id} created',
				user_id=user.user_id
				)
				SendNotificationSync(notification)
				print(f'Notification Sent to User {user.user_id}')