import django
django.setup()

from django.core.management import call_command

try:
    call_command("create_oauth_app")
    call_command("create_superuser")
except Exception as e:
    print(f"Error: {e}")
