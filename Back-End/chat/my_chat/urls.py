from django.urls import path, re_path
from . import views

# chat/...

urlpatterns = [
	path('chat_rooms/<int:room_id>/get_message/', views.GetChatMessage.as_view()), # GET localhost:8000/chat_rooms/1/get_message/:20
	path('chat_rooms/<int:room_id>/', views.GetChatInfo.as_view()),
	path('new_user/', views.new_user.as_view()),
	path('chat_rooms/create/', views.CreateChat.as_view()),
	path('chat_rooms/getchat/', views.GetChats.as_view(), name='get_chats'),
	path('chat_data/', views.DownloadChatRoomData.as_view()),
	path('user_similarities/', views.DownloadSimilaritiesData.as_view()),
	path('chat_rooms/<int:room_id>/add_user/', views.AddUsersToChat.as_view()),
	path('block_user/<int:user_id>', views.BlockUser.as_view()),
	path('blocked_users/', views.allBlockedUsers.as_view()),
	path('media/upload/', views.ChatMediaUpload.as_view(), name='chat_media_upload'),
	path('media/manage/', views.ChatMediaManager.as_view(), name='chat_media_manager'),
]