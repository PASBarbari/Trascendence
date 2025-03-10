"""
Minimal settings for JWT validation microservice
"""

import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-default-key')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Accept requests from any host in Kubernetes
ALLOWED_HOSTS = ['*']

# JWT configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')

# Ultra-minimal middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]

# Only the validator app is needed
INSTALLED_APPS = [
    'validator',
]

ROOT_URLCONF = 'jwt_validator.urls'

# No need for templates in a JWT validator
TEMPLATES = []

WSGI_APPLICATION = 'jwt_validator.wsgi.application'

# No database needed for JWT validation
DATABASES = {}

# Minimal logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# No need for internationalization
USE_I18N = False
USE_TZ = False

DEFAULT_FILE_STORAGE = "minio_storage.storage.MinioMediaStorage"
STATICFILES_STORAGE = "minio_storage.storage.MinioStaticStorage"
MINIO_STORAGE_ENDPOINT = os.getenv('MINIO_STORAGE_ENDPOINT', 'minio:9000')
MINIO_STORAGE_ACCESS_KEY = os.getenv('MINIO_STORAGE_ACCESS_KEY', 'pippo')
MINIO_STORAGE_SECRET_KEY = os.getenv('MINIO_STORAGE_SECRET_KEY', 'minni')

MINIO_STORAGE_USE_HTTPS = False
MINIO_STORAGE_MEDIA_OBJECT_METADATA = {"Cache-Control": "max-age=1111"}
MINIO_STORAGE_MEDIA_BUCKET_NAME = 'user-media'
MINIO_STORAGE_MEDIA_BACKUP_BUCKET = "user-backup"
MINIO_STORAGE_MEDIA_BACKUP_FORMAT = '%c/'
MINIO_STORAGE_AUTO_CREATE_MEDIA_BUCKET = True
MINIO_STORAGE_STATIC_BUCKET_NAME = "user-static"
MINIO_STORAGE_AUTO_CREATE_STATIC_BUCKET = True
MINIO_PUBLIC_ENDPOINT = os.getenv('MINIO_PUBLIC_ENDPOINT', 'minio.trascendence.42firenze.it')

# Additional protocol = 'https' if MINIO_STORAGE_USE_HTTPS else 'http'
protocol = 'https' if MINIO_STORAGE_USE_HTTPS else 'http'
MINIO_STORAGE_MEDIA_URL = os.getenv('MINIO_MEDIA_URL', f'{protocol}://{MINIO_STORAGE_ENDPOINT}/{MINIO_STORAGE_MEDIA_BUCKET_NAME}/')
MINIO_STORAGE_STATIC_URL = os.getenv('MINIO_STATIC_URL', f'{protocol}://{MINIO_STORAGE_ENDPOINT}/{MINIO_STORAGE_STATIC_BUCKET_NAME}/')
MINIO_STORAGE_POLICY = os.getenv('MINIO_STORAGE_POLICY', 'public-read')