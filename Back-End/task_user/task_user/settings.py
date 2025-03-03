"""
Django settings for task_user project.

Generated by 'django-admin startproject' using Django 5.1.1.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""

from pathlib import Path
from celery.schedules import crontab
import os


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
API_KEY = os.getenv('API_KEY', '123')

def arise(exception):
	raise(exception)

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-kp7qs)0l1ie$%muo93+829po%pe9*gz8z8ah6dy0)cskj-5l*c')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', True)

def ensure_scheme(url):
    if url and not url.startswith(('http://', 'https://')):
        return f"http://{url}"
    return url

Microservices = {
    'Login': ensure_scheme(os.getenv('LOGIN_SERVICE', 'http://localhost:8000')),
    'Chat': ensure_scheme(os.getenv('CHAT_SERVICE', 'http://localhost:8001')),
    'Users': ensure_scheme(os.getenv('USERS_SERVICE', 'http://localhost:8002')),
    'Notifications': ensure_scheme(os.getenv('NOTIFICATIONS_SERVICE', 'http://localhost:8003')),
    'Pong': ensure_scheme(os.getenv('PONG_SERVICE', 'http://localhost:8004')),
}

K8S_ALLOWED_HOSTS = os.environ.get('K8S_ALLOWED_HOSTS', '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16').split(',')

ALLOWED_HOSTS = [
	'localhost',
	'localhost:3000',
	'127.0.0.1',
	'[::1]',
	'trascendence.42firenze.it',
	Microservices['Login'],
	Microservices['Chat'],
	Microservices['Users'],
	Microservices['Notifications'],
	Microservices['Pong'],
] + K8S_ALLOWED_HOSTS + [
	Microservices['Login'],
	Microservices['Chat'],
	Microservices['Users'],
	Microservices['Notifications'],
	Microservices['Pong'],
]
		

CORS_ALLOWED_ORIGINS = [
	'http://localhost:3000',
	'http://localhost',
	'http://127.0.0.1',
	'http://[::1]',
	'https://trascendence.42firenze.it',
	Microservices['Login'],
	Microservices['Chat'],
	Microservices['Users'],
	Microservices['Notifications'],
	Microservices['Pong'],
]
# CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
	'http://localhost:3000',
	'http://localhost',
	'http://127.0.0.1',
	'http://[::1]',
	'https://trascendence.42firenze.it',
	Microservices['Login'],
	Microservices['Chat'],
	Microservices['Users'],
	Microservices['Notifications'],
	Microservices['Pong'],
]

CORS_ALLOW_HEADERS = [
	'accept',
	'accept-encoding',
	'authorization',
	'content-type',
	'dnt',
	'origin',
	'user-agent',
	'x-csrftoken',
	'x-requested-with',
]

# Application definition

INSTALLED_APPS = [
	'django.contrib.admin',
	'django.contrib.auth',
	'django.contrib.contenttypes',
	'django.contrib.sessions',
	'django.contrib.messages',
	'django.contrib.staticfiles',
	'rest_framework',
	'rest_framework_simplejwt',
	'django_filters',
	'oauth2_provider',
	'task_app',
	'user_app',
	'corsheaders',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
	'corsheaders.middleware.CorsMiddleware',
]

ROOT_URLCONF = 'task_user.urls'

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

WSGI_APPLICATION = 'task_user.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
	'default': {
	'ENGINE': 'django.db.backends.postgresql',
	'NAME': os.getenv('POSTGRES_DB', 'usertask_db'),
	'USER': os.getenv('POSTGRES_USER', 'pasquale'),
	'PASSWORD': os.getenv('POSTGRES_PASSWORD', '123'),
	'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
	'PORT': os.getenv('POSTGRES_PORT', '5435'),
	},
	'backup': {
	'ENGINE': 'django.db.backends.sqlite3',
	'NAME': str(BASE_DIR / 'db.sqlite3'),
	}
}

import secrets

oauth2_settings = {
	'OAUTH2_INTROSPECTION_URL': 'http://localhost:8000/o/introspect/',
	'CLIENT_ID': secrets.token_urlsafe(32),
	'CLIENT_SECRET': secrets.token_urlsafe(64),
	'TOKEN': '',
	'REFRESH_TOKEN': '',
	'EXPIRES': '',
	'token_type': '',
	'scope': '',
	'SERVICE_PASSWORD': '123', ## TODO: Change this to a more secure password
}


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# CELERY_BROKER_URL = 'redis://localhost:6702/0'
# CELERY_RESULT_BACKEND = 'redis://localhost:6702/0'
# CELERY_BEAT_SCHEDULE = {
# 	'task_notify': {
# 		'task': 'task_app.celerity_task.task_notify',
# 		'schedule': crontab(minute=0, hour=10),
# 	},
# }


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
	'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
	'DEFAULT_AUTHENTICATION_CLASSES': ['user_app.middleware.JWTAuth'],

}

ADMIN = {
	'username': os.getenv('ADMIN_USERNAME', 'admin'),
	'email': os.getenv('ADMIN_EMAIL', 'admin@admin.com'),
	'password': os.getenv('ADMIN_PASSWORD', 'admin'),
}

MEDIA_ROOT = BASE_DIR / 'media/'
# MEDIA_URL = 'http://localhost:8000/'