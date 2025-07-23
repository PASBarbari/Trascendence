from django.urls import path
from rest_framework import views
from .views import OnlineStatusView, UserGen, UserManage, FriendList, LevelUp, AddFriend, BlockUser, AvatarManager, Update2FAStatus, UserSearch

urlpatterns = [
	path('avatar', AvatarManager.as_view(), name='avatar_gen'),
	path('user', UserGen.as_view(), name='user_gen'),
	path('me', UserManage.as_view(), name='user_manage'),
	path('friend', FriendList.as_view(), name='friend_list'),
	path('addfriend', AddFriend.as_view(), name='add_friend'),
	path('levelup', LevelUp.as_view(), name='level_up'),
	path('block', BlockUser.as_view(), name='block_user'),
	path('user/update-2fa/', Update2FAStatus.as_view(), name='update_2fa_status'),
	path('search', UserSearch.as_view(), name='search_user'),
	path('online-status', OnlineStatusView.as_view(), name='online_status'),
]