"""
Django settings for API Documentation service
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'api-docs-secret-key-change-in-production')

DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',') if os.getenv('ALLOWED_HOSTS', '*') != '*' else ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'drf_yasg',
    'corsheaders',
    'docs',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'api_docs.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'api_docs.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'rest_framework.schemas.coreapi.AutoSchema',
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Microservices endpoints
MICROSERVICES = {
    'login': os.getenv('MICROSERVICES_LOGIN', 'http://login:8000'),
    'chat': os.getenv('MICROSERVICES_CHAT', 'http://chat:8001'), 
    'user': os.getenv('MICROSERVICES_USER', 'http://user:8002'),
    'notifications': os.getenv('MICROSERVICES_NOTIFICATIONS', 'http://notifications:8003'),
    'pong': os.getenv('MICROSERVICES_PONG', 'http://pong:8004'),
}

# For local development, use localhost
if DEBUG:
    MICROSERVICES = {
        'login': os.getenv('MICROSERVICES_LOGIN', 'http://localhost:8000'),
        'chat': os.getenv('MICROSERVICES_CHAT', 'http://localhost:8001'),
        'user': os.getenv('MICROSERVICES_USER', 'http://localhost:8002'), 
        'notifications': os.getenv('MICROSERVICES_NOTIFICATIONS', 'http://localhost:8003'),
        'pong': os.getenv('MICROSERVICES_PONG', 'http://localhost:8004'),
    }
