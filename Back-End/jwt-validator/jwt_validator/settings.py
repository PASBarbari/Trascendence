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