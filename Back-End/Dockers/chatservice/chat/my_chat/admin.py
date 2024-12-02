from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db.models.signals import post_migrate
from django.dispatch import receiver

# Register your models here.

User = get_user_model()

@receiver(post_migrate)
def create_superuser(sender, **kwargs):
    if not User.objects.filter(email='pasquale@example.com').exists():
        User.objects.create_superuser(username='pasquale', email='pasquale@example.com', password='123')
        print('Superuser created successfully.')