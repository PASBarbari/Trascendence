from datetime import timezone
from django.db import models
from Notifications.settings import Microservices , Types
from .consumers import UserNotificationConsumer

class BaseNotification(models.Model):
	id = models.AutoField(primary_key=True)
	Sender = models.CharField(max_length=20, choices=Microservices)
	message = models.TextField()
	is_sent = models.BooleanField(default=False)
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
	# def send(self):
	# 	if (send_notification(self.user_id, self.group_id, self.message)):
	# 		SentNotification.objects.create(
	# 			user_id=self.user_id,
	# 			group_id=self.group_id,

	# 			message=self.message,
	# 			is_read=self.is_read,
	# 			creation_time=self.creation_time
	# 		)
	# 		self.delete()
	# 		return True
	# 	else:
	# 		QueuedNotification.objects.create(
	# 			user_id=self.user_id,
	# 			group_id=self.group_id,
	# 			message=self.message,
	# 			is_read=self.is_read,
	# 			creation_time=self.creation_time
	# 		)
	# 		self.delete()
	# 		return False
	pass		
	
class QueuedNotification(UserNotification, GroupNotification):
	def save(self, *args, **kwargs):
		if self.is_sent is True:
			from .utils import SentNotification
			SentNotification.objects.create(
				user_id=self.user_id,
				group_id=self.group_id,
				message=self.message,
				is_read=self.is_read,
				creation_time=self.creation_time
			)
			self.delete()
		else:
			super().save(*args, **kwargs)


class ScheduledNotification(UserNotification, GroupNotification):
	send_time = models.DateTimeField()

	def on_create(self):
		if self.send_time <= timezone.now():
			ImmediateNotification.objects.create(
				user_id=self.user_id,
				group_id=self.group_id,
				message=self.message,
				is_read=self.is_read,
				creation_time=self.creation_time
			)
			self.delete()
		else:
			from .tasks import send_scheduled_notifications
			send_scheduled_notifications(self.id).apply_async(eta=self.send_time)

class UserProfile(models.Model):
	user_id = models.IntegerField(primary_key=True)
	email = models.EmailField()
	is_staff = models.BooleanField(default=False)
	is_online = models.BooleanField(default=False)

	def get_is_online(self):
		return UserNotificationConsumer.check_online(self.user_id)


class NotificationsGroup(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=100)
	Type = models.CharField(max_length=20, choices=Microservices)
	members = models.ManyToManyField(UserProfile, related_name='Groups')
	owner = models.ForeignKey(UserProfile, related_name='Owner', on_delete=models.CASCADE, default=None, null=True)
