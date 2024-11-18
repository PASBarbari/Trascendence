from django.db import models

# Create your models here.

class UserProfile(models.Model):
	user_id = models.IntegerField(primary_key=True)
	username = models.CharField(max_length=255, null=True)
	is_staff = models.BooleanField(default=False)

class ChatRoom(models.Model):
	room_id = models.AutoField(primary_key=True)
	room_name = models.CharField(max_length=100)
	room_description = models.TextField()
	users = models.ManyToManyField(UserProfile)
	creation_time = models.DateTimeField(auto_now_add=True)
	creator = models.ForeignKey(UserProfile, related_name='creator', on_delete=models.SET_NULL, null=True)

	def get_user_number(self):
		return self.users.count()

class ChatMessage(models.Model):
	message_id = models.AutoField(primary_key=True)
	room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE)
	message = models.TextField()
	sender = models.TextField()
	timestamp = models.DateTimeField(auto_now_add=True)

def get_user_model(user_id):
	return UserProfile.objects.get(user_id=user_id)