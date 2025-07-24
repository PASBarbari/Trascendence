from django.apps import AppConfig


class MyNotificationsConfig(AppConfig):
		default_auto_field = 'django.db.models.BigAutoField'
		name = 'my_notifications'

		def ready(self):
				from my_notifications.signals import send_notification, schedule_notification, create_user_profile
				from .friend_status_sub import FriendStatusListener
				FriendStatusListener().start_listener()
				print('Signals registered')
				# from my_notifications.admin import register_self
				# register_self()