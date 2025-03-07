from django.db import models
from django.db.models import Q


class Avatars(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=255)
	image = models.URLField(max_length=200, default='https://drive.google.com/file/d/1MDi_OPO_HtWyKTmI_35GQ4KjA7uh0Z9U/view?usp=drive_link')
	user = models.ForeignKey('UserProfile', on_delete=models.CASCADE, related_name='avatar')
	last_modified = models.DateTimeField(auto_now=True)
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
		
	friends = models.ManyToManyField(
		'self', 
		through='Friendships',
		through_fields=('user_1', 'user_2'),
		symmetrical=False,  # Allow user_1 to be friends with user_2 without user_2 being friends with user_1
		related_name='related_to'
	)
	blocked_users = models.ManyToManyField('self', related_name='blocked_by', symmetrical=False)

	def block_user(self, user):
		self.blocked_users.add(user)
	
	def unblock_user(self, user):
		self.blocked_users.remove(user)

	def is_blocked(self, user):
		return self.blocked_users.filter(pk=user.pk).exists()

class Friendships(models.Model):
	id = models.AutoField(primary_key=True)
	user_1 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='u1')
	user_2 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='u2')
	accepted = models.BooleanField(default=False)
	last_modified = models.DateTimeField(auto_now=True)
		
	class Meta:
		unique_together = ('user_1', 'user_2')
	
	def get_friends(user):
	# Get friendships where user is either user_1 or user_2 and accepted=True
		return UserProfile.objects.filter(
		Q(u1__user_2=user, u1__accepted=True) |
		Q(u2__user_1=user, u2__accepted=True)
	)
	def are_friends(user1, user2):
		return Friendships.objects.filter(
			(Q(user_1=user1, user_2=user2) | Q(user_1=user2, user_2=user1)),
			accepted=True
		).exists()