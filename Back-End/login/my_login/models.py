from django.db import models
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from encrypted_model_fields.fields import EncryptedCharField

class AppUserManager(BaseUserManager):
	def create_user(self, email, password=None):
		if not email:
			raise ValueError('An email is required.')
		if not password:
			raise ValueError('A password is required.')
		email = self.normalize_email(email)
		user = self.model(email=email)
		user.set_password(password)
		user.save()
		return user
	def create_superuser(self, email, password=None):
		if not email:
			raise ValueError('An email is required.')
		if not password:
			raise ValueError('A password is required.')
		user = self.create_user(email, password)
		user.is_superuser = True
		user.is_staff = True
		user.save()
		return user


class AppUser(AbstractBaseUser, PermissionsMixin):
	user_id = models.AutoField(primary_key=True)
	email = models.EmailField(max_length=50, unique=True)
	username = models.CharField(max_length=100)
	USERNAME_FIELD = 'email'
	REQUIRED_FIELDS = ['username']
	is_staff = models.BooleanField(default=False)
	has_two_factor_auth = models.BooleanField(default=False)
	two_factor_secret = EncryptedCharField(max_length=255, blank=True, null=True)
	samu_e_un_coglione = models.BooleanField(default=True)
	objects = AppUserManager()
	def __str__(self):
		return self.username


