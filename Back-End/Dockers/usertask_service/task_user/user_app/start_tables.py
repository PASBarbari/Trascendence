from django.db.models.signals import post_migrate
from django.dispatch import receiver

# def CreateTasks(**kwargs):
# 	if not Tasks.objects.all():
# 		stoca = Tasks.objects.create(
# 			author_id = 1,
# 			name = 'stoca',
# 			description = 'ciao',
# 			duration = '0 10:10:00',
# 			exp = 100,
# 			category = 'SP'
# 		)
# 		stoca.save()


@receiver(post_migrate)
def CreateUsersSignal(sender, **kwargs):
	# CreateTasks()
	print('done')