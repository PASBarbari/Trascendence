
from .models import Tasks
from user_app.models import Avatars, Users
from django.db.models.signals import post_migrate  # type: ignore
from django.dispatch import receiver  # type: ignore

def CreateTasks(**kwargs):
	if not Avatars.objects.all():
		a = Avatars.objects.create(
			name = 'default avatar',
			image = 'avatar/cloud.png'
		)
		a.save()
	if not Users.objects.all():
		u = Users.objects.create(
			account_id= 1,
    		first_name= "mario",
    		last_name= "rossi",
    		birth_date= "2000-1-1",
    		bio= "bio dei miei ciglioni",
    		avatar= Avatars.objects.get(id=1)
		)
		u.save()
		u = Users.objects.create(
			account_id= 2,
    		first_name= "vincenzo",
    		last_name= "bianchi",
    		birth_date= "1999-11-4",
    		bio= "bio dei miei ciglioni",
    		avatar= Avatars.objects.get(id=1)
		)
		u.save()
		u = Users.objects.create(
			account_id= 3,
			staff= True,
    		first_name= "guglielmo",
    		last_name= "duranti",
    		birth_date= "1900-11-4",
    		bio= "ma ti fanno anche da uomo",
    		avatar= Avatars.objects.get(id=1)
		)
		u.save()
	if not Tasks.objects.all():
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='walk',
            description='walk at least 10k step each day',
            duration='7 00:00:00',
            exp=1000,
            category='SP'
        )
		t.save()
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='run',
            description='improve your body health step by step',
            duration='30 00:00:00',
            exp=2000,
            category='SP',
            previous_task=Tasks.objects.get(id=1)
        )
		t.save()
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='drink water',
            description='drink 2l of water a day',
            duration='7 00:00:00',
            exp=500,
            category='HE'
        )
		t.save()
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='read a book',
            description='read at least 30 pages of a book',
            duration='7 00:00:00',
            exp=800,
            category='ED'
        )
		t.save()
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='write an essay',
            description='write a 1000-word essay',
            duration='14 00:00:00',
            exp=1500,
            category='ED',
            previous_task=Tasks.objects.get(id=4)
        )
		t.save()
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='draw a sketch',
            description='draw a sketch every day',
            duration='7 00:00:00',
            exp=700,
            category='AR'
        )
		t.save()
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='paint a picture',
            description='paint a picture',
            duration='14 00:00:00',
            exp=1400,
            category='AR',
            previous_task=Tasks.objects.get(id=6)
        )
		t.save()
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='volunteer',
            description='volunteer at a local charity',
            duration='7 00:00:00',
            exp=900,
            category='SS'
        )
		t.save()
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='organize an event',
            description='organize a community event',
            duration='30 00:00:00',
            exp=1800,
            category='SS',
            previous_task=Tasks.objects.get(id=8)
        )
		t.save()
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='meditate',
            description='meditate for 20 minutes',
            duration='7 00:00:00',
            exp=600,
            category='MD'
        )
		t.save()
		t = Tasks.objects.create(
            author=Users.objects.get(id=3),
            name='practice mindfulness',
            description='practice mindfulness exercises',
            duration='14 00:00:00',
            exp=1200,
            category='MD',
            previous_task=Tasks.objects.get(id=10)
        )
		t.save()


@receiver(post_migrate)
def CreateTasksSignal(sender, **kwargs):
	CreateTasks()
	print('done')