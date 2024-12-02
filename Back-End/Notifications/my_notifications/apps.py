from django.apps import AppConfig


class MyNotificationsConfig(AppConfig):
		default_auto_field = 'django.db.models.BigAutoField'
		name = 'my_notifications'

		def ready(self):
				from my_notifications.signals import send_notification, schedule_notification, create_user_profile
				print('Signals registered')