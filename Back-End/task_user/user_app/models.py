from django.db import models
from django.conf import settings
import psycopg2

class Avatars(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=255)
    # image = models.ImageField(upload_to="avatar/", null=True)
	image = models.URLField(max_length=200, default='https://drive.google.com/file/d/1MDi_OPO_HtWyKTmI_35GQ4KjA7uh0Z9U/view?usp=drive_link')

class Users(models.Model):
    id = models.AutoField(primary_key=True)
    staff = models.BooleanField(default=False)
    account_id = models.IntegerField(unique=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    birth_date = models.DateField()
    bio = models.TextField(default="")
    exp = models.IntegerField(default=0)
    level = models.IntegerField(default=0)
    avatar = models.ForeignKey(Avatars, on_delete=models.SET(1), related_name="picture")
    last_modified = models.DateTimeField(auto_now=True)

class Friendships(models.Model):
    id = models.AutoField(primary_key=True)
    user_1 = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='u1')
    user_2 = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='u2')
    accepted = models.BooleanField(default=False)
    last_modified = models.DateTimeField(auto_now=True)