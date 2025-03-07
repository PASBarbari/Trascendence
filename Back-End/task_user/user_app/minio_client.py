import json
import logging
from minio import Minio
from django.conf import settings
import os
from datetime import datetime

# Get dedicated logger for MinIO operations
logger = logging.getLogger('minio_storage')

class MinioService:
	"""Service class for interacting with MinIO storage"""
		
	_instance = None
		
	@classmethod
	def get_instance(cls):
		"""Singleton pattern to reuse the client connection"""
		if cls._instance is None:
			cls._instance = cls()
		return cls._instance
		
	def __init__(self):
		"""Initialize the MinIO client"""
		try:
			# Use internal endpoint for client connection
			self.client = Minio(
				settings.MINIO_STORAGE_ENDPOINT,
				access_key=settings.MINIO_STORAGE_ACCESS_KEY,
				secret_key=settings.MINIO_STORAGE_SECRET_KEY,
				secure=False
			)
			
			# Ensure buckets exist
			self._ensure_bucket_exists(settings.MINIO_STORAGE_MEDIA_BUCKET_NAME)
			logger.info(f"MinIO client initialized successfully for endpoint {settings.MINIO_STORAGE_ENDPOINT}")
		except Exception as e:
			logger.error(f"Failed to initialize MinIO client: {str(e)}", exc_info=True)
			raise
		
	def _ensure_bucket_exists(self, bucket_name):
		"""Create bucket if it doesn't exist"""
		try:
			if not self.client.bucket_exists(bucket_name):
				self.client.make_bucket(bucket_name)
				logger.info(f"Created bucket: {bucket_name}")
				
				# Set bucket policy to public read if needed
				if getattr(settings, 'MINIO_STORAGE_POLICY', '') == 'public-read':
					policy = {
						"Version": "2012-10-17",
						"Statement": [
							{
								"Effect": "Allow",
								"Principal": {"AWS": "*"},
								"Action": ["s3:GetObject"],
								"Resource": [f"arn:aws:s3:::{bucket_name}/*"]
	
							}
						]
					}
					self.client.set_bucket_policy(bucket_name, json.dumps(policy))
					logger.info(f"Set public-read policy for bucket: {bucket_name}")
		except Exception as e:
			logger.error(f"Error ensuring bucket exists: {str(e)}", exc_info=True)
			raise
		
	def upload_avatar(self, user_id, file_obj, filename=None):
		"""Upload user avatar to MinIO"""
		bucket_name = settings.MINIO_STORAGE_MEDIA_BUCKET_NAME
		
		try:
			if not filename:
				extension = os.path.splitext(file_obj.name)[1].lower()
				timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
				filename = f"avatar_{user_id}_{timestamp}{extension}"
			
			object_name = f"avatars/{filename}"
			content_type = getattr(file_obj, 'content_type', 'image/jpeg')
			
			# Get file size
			if hasattr(file_obj, 'size'):
				file_size = file_obj.size
			else:
				file_obj.seek(0, os.SEEK_END)
				file_size = file_obj.tell()
				file_obj.seek(0)
			
			logger.info(f"Uploading avatar for user {user_id}: {object_name}")
			
			# Upload file to MinIO
			self.client.put_object(
				bucket_name,
				object_name,
				file_obj,
				file_size,
				content_type=content_type
			)
			
			# Generate URL using public endpoint if configured, otherwise internal
			public_endpoint = getattr(settings, 'MINIO_PUBLIC_ENDPOINT', settings.MINIO_STORAGE_ENDPOINT)
			url = f"http{'s' if settings.MINIO_STORAGE_USE_HTTPS == 'True' else ''}://{public_endpoint}/{bucket_name}/{object_name}"
			logger.info(f"Avatar uploaded successfully: {url}")
			
			return True, url
			
		except Exception as e:
			logger.error(f"Error uploading avatar for user {user_id}: {str(e)}", exc_info=True)
			return False, str(e)