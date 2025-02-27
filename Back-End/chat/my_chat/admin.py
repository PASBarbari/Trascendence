from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from chat.settings import ADMIN
# Register your models here.

User = get_user_model()

@receiver(post_migrate)
def create_superuser(sender, **kwargs):
    if not User.objects.filter(email=ADMIN['email']).exists():
        User.objects.create_superuser(email=ADMIN['email'], password=ADMIN['password'])
        print('Superuser created successfully.')