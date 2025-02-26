from django.db import models

# Create your models here.
class User(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(default="")
    age = models.IntegerField(default=0)
