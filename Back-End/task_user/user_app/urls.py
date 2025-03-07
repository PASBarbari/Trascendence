from django.urls import path
from rest_framework import views
from .views import *

urlpatterns = [
	path('avatar', views.AvatarManager.as_view(), name='avatar_gen'),
	path('user', views.UserGen.as_view(), name='user_gen'),
	path('user/me/', views.UserManage.as_view(), name='user_manage'),
	path('friend', views.FriendList.as_view(), name='friend_list'),
	path('addfriend', views.AddFriend.as_view(), name='add_friend'),
	path('levelup', views.LevelUp.as_view(), name='level_up'),
	path('block', views.BlockUser.as_view(), name='block_user'),
]