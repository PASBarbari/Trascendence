from django.db import models
from .models import UserNotification, GroupNotification

class SentNotification(UserNotification, GroupNotification):
	sent_time = models.DateTimeField(auto_now_add=True)