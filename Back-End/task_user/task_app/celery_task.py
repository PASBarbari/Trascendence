from celery import shared_task
from .models import *
import requests, dictionaries

@shared_task
def task_notify():
	# t = Tasks.objects.all()
	# p = Progresses.objects.all()
	# u = []
	# d = dict()
	# for x in t:
	# 	for y in p:
	# 		if y.task.id == x.id:
	# 			u.append(y.user)
	# 	d[x.id] = u
	# 	u.clear()
	print('ciao')
		