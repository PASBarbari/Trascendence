from celery import shared_task
from .models import *
from django.db import models
import os

Microservices = {
	'Login': os.getenv('LOGIN_SERVICE', 'http://localhost:8000'),
	'Chat': os.getenv('CHAT_SERVICE', 'http://localhost:8001'),
	'Users': os.getenv('USERS_SERVICE', 'http://localhost:8002'),
	'Notifications': os.getenv('NOTIFICATIONS_SERVICE', 'http://localhost:8003'),
	'Personal' : "Self",
}

Types = {
	'IM' : 'Immediate',
	'QU' : 'Queued',
	'SC' : 'Scheduled',
	'SE' : 'Sent',
}

class UserProfile(models.Model):
	user_id = models.IntegerField(primary_key=True)
	email = models.EmailField()
	is_staff = models.BooleanField(default=False)
	is_online = models.BooleanField(default=False)

class NotificationsGroup(models.Model):
	id = models.IntegerField(primary_key=True)
	name = models.CharField(max_length=100)
	Type = models.CharField(max_length=20, choices=Microservices)
	members = models.ManyToManyField(UserProfile, related_name='Groups')

class BaseNotification(models.Model):
	id = models.AutoField(primary_key=True)
	Sender = models.CharField(max_length=20, choices=Microservices)
	message = models.TextField()

	class Meta:
		abstract = True

class UserNotification(BaseNotification):
	user_id = models.IntegerField(default=None)

	class Meta:
		abstract = True

class GroupNotification(BaseNotification):
	group_id = models.IntegerField(default=None)

	class Meta:
		abstract = True

class ImmediateNotification(UserNotification, GroupNotification):
	pass

class ScheduledNotification(UserNotification, GroupNotification):
	send_time = models.DateTimeField()

@shared_task
def task_notify():
	noty = ScheduledNotification.objects.create(
		Sender='Users',
		message='vacca boia',
		user_id=1,
		group=None,
		send_time='12-12-24 12:00:00'
	)