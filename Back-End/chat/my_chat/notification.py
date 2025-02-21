from django.db import models
import os
import asyncio
import aiohttp
from chat.settings import Microservices

Types = {
	'IM' : 'Immediate',
	'QU' : 'Queued',
	'SC' : 'Scheduled',
	'SE' : 'Sent',
}

class BaseNotification(models.Model):
	id = models.AutoField(primary_key=True)
	Sender = models.CharField(max_length=200, choices=[(key, key) for key in Microservices.keys()])
	message = models.TextField()

	class Meta:
		abstract = True

class UserNotification(BaseNotification):
	user_id = models.IntegerField(default=None, null=True)

	class Meta:
		abstract = True

class GroupNotification(BaseNotification):
	group_id = models.IntegerField(default=None, null=True)

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
		
import requests
from rest_framework import serializers

class ImmediateNotificationSerializer(serializers.ModelSerializer):
	class Meta:
		model = ImmediateNotification
		fields = '__all__'

class ScheduledNotificationSerializer(serializers.ModelSerializer):
	class Meta:
		model = ScheduledNotification
		fields = '__all__'



def SendNotificationSync(notification):
		notification_url = Microservices['Notifications'] + '/notification/new/'
		try:
				# Serializza l'oggetto notification
				serialized_notification = ImmediateNotificationSerializer(notification).data
				headers = {
					'Content-Type': 'application/json',
					'X-API-KEY': os.getenv('API_KEY', "123")
							 }
				response = requests.post(notification_url,headers=headers, json=serialized_notification)
				print(f"response.json(): {response.json()}")
				return response.status_code
		except requests.RequestException as e:
				print(f"Error sending notification: {e}")
				return None