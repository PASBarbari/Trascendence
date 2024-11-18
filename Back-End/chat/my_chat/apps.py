from django.apps import AppConfig

class MyChatConfig(AppConfig):
	default_auto_field = 'django.db.models.BigAutoField'
	name = 'my_chat'

	def ready(self):
		try:
			from .authentications import register_self , user_register_self
			from .admin import create_superuser
			#user_register_self()
			#print("User login successful")
			register_self()
		except Exception as e:
            # Optionally log the exception
			print(f"Error during registration: {e}")
			pass