from django.apps import AppConfig

class TaskAppConfig(AppConfig):
	default_auto_field = 'django.db.models.BigAutoField'
	name = 'task_app'

	def ready(self):
		try:
			# from .authentications import register_self , user_register_self
			from .admin import create_superuser
			from .start_tables import CreateTasksSignal
			#user_register_self()
			#print("User login successful")
			# register_self()
		except Exception as e:
            # Optionally log the exception
			print(f"Error during registration: {e}")
			pass