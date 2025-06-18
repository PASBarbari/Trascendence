import os
import logging
from datetime import datetime
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

# Get dedicated logger for image storage operations
logger = logging.getLogger('image_storage')

class ImageStorageService:
    """Service class for handling local image storage"""
    
    _instance = None
    
    @classmethod
    def get_instance(cls):
        """Singleton pattern to reuse the service instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        """Initialize the image storage service"""
        self.media_root = settings.MEDIA_ROOT
        self.media_url = settings.MEDIA_URL
        
        # Ensure avatars directory exists
        self.avatars_dir = os.path.join(self.media_root, 'avatars')
        os.makedirs(self.avatars_dir, exist_ok=True)
        
        logger.info(f"Image storage service initialized. Media root: {self.media_root}")
    
    def upload_avatar(self, user_id, file_obj, filename=None):
        """Upload user avatar to local storage"""
        try:
            if not filename:
                extension = os.path.splitext(file_obj.name)[1].lower()
                timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                filename = f"avatar_{user_id}_{timestamp}{extension}"
            
            # Ensure filename has proper extension
            if not any(filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif']):
                extension = os.path.splitext(file_obj.name)[1].lower()
                if extension:
                    filename += extension
                else:
                    filename += '.jpg'  # Default extension
            
            # Create the relative path for storage
            relative_path = os.path.join('avatars', filename)
            
            # Save the file using Django's default storage
            saved_path = default_storage.save(relative_path, file_obj)
            
            # Generate the URL for the saved file
            file_url = f"{self.media_url}{saved_path}"
            
            logger.info(f"Avatar uploaded successfully for user {user_id}: {saved_path}")
            
            return True, file_url, saved_path
            
        except Exception as e:
            logger.error(f"Error uploading avatar for user {user_id}: {str(e)}", exc_info=True)
            return False, str(e), None
    
    def delete_avatar(self, file_path):
        """Delete an avatar file from local storage"""
        try:
            if file_path and default_storage.exists(file_path):
                default_storage.delete(file_path)
                logger.info(f"Avatar deleted successfully: {file_path}")
                return True
            else:
                logger.warning(f"Avatar file not found for deletion: {file_path}")
                return False
        except Exception as e:
            logger.error(f"Error deleting avatar {file_path}: {str(e)}", exc_info=True)
            return False
    
    def get_avatar_path(self, file_url):
        """Extract the file path from a URL for deletion purposes"""
        if file_url and file_url.startswith(self.media_url):
            return file_url[len(self.media_url):]
        return None
    
    def list_user_avatars(self, user_id):
        """List all avatar files for a specific user"""
        try:
            avatars_path = 'avatars'
            if default_storage.exists(avatars_path):
                files = default_storage.listdir(avatars_path)[1]  # Get files, not directories
                user_avatars = [f for f in files if f.startswith(f'avatar_{user_id}_')]
                return user_avatars
            return []
        except Exception as e:
            logger.error(f"Error listing avatars for user {user_id}: {str(e)}", exc_info=True)
            return []
