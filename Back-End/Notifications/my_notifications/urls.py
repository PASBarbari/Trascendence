from django.urls import path
from .views import AddUserToGroupView , NewUser , SentNotification , NewNotification

urlpatterns = [
  path('groups/<int:group_id>/add_user/', AddUserToGroupView.as_view(), name='add_user_to_group'),
	path('add_user', NewUser.as_view(), name='new_user'),
	path('notification_history', SentNotification.as_view(), name='notification_history'),
	path('new/', NewNotification.as_view(), name='new_notification')
]