import redis
import os
import asyncio
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class OnlineStatusService:
    def __init__(self):
        # Use shared Redis DB for online status
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=int(os.getenv('REDIS_ONLINE_STATUS_DB', '0')),  # Shared DB
            decode_responses=True
        )

    def is_user_online(self, user_id):
        """Fast Redis lookup for user online status"""
        try:
            return bool(self.redis_client.exists(f"online:{user_id}"))
        except Exception:
            return False
    
    def get_multiple_users_online_status(self, user_ids):
        """Batch check online status for multiple users"""
        try:
            online_status = {}
            if not user_ids:
                return online_status
                
            pipe = self.redis_client.pipeline()
            for user_id in user_ids:
                pipe.exists(f"online:{user_id}")
            results = pipe.execute()
            
            for user_id, is_online in zip(user_ids, results):
                online_status[user_id] = bool(is_online)
            return online_status
        except Exception:
            return {user_id: False for user_id in user_ids}

    def get_online_users_count(self):
        """Get total count of online users"""
        try:
            return self.redis_client.scard("online_users")
        except Exception:
            return 0

    def set_user_online(self, user_id):
        """Set user as online in Redis"""
        try:
            # Check if user was already online
            was_online = self.is_user_online(user_id)
            
            self.redis_client.setex(f"online:{user_id}", 60, "1")  # Set with expiration
            self.redis_client.sadd("online_users", user_id)
            
            # Notify friends if status changed from offline to online
            if not was_online:
                self.notify_friends_status_change(user_id, True)
        except Exception as e:
            print(f"Error setting user {user_id} online: {e}")

    def set_user_offline(self, user_id):
        """Set user as offline in Redis"""
        try:
            # Check if user was online
            was_online = self.is_user_online(user_id)
            
            self.redis_client.delete(f"online:{user_id}")
            self.redis_client.srem("online_users", user_id)
            
            # Notify friends if status changed from online to offline
            if was_online:
                self.notify_friends_status_change(user_id, False)
        except Exception as e:
            print(f"Error setting user {user_id} offline: {e}")

    def notify_friends_status_change(self, user_id, is_online):
        """Notify friends about user status change via WebSocket"""
        try:
            # Get user's friends (this requires importing from user service)
            friend_ids = self._get_user_friends(user_id)
            
            if friend_ids:
                channel_layer = get_channel_layer()
                
                # Send status update to each friend
                for friend_id in friend_ids:
                    group_name = f'user_notifications_{friend_id}'
                    
                    # Use async_to_sync since this is called from sync context
                    async_to_sync(channel_layer.group_send)(
                        group_name,
                        {
                            'type': 'friend_status_update',
                            'user_id': user_id,
                            'is_online': is_online
                        }
                    )
        except Exception as e:
            print(f"Error notifying friends of status change: {e}")

    def _get_user_friends(self, user_id):
        """Get list of user's friend IDs"""
        try:
            # Import here to avoid circular imports
            import requests
            from django.conf import settings
            
            # Call user service API to get friends
            response = requests.get(
                f'http://user-service:8002/api/friends/',
                headers={'X-Service-Token': settings.SERVICE_SECRET_KEY},
                params={'user_id': user_id, 'status': 'accepted'},
                timeout=2
            )
            
            if response.status_code == 200:
                friendships = response.json()
                friend_ids = []
                
                for friendship in friendships:
                    # Determine which user is the friend
                    friend_id = (friendship['user_2']['user_id'] 
                               if friendship['user_1']['user_id'] == user_id 
                               else friendship['user_1']['user_id'])
                    friend_ids.append(friend_id)
                
                return friend_ids
        except Exception as e:
            print(f"Error getting user friends: {e}")
        
        return []

# Create a singleton instance
online_status_service = OnlineStatusService()