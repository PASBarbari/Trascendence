from django.apps import AppConfig

# class TaskAppConfig(AppConfig):
# 	default_auto_field = 'django.db.models.BigAutoField'
# 	name = 'user_app'

# 	def ready(self):
# 		from .start_tables import CreateUsersSignal
# 		try:
# 			pass
# 		except Exception as e:
# 			print(str(e))

class UserAppConfig(AppConfig):
	default_auto_field = 'django.db.models.BigAutoField'
	name = 'user_app'

	def ready(self):
		try:
			# from .authentications import register_self , user_register_self
			from .admin import create_superuser
			from .start_tables import CreateUsersSignal
			#user_register_self()
			#print("User login successful")
			# register_self()
		except Exception as e:
            # Optionally log the exception
			print(f"Error during registration: {e}")
			pass