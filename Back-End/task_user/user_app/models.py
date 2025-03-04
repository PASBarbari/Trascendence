from django.db import models
from django.conf import settings


class Avatars(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=255)
	image = models.URLField(max_length=200, default='https://drive.google.com/file/d/1MDi_OPO_HtWyKTmI_35GQ4KjA7uh0Z9U/view?usp=drive_link')
	# image = models.ImageField(upload_to="avatar/", null=True)

class UserProfile(models.Model):
	staff = models.BooleanField(default=False)
	user_id = models.IntegerField(unique=True, primary_key=True)
	email = models.EmailField(max_length=255, unique=True, null=True)
	username = models.CharField(max_length=255, unique=True, default="LVL1_noob")
	first_name = models.CharField(max_length=255, null=True, default="")
	last_name = models.CharField(max_length=255, null=True, default="")
	birth_date = models.DateField(null=True, default=None, blank=True)
	bio = models.TextField(default="", null=True, blank=True)
	exp = models.IntegerField(default=0)
	level = models.IntegerField(default=0)
	avatar = models.ForeignKey(Avatars, null=True, default=None, on_delete=models.SET(1), related_name="picture")
	last_modified = models.DateTimeField(auto_now=True)

class Friendships(models.Model):
	id = models.AutoField(primary_key=True)
	user_1 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='u1')
	user_2 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='u2')
	accepted = models.BooleanField(default=False)
	last_modified = models.DateTimeField(auto_now=True)