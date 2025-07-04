import os
from django.db import models
from django.db.models import Q
from django.conf import settings

def avatar_upload_path(instance, filename):
    """Generate upload path for avatar files"""
    # Extract file extension
    ext = filename.split('.')[-1]
    # Generate filename as: avatar_<user_id>_<filename>.<ext>
    filename = f'avatar_{instance.user.user_id}_{filename}'
    return os.path.join('avatars', filename)

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
	current_avatar_url = models.URLField(max_length=500, default='https://drive.google.com/file/d/1MDi_OPO_HtWyKTmI_35GQ4KjA7uh0Z9U/view?usp=drive_link', blank=True)
	last_modified = models.DateTimeField(auto_now=True)
	has_two_factor_auth = models.BooleanField(default=False)


	friends = models.ManyToManyField(
		'self', 
		through='Friendships',
		through_fields=('user_1', 'user_2'),
		symmetrical=False,  # Allow user_1 to be friends with user_2 without user_2 being friends with user_1
		related_name='related_to'
	)
	blocked_users = models.ManyToManyField('self', related_name='blocked_by', symmetrical=False, blank=True)

	def block_user(self, user):
		self.blocked_users.add(user)
	
	def unblock_user(self, user):
		self.blocked_users.remove(user)

	def is_blocked(self, user):
		return self.blocked_users.filter(pk=user.pk).exists()

class Avatars(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to=avatar_upload_path, max_length=500)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='avatars', null=True, blank=True, default=None)
    is_current = models.BooleanField(default=False)
    last_modified = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # If this is marked as current avatar, update the user's avatar URL
        if self.is_current:
            # Unset any other current avatars for this user
            Avatars.objects.filter(user=self.user, is_current=True).exclude(pk=self.pk).update(is_current=False)
            # Update the user's current avatar URL to the full URL
            if self.image:
                self.user.current_avatar_url = f"{settings.MEDIA_URL}{self.image.name}"
                self.user.save(update_fields=['current_avatar_url'])
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        # Delete the actual file when the model instance is deleted
        if self.image:
            if os.path.isfile(self.image.path):
                os.remove(self.image.path)
        super().delete(*args, **kwargs)
    
    def get_image_url(self):
        """Get the full URL for the image"""
        if self.image:
            return f"{settings.MEDIA_URL}{self.image.name}"
        return None


class Friendships(models.Model):
	id = models.AutoField(primary_key=True)
	user_1 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='u1')
	user_2 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='u2')
	accepted = models.BooleanField(default=False)
	last_modified = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('user_1', 'user_2')
	
	@staticmethod
	def get_friends(user):
	# Get friendships where user is either user_1 or user_2 and accepted=True
		return UserProfile.objects.filter(
			Q(u1__user_2=user, u1__accepted=True) |
			Q(u2__user_1=user, u2__accepted=True)
		)

	@staticmethod
	def are_friends(user1, user2):
		return Friendships.objects.filter(
			(Q(user_1=user1, user_2=user2) | Q(user_1=user2, user_2=user1)),
			accepted=True
		).exists()