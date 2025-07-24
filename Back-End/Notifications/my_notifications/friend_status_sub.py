import redis
import json
import threading
import logging
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import os

logger = logging.getLogger('django')

class FriendStatusListener:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=int(os.getenv('REDIS_ONLINE_STATUS_DB', '0')),
            decode_responses=True
        )
        self.pubsub = self.redis_client.pubsub()
        self.running = False
        self.listener_thread = None
        self.channel_layer = get_channel_layer()

    def start_listener(self):
        """Start listening for friend status updates"""
        if not self.running:
            self.running = True
            self.listener_thread = threading.Thread(
                target=self._listen_for_friend_updates,
                daemon=True
            )
            self.listener_thread.start()
            logger.info("🔔 Friend status listener started in notification service")

    def stop_listener(self):
        """Stop the listener"""
        self.running = False
        if self.pubsub:
            self.pubsub.close()
        logger.info("🔕 Friend status listener stopped")

    def _listen_for_friend_updates(self):
        """Listen for friend status updates and send via WebSocket"""
        try:
            # Subscribe to all friend status channels
            self.pubsub.psubscribe('friend_status_*')
            logger.info("📡 Listening for friend status updates to send via WebSocket")
            
            for message in self.pubsub.listen():
                if not self.running:
                    break
                    
                if message['type'] == 'pmessage':
                    try:
                        # Extract user_id from channel name
                        channel = message['channel']
                        user_id = channel.replace('friend_status_', '')
                        
                        # Parse the message data
                        data = json.loads(message['data'])
                        
                        # Send via WebSocket to the specific user
                        self._send_to_user_websocket(user_id, data)
                        
                    except Exception as e:
                        logger.error(f"Error processing friend status message: {e}")
                        
        except Exception as e:
            logger.error(f"Error in friend status listener: {e}")
        finally:
            self.pubsub.close()

    def _send_to_user_websocket(self, user_id, data):
        """Send friend status update to user via WebSocket"""
        try:
            if self.channel_layer:
                async_to_sync(self.channel_layer.group_send)(
                    f"user_notifications_{user_id}",
                    {
                        'type': 'send_notification',
                        'message': data
                    }
                )
                logger.info(f"📤 Sent friend status update to user {user_id} via WebSocket")
            else:
                logger.warning("Channel layer not available")
                
        except Exception as e:
            logger.error(f"Error sending friend status to WebSocket: {e}")

# Global instance
friend_status_listener = FriendStatusListener()