from django.urls import path
from rest_framework import views
from .views import UserGen, UserManage, FriendList, LevelUp, AddFriend, BlockUser, AvatarManager

urlpatterns = [
	path('avatar', AvatarManager.as_view(), name='avatar_gen'),
	path('user', UserGen.as_view(), name='user_gen'),
	path('user/me/', UserManage.as_view(), name='user_manage'),
	path('friend', FriendList.as_view(), name='friend_list'),
	path('addfriend', AddFriend.as_view(), name='add_friend'),
	path('levelup', LevelUp.as_view(), name='level_up'),
	path('block', BlockUser.as_view(), name='block_user'),
]