from django.apps import AppConfig

class UserAppConfig(AppConfig):
	default_auto_field = 'django.db.models.BigAutoField'
	name = 'user_app'

	def ready(self):
		try:
			# from .authentications import register_self , user_register_self
			from .admin import create_superuser
			from .friend_status_pub import FriendStatusPublisher
			FriendStatusPublisher().start_publisher()
		except Exception as e:
            # Optionally log the exception
			print(f"Error during registration: {e}")
			pass