# my_login/signals.py

import secrets
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from oauth2_provider.models import Application
from login.settings import client

User = get_user_model()


def create_oauth2_application_and_superuser(**kwargs):
	# Create superuser if it doesn't exist
	if not User.objects.filter(email='pasquale@example.com').exists():
		User.objects.create_superuser(email='pasquale@example.com', password='123')

		# Create OAuth2 application if it doesn't exist
	if Application.objects.filter(name = 'my_login').exists():
		return

	client_id = client['CLIENT_ID']
	client_secret = client['CLIENT_SECRET']
	# Create OAuth2 application
	application = Application.objects.create(
		name='my_login',
		client_id=client_id,
		client_secret=client_secret,
		client_type=Application.CLIENT_CONFIDENTIAL,
		authorization_grant_type=Application.GRANT_PASSWORD,
		redirect_uris='',
	)
	# Add all permissions to the application
	application.scope = '__all__'
	application.save()
	if application:
		print('Created OAuth2 application')


from oauth2_provider.signals import app_authorized

def handle_app_authorized(sender, request, token, **kwargs):
    print(f'App {token.application.name=} was authorized')

app_authorized.connect(handle_app_authorized)

@receiver(post_migrate)
def create_oauth2_application_and_superuser_signal(sender, **kwargs):
	create_oauth2_application_and_superuser()
	print('Created superuser and OAuth2 application')