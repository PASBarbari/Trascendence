import logging
from rest_framework import serializers
from .models import ChatMember, ChatRoom, ChatMessage, UserProfile

logger = logging.getLogger('django')


class userSerializer(serializers.ModelSerializer):
	class Meta:
		model = UserProfile
		fields = '__all__'

class userBlockedSerializer(serializers.ModelSerializer):
	class Meta:
		model = UserProfile
		fields = ['user_id', 'username']

class chat_roomSerializer(serializers.ModelSerializer):
	creator = serializers.PrimaryKeyRelatedField(queryset=UserProfile.objects.all())
	users = serializers.ListField(
		child=serializers.IntegerField(),
		write_only=True,
		required=False
	)

	class Meta:
		model = ChatRoom
		fields = ['room_id', 'room_name', 'room_description', 'creator', 'users']

	def create(self, validated_data):
		# Estrai lista di user_ids
		user_ids = validated_data.pop('users', [])

		# Crea ChatRoom
		chat_room = ChatRoom.objects.create(**validated_data)

		# Aggiungi gli utenti alla chat
		if user_ids:
			try:
				# Trova i profili utente
				user_profiles = UserProfile.objects.filter(user_id__in=user_ids)
				
				# Additional blocking check for users being added
				creator = chat_room.creator
				filtered_profiles = []
				
				for profile in user_profiles:
					# Check if creator has blocked this user
					if creator and creator.blockedUsers.filter(user_id=profile.user_id).exists():
						logging.warning(f"Creator {creator.user_id} has blocked user {profile.user_id}, skipping")
						continue
					
					# Check if this user has blocked the creator
					if creator and profile.blockedUsers.filter(user_id=creator.user_id).exists():
						logging.warning(f"User {profile.user_id} has blocked creator {creator.user_id}, skipping")
						continue
					
					filtered_profiles.append(profile)

				# Aggiungi membri alla chat con ruoli predefiniti
				for profile in filtered_profiles:
					# Il creatore è admin, gli altri sono normal_user
					role = 'admin' if profile.user_id == chat_room.creator.user_id else 'normal_user'
					ChatMember.objects.create(
						chat_room=chat_room,
						user=profile,
						role=role
					)

				logging.info(f"Created chat room {chat_room.room_id} with {len(filtered_profiles)} members (filtered from {len(user_profiles)} due to blocking)")
			except Exception as e:
				logging.error(f"Error adding users to chat: {str(e)}")
				# Se la creazione dei membri fallisce, elimina la chat
				chat_room.delete()
				raise
			
		return chat_room
		
	def to_representation(self, instance):
		# Per le operazioni di lettura, includi gli utenti come elenco di id
		representation = super().to_representation(instance)
		representation['users'] = list(instance.users.values_list('user_id', flat=True))
		return representation
	
class chat_messageSerializer(serializers.ModelSerializer):
    # Aggiungi campi espliciti per evitare problemi di serializzazione
    sender_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessage
        fields = ['message_id', 'room', 'message', 'sender', 'sender_name', 'timestamp']
    
    def get_sender_name(self, obj):
        try:
            if hasattr(obj.sender, 'username') and obj.sender.username:
                return obj.sender.username
            return str(obj.sender)
        except Exception as e:
            logger.error(f"Error getting sender_name: {str(e)}")
            return "Unknown"
    
    def to_representation(self, instance):
        try:
            data = {
                'message_id': instance.message_id,
                'message': instance.message,
                'timestamp': instance.timestamp,
                'sender': getattr(instance.sender, 'username', 'Unknown User')
            }
            return data
        except Exception as e:
            logger.error(f"Serialization error for message {getattr(instance, 'message_id', 'unknown')}: {str(e)}")
            # Return minimal safe representation
            return {
                'message_id': getattr(instance, 'message_id', 0),
                'message': getattr(instance, 'message', 'Error retrieving message'),
                'timestamp': getattr(instance, 'timestamp', ''),
                'sender': 'Unknown'
            }