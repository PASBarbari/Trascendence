from rest_framework import serializers
from .models import ImmediateNotification , QueuedNotification , ScheduledNotification , UserProfile , NotificationsGroup , BaseNotification

class ImmediateNotificationSerializer(serializers.ModelSerializer):
	class Meta:
		model = ImmediateNotification
		fields = '__all__'

class QueuedNotificationSerializer(serializers.ModelSerializer):
	class Meta:
		model = QueuedNotification
		fields = '__all__'

class ScheduledNotificationSerializer(serializers.ModelSerializer):
	class Meta:
		model = ScheduledNotification
		fields = '__all__'

class UserProfileSerializer(serializers.ModelSerializer):
	class Meta:
		model = UserProfile
		fields = '__all__'

class NotificationsGroupSerializer(serializers.ModelSerializer):
	class Meta:
		model = NotificationsGroup
		fields = '__all__'

class UniversalNotificationSerializer(serializers.ModelSerializer):
	notification = serializers.SerializerMethodField()

	class Meta:
		model = BaseNotification
		fields = ['id', 'Type', 'Sender', 'message', 'notification']

	def get_notification(self, obj):
		if isinstance(obj, ImmediateNotification):
			return ImmediateNotificationSerializer(obj).data
		elif isinstance(obj, QueuedNotification):
			return QueuedNotificationSerializer(obj).data
		elif isinstance(obj, ScheduledNotification):
			return ScheduledNotificationSerializer(obj).data
		return None


# class UniversalNotificationSerializer(serializers.ModelSerializer):
# 	notification = serializers.SerializerMethodField()

# 	class Meta:
# 		model = BaseNotification
# 		fields = '__all__'

# 	def get_notification(self, obj):
# 		if obj.Type == 'IM':
# 			return ImmediateNotificationSerializer(obj.immediatenotification).data
# 		elif obj.Type == 'QU':
# 			return QueuedNotificationSerializer(obj.queuednotification).data
# 		elif obj.Type == 'SC':
# 			return ScheduledNotificationSerializer(obj.schedulednotification).data