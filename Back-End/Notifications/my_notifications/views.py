from django.shortcuts import render
from rest_framework import viewsets , generics
from rest_framework.response import Response
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import *
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ViewSet):
	def send_notification(self, user_id, group_id, notification):
		if user_id is not None:
			self.send_user_notification(user_id, notification)
		elif group_id is not None:
			self.send_group_notification(group_id, notification)
		else:
			return Response({'error': 'No user or group specified'})
	
	def send_user_notification(user_id, notification):
		channel_layer = get_channel_layer()
		serialized_notification = NotificationSerializer(notification)
		is_online = async_to_sync(channel_layer.group_send)(
			f'notifications_{user_id}',
			{
				'type': 'check_online',
				'text': 'Checking if user is online'
			}
		)
		if is_online:
			async_to_sync(channel_layer.group_send)(
				f'notifications_{user_id}',
				{
					'type': 'notification',
					'text': serialized_notification
				}
			)
		else:
			QueuedNotification.objects.create(
				is_sent=False,
				UserNotification=serialized_notification
			)

class NewUser(generics.CreateView):
	model = UserProfile
	fields = ['user_id', 'email', 'is_online']
