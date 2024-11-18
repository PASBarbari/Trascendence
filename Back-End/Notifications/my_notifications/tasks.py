import logging
from celery import shared_task
from my_notifications.models import *
from my_notifications.views import send_notification

@shared_task
def send_scheduled_notifications(notification_id):
	try:
		notification = ScheduledNotification.objects.get(id=notification_id)
		if (send_notification(notification.user_id, notification.group_id, notification.message)):
			SentNotification.objects.create(
				user_id=notification.user_id,
				group_id=notification.group_id,
				type='SE',
				message=notification.message,
				is_read=notification.is_read,
				creation_time=notification.creation_time
			)
			notification.delete()
		else:
			QueuedNotification.objects.create(
				user_id=notification.user_id,
				group_id=notification.group_id,
				type = 'QU',
				message=notification.message,
				is_read=notification.is_read,
				creation_time=notification.creation_time
			)
			notification.delete()
	except ScheduledNotification.DoesNotExist:
		logger = logging.getLogger(__name__)
		logger.error(f'Notification not found: {notification_id}')