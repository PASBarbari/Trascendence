
from .models import Tasks
from user_app.models import Avatars, Users
from django.db.models.signals import post_migrate
from django.dispatch import receiver

def CreateTasks(**kwargs):
	if not Avatars.objects.all():
		a = Avatars.objects.create(
			name = 'default avatar',
			image = 'avatar/cloud.png'
		)
		a.save()
	# if not Users.objects.all():
	# 	u = Users.objects.create(
	# 		account_id= 1,
  #   		first_name= "mario",
  #   		last_name= "rossi",
  #   		birth_date= "2000-1-1",
  #   		bio= "bio dei miei ciglioni",
  #   		avatar= Avatars.objects.get(id=1)
	# 	)
	# 	u.save()
	# 	u = Users.objects.create(
	# 		account_id= 2,
  #   		first_name= "vincenzo",
  #   		last_name= "bianchi",
  #   		birth_date= "1999-11-4",
  #   		bio= "bio dei miei ciglioni",
  #   		avatar= Avatars.objects.get(id=1)
	# 	)
	# 	u.save()
	# 	u = Users.objects.create(
	# 		account_id= 3,
	# 		staff= True,
  #   		first_name= "guglielmo",
  #   		last_name= "duranti",
  #   		birth_date= "1900-11-4",
  #   		bio= "ma ti fanno anche da uomo",
  #   		avatar= Avatars.objects.get(id=1)
	# 	)
	# 	u.save()
	# if not Tasks.objects.all():
	# 	t = Tasks.objects.create(
	# 		author = Users.objects.get(id=2),
	# 		name = 'walk',
	# 		description = 'walk at least 10k step each day',
	# 		duration = '7 00:00:00',
	# 		exp = 1000,
	# 		category = 'SP'
	# 	)
	# 	t.save()
	# 	t = Tasks.objects.create(
	# 		author = Users.objects.get(id=2),
	# 		name = 'run',
	# 		description = 'improve your body health step by step',
	# 		duration = '30 00:00:00',
	# 		exp = 2000,
	# 		category = 'SP',
	# 		previous_task = Tasks.objects.get(id=1)
	# 	)
	# 	t.save()
	# 	t = Tasks.objects.create(
	# 		author = Users.objects.get(id=2),
	# 		name = 'drink water',
	# 		description = 'drink 2l of water a day',
	# 		duration = '7 00:00:00',
	# 		exp = 500,
	# 		category = 'HE'
	# 	)
	# 	t.save()
	

@receiver(post_migrate)
def CreateTasksSignal(sender, **kwargs):
	CreateTasks()
	print('done')