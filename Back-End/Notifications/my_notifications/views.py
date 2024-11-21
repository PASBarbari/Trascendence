from django.shortcuts import render
from rest_framework import viewsets , generics
from rest_framework.response import Response
from asgiref.sync import async_to_sync
from rest_framework import permissions , status
from channels.layers import get_channel_layer
from .models import ImmediateNotification, QueuedNotification, ScheduledNotification, SentNotification
from .serializers import UniversalNotificationSerializer, UserProfileSerializer
from django_filters.rest_frameworks import DjangoFilterBackend
from rest_framework.pagination import CursorPagination
class NotificationViewSet(viewsets.ViewSet):
	def send_notification(self, user_id, group_id, notification):
		if user_id is not None:
			return self.send_user_notification(user_id, notification)
		elif group_id is not None:
			return self.send_group_notification(group_id, notification)
		else:
			return Response({'error': 'No user or group specified'})
	
	def send_user_notification(user_id, notification):
		channel_layer = get_channel_layer()
		serialized_notification = UniversalNotificationSerializer(notification)
		is_online = async_to_sync(channel_layer.group_send)(
			f'notifications_{user_id}',
			{
				'type': 'check_online',
				'text': 'Checking if user is online'
			}
		)
		if is_online:
			sent = async_to_sync(channel_layer.group_send)(
				f'notifications_{user_id}',
				{
					'type': 'notification',
					'text': serialized_notification
				}
			)
			if sent is True:
				SentNotification.objects.create(
					is_sent=True,
					UserNotification=serialized_notification
				)
				notification.delete()
				return sent
			return sent
		else:
			QueuedNotification.objects.create(
				is_sent=False,
				UserNotification=serialized_notification
			)
			return False

class NewUser(generics.CreateAPIView):
	permissionClasses = (permissions.AllowAny,)
	serializer_class = UserProfileSerializer
	fields = ['user_id', 'email', 'is_online']

class NewNotification(generics.CreateAPIView):
	# permissionsClasses = (permissions.AllowAny,)
	serializers = UniversalNotificationSerializer
	def get_queryset(self):
		ImmediateNotifications = ImmediateNotification.objects.all()
		QueuedNotifications = QueuedNotification.objects.all()
		ScheduledNotifications = ScheduledNotification.objects.all()
		return ImmediateNotifications.union(QueuedNotifications, ScheduledNotifications)


class CursorNotificationPagination(CursorPagination):
	page_size = 10
	ordering = '-creation_time'

class SentNotification(generics.ListAPIView):
	# permissionClasses = (permissions.AllowAny,)
	serializer_class = UniversalNotificationSerializer
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['user_id', 'group_id']
	queryset = SentNotification.objects.all()