import json
import time
import redis
import os
import asyncio
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger('django')

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
            
            # Only publish global status change (no friend logic here)
            if not was_online:
                self.publish_global_status_change(user_id, True)
        except Exception as e:
            logger.error(f"Error setting user {user_id} online: {e}")

    def set_user_offline(self, user_id):
        """Set user as offline in Redis"""
        try:
            # Check if user was online
            was_online = self.is_user_online(user_id)
            
            self.redis_client.delete(f"online:{user_id}")
            self.redis_client.srem("online_users", user_id)

            # Only publish global status change (no friend logic here)
            if was_online:
                self.publish_global_status_change(user_id, False)
        except Exception as e:
            logger.error(f"Error setting user {user_id} offline: {e}")

    def publish_global_status_change(self, user_id, is_online):
        """Publish global user status change - no friend logic here"""
        try:
            self.redis_client.publish(
                'user_status_global',
                json.dumps({
                    'user_id': user_id,
                    'is_online': is_online,
                    'timestamp': time.time()
                })
            )
            logger.info(f"📡 Published global status change for user {user_id}: {'online' if is_online else 'offline'}")
        except Exception as e:
            logger.error(f"Error publishing global status change: {e}")

# Create a singleton instance
online_status_service = OnlineStatusService()