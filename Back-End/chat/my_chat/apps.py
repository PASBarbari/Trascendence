from django.apps import AppConfig

class MyChatConfig(AppConfig):
	default_auto_field = 'django.db.models.BigAutoField'
	name = 'my_chat'

	def ready(self):
		try:
			# from .authentications import register_self
			from .admin import create_superuser
			from .signals import chat_room_created
			#user_register_self()
			#print("User login successful")
			# register_self()
		except Exception as e:
            # Optionally log the exception
			print(f"Error during registration: {e}")
			pass