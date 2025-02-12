from django.urls import path
from . import views

urlpatterns = [
	path('avatar', views.AvatarGen.as_view(), name='avatar_gen'),
	path('avatar/<int:id>/', views.AvatarManage.as_view(), name='avatar_manage'),
	path('user', views.UserGen.as_view(), name='user_gen'),
	path('user/<int:user_id>/', views.UserManage.as_view(), name='user_manage'),
	path('friend', views.FriendList.as_view(), name='friend_list'),
	path('addfriend', views.AddFriend.as_view(), name='add_friend'),
	path('levelup', views.LevelUp.as_view(), name='level_up'),
]