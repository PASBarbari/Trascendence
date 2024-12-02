from django.shortcuts import render
from rest_framework import viewsets , generics
from rest_framework.response import Response
from asgiref.sync import async_to_sync
from rest_framework import permissions , status
from channels.layers import get_channel_layer
from .models import ImmediateNotification, QueuedNotification, ScheduledNotification, NotificationsGroup
from .serializers import UniversalNotificationSerializer, UserProfileSerializer , NotificationsGroupSerializer , ImmediateNotificationSerializer , ScheduledNotificationSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.views import APIView
from rest_framework.pagination import CursorPagination
from .middleware import APIKeyPermission

def send_notification(user_id, group_id, notification):
		if user_id is not None:
			return send_user_notification(user_id, notification)
		# elif group_id is not None:
		# 	return send_group_notification(group_id, notification)
		else:
			return Response({'error': 'No user or group specified'})
	
def send_user_notification(user_id, notification):
		channel_layer = get_channel_layer()
		serialized_notification = UniversalNotificationSerializer(notification)
		print(f'Sending notification to user {user_id}')
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
	permissionClasses = [APIKeyPermission]
	serializer_class = UserProfileSerializer
	fields = ['user_id', 'email', 'is_online']

class NewNotification(generics.CreateAPIView):
    permission_classes = [APIKeyPermission]

    def get_queryset(self):
        ImmediateNotifications = ImmediateNotification.objects.all()
        ScheduledNotifications = ScheduledNotification.objects.all()
        return ImmediateNotifications.union(ScheduledNotifications)

    def get_serializer_class(self):
        send_time = self.request.data.get('send_time', None)
        if send_time is None:
            return ImmediateNotificationSerializer
        else:
            return ScheduledNotificationSerializer

class CursorNotificationPagination(CursorPagination):
	page_size = 10
	ordering = '-creation_time'

class SentNotification(generics.ListAPIView):
	from .models import SentNotification
	# permissionClasses = (permissions.AllowAny,)
	serializer_class = UniversalNotificationSerializer
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['user_id', 'group_id']
	queryset = SentNotification.objects.all()

class GroupNotification(generics.ListCreateAPIView):
	# permissionClasses = (permissions.AllowAny,)
	serializer_class = NotificationsGroupSerializer
	filter_backends = [DjangoFilterBackend]
	filterset_fields = ['group_id']
	queryset = ImmediateNotification.objects.all()

class AddUserToGroupView(APIView):
	def post(self, request, group_id):
		serializer = UserProfileSerializer(data=request.data)
		if serializer.is_valid():
			user_id = serializer.data['user_id']
			try:
				from .models import UserProfile
				UserProfile.objects.get(user_id=user_id)
			except UserProfile.DoesNotExist:
				return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

			try:
				group = NotificationsGroup.objects.get(id=group_id)
				group.users.add(user_id)
				group.save()
				return Response({'success': 'User added to group'}, status=status.HTTP_200_OK)
			except NotificationsGroup.DoesNotExist:
				return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
		else:
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)