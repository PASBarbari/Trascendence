import signal
from django.dispatch import receiver
from django.db.models.signals import post_save
from .models import UserProfile, ChatRoom, ChatMessage
from .notification import ImmediateNotification, SendNotificationSync

# @receiver(post_save, sender=ChatRoom)
# def chat_room_created(sender, instance, created, **kwargs):
# 	if created:
# 		print(f'ChatRoom object: {instance}')
# 		print(f'ChatRoom object: {instance.users.count()}')
# 		if instance.users.count() > 0:
# 			for user in instance.users.all():
# 				print('passed')
# 				notification = ImmediateNotification(
# 				Sender='Chat',
# 				message=f'Chat Room {instance.room_id} created',
# 				user_id=user.user_id
# 				)
# 				SendNotificationSync(notification)
# 				print(f'Notification Sent to User {user.user_id}')

from django.db.models.signals import m2m_changed

@receiver(m2m_changed, sender=ChatRoom.users.through)
def chat_room_created(sender, instance, action, **kwargs):
    if action == 'post_add':
        print(f'ChatRoom object: {instance}')
        print(f'ChatRoom object: {instance.users.count()}')
        if instance.users.count() > 0:
            for user in instance.users.all():
                print('passed')
                notification = ImmediateNotification(
                    Sender='Chat',
                    message=f'Chat Room {instance.room_id} created',
                    user_id=user.user_id
                )
                SendNotificationSync(notification)
                print(f'Notification Sent to User {user.user_id}')