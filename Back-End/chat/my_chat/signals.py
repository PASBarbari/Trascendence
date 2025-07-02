import signal
from django.dispatch import receiver
from django.db.models.signals import post_save
from .models import ChatMember, UserProfile, ChatRoom, ChatMessage
from .notification import ImmediateNotification, SendNotificationSync
from django.db.models.signals import m2m_changed
import logging

logger = logging.getLogger('django')


@receiver(post_save, sender=ChatMember)
def chat_member_added(sender, instance, created, **kwargs):
		"""
		Signal triggered when a ChatMember is created (user added to chat room)
		"""
		if not created:
				return	# Solo per nuovi ChatMember, non per aggiornamenti

		chat_room = instance.chat_room
		user = instance.user
		if user is chat_room.creator:
				logger.info(f'🚨 User {user.user_id} is the creator of ChatRoom {chat_room.room_id}')
				return
		logger.info(f'🚨 User {user.user_id} added to ChatRoom {chat_room.room_id}')
		try:
				# Determina se è una nuova chat o aggiunta a chat esistente
				total_members = chat_room.users.count()

				# Se c'è solo 1 membro, è probabilmente il creatore (nuova chat)
				# Se ci sono 2+ membri, qualcuno è stato aggiunto a chat esistente
				is_new_chat = total_members <= 2	# Adatta questa logica se necessario


				notification_type = 'chat_room_joined'
				message_text = f'You have been added to chat room "{chat_room.room_name}"'

				# Crea la notifica
				notification = ImmediateNotification(
						Sender='Chat',
						message={
								'type': notification_type,
								'data': {
										'room_id': chat_room.room_id,
										'room_name': chat_room.room_name,
										'room_description': chat_room.room_description,
										'creator_id': chat_room.creator.user_id if chat_room.creator else None,
										'creator_name': chat_room.creator.username if chat_room.creator else 'Unknown',
										'user_role': instance.role,
										'total_members': total_members
								}
						},
						user_id=user.user_id
				)

				# Invia la notifica
				SendNotificationSync(notification)
				logger.info(f'✅ Notification sent to user {user.user_id} for chat room {chat_room.room_id}')

		except Exception as e:
				logger.error(f'❌ Error sending notification to user {user.user_id}: {str(e)}')
				print(f"❌ Error in chat_member_added signal: {str(e)}")


# @receiver(m2m_changed, sender=ChatRoom.users.through)
# def chat_room_users_changed(sender, instance, action, pk_set, **kwargs):
# 	"""
# 	Signal to handle when users are added to or removed from chat rooms.
# 	Sends notifications for both chat creation and when users are added to existing chats.
# 	"""
# 	logger.debug(f'ChatRoom users changed: {instance.room_id}, action: {action}, pk_set: {pk_set}')
# 	if action == 'post_add' and pk_set:
# 		logger.info(f'Users added to ChatRoom {instance.room_id}: {pk_set}')

# 		# Get the users that were just added
# 		added_users = UserProfile.objects.filter(user_id__in=pk_set)

# 		# Determine if this is a new chat creation or adding users to existing chat
# 		total_users = instance.users.count()
# 		is_new_chat = total_users == len(pk_set)	# If all users are the ones just added, it's a new chat

# 		for user in added_users:
# 			try:
# 				if is_new_chat:
# 					# This is a new chat creation
# 					notification = ImmediateNotification(
# 						Sender='Chat',
# 						message={
# 							'type': 'chat_room_created',
# 							'room_id': instance.room_id,
# 							'room_name': instance.room_name,
# 							'message': f'You have been added to new chat room "{instance.room_name}"'
# 						},
# 						user_id=user.user_id
# 					)
# 				else:
# 					# This is adding users to an existing chat
# 					notification = ImmediateNotification(
# 						Sender='Chat',
# 						message={
# 							'type': 'chat_room_joined',
# 							'room_id': instance.room_id,
# 							'room_name': instance.room_name,
# 							'message': f'You have been added to chat room "{instance.room_name}"'
# 						},
# 						user_id=user.user_id
# 					)

# 				SendNotificationSync(notification)
# 				logger.info(f'Notification sent to User {user.user_id} for chat room {instance.room_id}')

# 			except Exception as e:
# 				logger.error(f'Error sending notification to user {user.user_id}: {str(e)}')