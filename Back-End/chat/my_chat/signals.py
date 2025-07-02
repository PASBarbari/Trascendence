import signal
from django.dispatch import receiver
from django.db.models.signals import post_save
from .models import UserProfile, ChatRoom, ChatMessage
from .notification import ImmediateNotification, SendNotificationSync
from django.db.models.signals import m2m_changed
import logging

logger = logging.getLogger('django')

@receiver(m2m_changed, sender=ChatRoom.users.through)
def chat_room_users_changed(sender, instance, action, pk_set, **kwargs):
	"""
	Signal to handle when users are added to or removed from chat rooms.
	Sends notifications for both chat creation and when users are added to existing chats.
	"""
	if action == 'post_add' and pk_set:
		logger.info(f'Users added to ChatRoom {instance.room_id}: {pk_set}')
		
		# Get the users that were just added
		added_users = UserProfile.objects.filter(user_id__in=pk_set)
		
		# Determine if this is a new chat creation or adding users to existing chat
		total_users = instance.users.count()
		is_new_chat = total_users == len(pk_set)  # If all users are the ones just added, it's a new chat
		
		for user in added_users:
			try:
				if is_new_chat:
					# This is a new chat creation
					notification = ImmediateNotification(
						Sender='Chat',
						message={
							'type': 'chat_room_created',
							'room_id': instance.room_id,
							'room_name': instance.room_name,
							'message': f'You have been added to new chat room "{instance.room_name}"'
						},
						user_id=user.user_id
					)
				else:
					# This is adding users to an existing chat
					notification = ImmediateNotification(
						Sender='Chat',
						message={
							'type': 'chat_room_joined',
							'room_id': instance.room_id,
							'room_name': instance.room_name,
							'message': f'You have been added to chat room "{instance.room_name}"'
						},
						user_id=user.user_id
					)
				
				SendNotificationSync(notification)
				logger.info(f'Notification sent to User {user.user_id} for chat room {instance.room_id}')
				
			except Exception as e:
				logger.error(f'Error sending notification to user {user.user_id}: {str(e)}')