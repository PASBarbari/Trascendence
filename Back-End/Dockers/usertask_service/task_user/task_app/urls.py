from django.urls import path
from . import views

urlpatterns = [
	path('task', views.TaskGen.as_view(), name='task_gen'),
	path('task/<int:id>/', views.TaskManage.as_view(), name='task_manage'),
	path('progress', views.ProgressGen.as_view(), name='progress_gen'),
	path('progress/<int:id>/', views.ProgressDelete.as_view(), name='progress_manage'),
	path('progress/<int:task>&<int:user>/', views.ProgressManage.as_view(), name='user_progress'),
	path('ubt', views.GetUsersByTask.as_view(), name='users_by_task'),
	path('tbu', views.GetTasksByUser.as_view(), name='task_by_user'),
	# path('tasks_by_category', views.GetTasksByCategory.as_view(), name='tasks_by_category'),
	# path('gufet', views.GetUsersForEachTask.as_view(), name='gufet'),
	# path('gtfeu', views.GetTasksForEachUser.as_view(), name='gtfeu')
]