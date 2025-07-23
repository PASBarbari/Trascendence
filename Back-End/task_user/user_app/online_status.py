import redis
import os
from django.conf import settings

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

# Create a singleton instance
online_status_service = OnlineStatusService()
