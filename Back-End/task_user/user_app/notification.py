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

class BaseNotification(models.Model):
	id = models.AutoField(primary_key=True)
	Sender = models.CharField(max_length=20, choices=Microservices)
	message = models.TextField()

	class Meta:
		abstract = True

class UserNotification(BaseNotification):
	user_id = models.IntegerField(primary_key=True, default=None)

	class Meta:
		abstract = True

class GroupNotification(BaseNotification):
	group_id = models.IntegerField(primary_key=True, default=None)

	class Meta:
		abstract = True

class ImmediateNotification(UserNotification, GroupNotification):
	pass

class ScheduledNotification(UserNotification, GroupNotification):
	pass