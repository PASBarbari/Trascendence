import redis
import json
import threading
import time
import logging
from django.conf import settings
from django.db.models import Q
import os

logger = logging.getLogger('django')

class FriendStatusPublisher:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=int(os.getenv('REDIS_ONLINE_STATUS_DB', '0')),
            decode_responses=True
        )
        self.pubsub = self.redis_client.pubsub()
        self.running = False
        self.publisher_thread = None

    def start_publisher(self):
        """Start listening for global status changes"""
        if not self.running:
            self.running = True
            self.publisher_thread = threading.Thread(
                target=self._listen_for_global_status,
                daemon=True
            )
            self.publisher_thread.start()
            logger.info("🔔 Friend status publisher started")

    def stop_publisher(self):
        """Stop the publisher"""
        self.running = False
        if self.pubsub:
            self.pubsub.close()
        logger.info("🔕 Friend status publisher stopped")

    def _listen_for_global_status(self):
        """Listen for global user status changes from notification service"""
        try:
            # Subscribe to global status changes
            self.pubsub.subscribe('user_status_global')
            logger.info("📡 Listening for global user status changes")
            
            for message in self.pubsub.listen():
                if not self.running:
                    break
                    
                if message['type'] == 'message':
                    try:
                        data = json.loads(message['data'])
                        self._handle_global_status_change(data)
                    except Exception as e:
                        logger.error(f"Error processing global status message: {e}")
                        
        except Exception as e:
            logger.error(f"Error in friend status publisher: {e}")
        finally:
            self.pubsub.close()

    def _handle_global_status_change(self, data):
        """When a user's status changes globally, notify their friends"""
        user_id = data.get('user_id')
        is_online = data.get('is_online')
        
        if not user_id:
            return
            
        try:
            # Get user's friends (this stays in user service)
            friend_ids = self._get_user_friends(user_id)
            
            if friend_ids:
                # Publish to each friend's personal channel
                for friend_id in friend_ids:
                    self.redis_client.publish(
                        f'friend_status_{friend_id}',
                        json.dumps({
                            'type': 'friend_status_change',
                            'friend_user_id': user_id,
                            'is_online': is_online,
                            'timestamp': time.time()
                        })
                    )
                
                logger.info(f"📡 Notified {len(friend_ids)} friends about user {user_id} going {'online' if is_online else 'offline'}")
                
        except Exception as e:
            logger.error(f"Error handling global status change for user {user_id}: {e}")
    
    def _get_user_friends(self, user_id):
        """Get friends list - this stays internal to user service"""
        try:
            from .models import Friendships
            
            # Get accepted friendships for this user
            friendships = Friendships.objects.filter(
                Q(user_1_id=user_id) | Q(user_2_id=user_id),
                accepted=True
            )
            
            friend_ids = []
            for friendship in friendships:
                # Get the other user's ID
                friend_id = friendship.user_2_id if friendship.user_1_id == user_id else friendship.user_1_id
                friend_ids.append(friend_id)
            
            return friend_ids
            
        except Exception as e:
            logger.error(f"Error getting friends for user {user_id}: {e}")
            return []

# Global instance
friend_status_publisher = FriendStatusPublisher()