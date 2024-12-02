from django.db import models
import os, aiohttp

Microservices = {
	'Login': os.getenv('loginservice', 'http://localhost:8000'),
	'Chat': os.getenv('chatservice', 'http://localhost:8001'),
	'Users': os.getenv('userService', 'http://localhost:8002'),
	'Notifications': os.getenv('notificationService', 'http://localhost:8003'),
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
	pass

async def SendNotification(Notification):
	noification_url = Microservices['Notifications']
	async with aiohttp.ClientSession() as session:
		async with session.post(noification_url, data=Notification) as response:
			return response.status