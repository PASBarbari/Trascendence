from celery import shared_task
from .models import *
import requests

@shared_task
def task_notify():
	pass