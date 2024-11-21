from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ImmediateNotification, ScheduledNotification, UserProfile , NotificationsGroup
from .views import send_notification
import logging


@receiver(post_save, sender=ImmediateNotification)
def send_notification(sender, instance, created, **kwargs):
	if created:
		if (send_notification(instance.user_id, instance.group_id, instance)):
			logger = logging.getLogger(__name__)
			logger.info(f'Notification sent: {instance}')
		else:
			logger = logging.getLogger(__name__)
			logger.error(f'Notification not sent: {instance}')

@receiver(post_save, sender=ScheduledNotification)
def schedule_notification(sender, instance, created, **kwargs):
	if created:
		instance.on_create()
		logger = logging.getLogger(__name__)
		logger.info(f'Notification scheduled: {instance}')

@receiver(post_save, sender=UserProfile)
def create_user_profile(sender, instance, created, **kwargs):
	if created:
		NotificationsGroup.objects.create(
			name='Personal',
			type='Personal',
			members=[instance],
			owner=instance
		)
		logger = logging.getLogger(__name__)
		logger.info(f'User profile created: {instance}')

# @receiver(post_save, sender=NotificationsGroup)
# def create_group(sender, instance, created, **kwargs):
# 	if created:
# 		instance.on_create()
# 		logger = logging.getLogger(__name__)
# 		logger.info(f'Group created: {instance}')
