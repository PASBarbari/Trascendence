from django.http import JsonResponse
from django.shortcuts import render
from rest_framework import viewsets, generics
from rest_framework.response import Response
from asgiref.sync import async_to_sync, sync_to_async
from rest_framework import status
from channels.layers import get_channel_layer
from .models import ImmediateNotification, QueuedNotification, ScheduledNotification, NotificationsGroup, SentNotification
from .serializers import UniversalNotificationSerializer, UserProfileSerializer, NotificationsGroupSerializer, ImmediateNotificationSerializer, ScheduledNotificationSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.views import APIView
from rest_framework.pagination import CursorPagination
from .middleware import ServiceAuthentication
from django.views.decorators.csrf import csrf_exempt

def send_notification(user_id, group_id, notification):
	if user_id is not None:
		return async_to_sync(send_user_notification)(user_id, notification)
	# elif group_id is not None:
	# 	return send_group_notification(group_id, notification)
	else:
		return Response({'error': 'No user or group specified'})

async def send_user_notification(user_id, notification):
	channel_layer = get_channel_layer()
	if isinstance(notification, ImmediateNotification):
		model = ImmediateNotification
	elif isinstance(notification, QueuedNotification):
		model = QueuedNotification
	elif isinstance(notification, ScheduledNotification):
		model = ScheduledNotification
	else:
		raise ValueError("Unsupported notification type")

	serialized_notification = UniversalNotificationSerializer(notification, model=model).data
	print(f'Sending notification to user {user_id}')
		
	try:
		await channel_layer.group_send(
			f'user_notifications_{user_id}',
			{
				'type': 'send_notification',
				'message': serialized_notification,
			}
		)
		print(f"Notification sent to user {user_id}")
		
		# Creazione della SentNotification
		await sync_to_async(SentNotification.objects.create)(
			id=notification.id,
			user_id=user_id,
			group_id=None,
			message=notification.message,
			is_sent=True
		)
		
		# Cancellazione della vecchia ImmediateNotification
		await sync_to_async(notification.delete)()
		return True
	except Exception as e:
		print(f"Error sending notification: {e}")
		
		# Creazione della QueuedNotification
		await sync_to_async(QueuedNotification.objects.create)(
			user_id=user_id,
			group_id=notification.group_id,
			message=serialized_notification,
			is_sent=False
		)
		return False

class NewUser(generics.CreateAPIView):
	permission_classes = []
	authentication_classes = [ServiceAuthentication]
	serializer_class = UserProfileSerializer
	fields = ['user_id', 'email', 'is_online']

class NewNotification(generics.CreateAPIView):
	permission_classes = []
	authentication_classes = [ServiceAuthentication]
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

class SentNotificationAPIview(generics.ListAPIView):
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
				group.users.set([user_id])  # Usa il metodo set() per assegnare l'utente al gruppo
				group.save()
				return Response({'success': 'User added to group'}, status=status.HTTP_200_OK)
			except NotificationsGroup.DoesNotExist:
				return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
		else:
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@csrf_exempt
def health_check(request):
	return JsonResponse({'status': 'ok'})