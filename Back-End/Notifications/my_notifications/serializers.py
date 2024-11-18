from rest_framework import serializers
from .models import *

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
	type = serializers.CharField(source='__class__.__name__')