from django.apps import AppConfig


class MyLoginConfig(AppConfig):
	default_auto_field = 'django.db.models.BigAutoField'
	name = 'my_login'

	def ready(self):
			from .signals import create_oauth2_application_and_superuser_signal
			print('Created superuser and OAuth2 application')