from django.apps import AppConfig


class PongAppConfig(AppConfig):
	default_auto_field = 'django.db.models.BigAutoField'
	name = 'pong_app'

	def ready(self):
		try:
			import pong_app.signals
			# from .authentications import register_self , user_register_self
			# register_self()
		except Exception as e:
			print(f"Error during registration: {e}")
	

