from django.db import models
from django.conf import settings
from user_app.models import Users

# Create your models here.
class Game(models.Model):
	id = models.AutoField(primary_key=True)
	player_1 = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='p1')
	player_2 = models.ForeignKey(Users, on_delete=models.CASCADE, null=True, related_name='p2')
	player_1_score = models.IntegerField(default=0)
	player_2_score = models.IntegerField(default=0)
	date = models.DateTimeField(auto_now_add=True)