"""
Django settings for chat project.

Generated by 'django-admin startproject' using Django 5.1.1.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""

from datetime import datetime, timedelta
from pathlib import Path
import secrets , os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-kp7qs)0l1ie$%muo93+829po%pe9*gz8z8ah6dy0)cskj-5l*c')
API_KEY = os.getenv('API_KEY', '123')
# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', True)

# Simple microservices definition
Microservices = {
    'Login': os.getenv('LOGIN_URL', 'http://localhost:8000'),
    'Chat': os.getenv('CHAT_URL', 'http://localhost:8001'),
    'Users': os.getenv('USER_URL', 'http://localhost:8002'),
    'Notifications': os.getenv('NOTIFICATIONS_URL', 'http://localhost:8003'),
    'Pong': os.getenv('PONG_URL', 'http://localhost:8004'),
    'Login': os.getenv('LOGIN_URL', 'http://localhost:8000'),
    'Chat': os.getenv('CHAT_URL', 'http://localhost:8001'),
    'Users': os.getenv('USER_URL', 'http://localhost:8002'),
    'Notifications': os.getenv('NOTIFICATIONS_URL', 'http://localhost:8003'),
    'Pong': os.getenv('PONG_URL', 'http://localhost:8004'),
}

K8S_ALLOWED_HOSTS = os.environ.get('K8S_ALLOWED_HOSTS', '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16').split(',')

# Get service hosts from environment
K8S_SERVICE_HOSTS_RAW = os.getenv('K8S_SERVICE_HOSTS', '').split(',') if os.getenv('K8S_SERVICE_HOSTS') else []

# For ALLOWED_HOSTS: hostnames only (strip schemes/ports)
K8S_SERVICE_HOSTS_CLEAN = []
for host in K8S_SERVICE_HOSTS_RAW:
    if host:
        # Remove http:// or https:// if present
        clean_host = host.replace('http://', '').replace('https://', '')
        # Remove port if present
        if ':' in clean_host:
            clean_host = clean_host.split(':')[0]
        K8S_SERVICE_HOSTS_CLEAN.append(clean_host)

# For CORS: full URLs with schemes
K8S_SERVICE_HOSTS_WITH_SCHEME = [f"http://{host}" for host in K8S_SERVICE_HOSTS_RAW if host]

K8S_SERVICE_HOSTS = K8S_SERVICE_HOSTS_CLEAN
# Get service hosts from environment
K8S_SERVICE_HOSTS_RAW = os.getenv('K8S_SERVICE_HOSTS', '').split(',') if os.getenv('K8S_SERVICE_HOSTS') else []

# For ALLOWED_HOSTS: hostnames only (strip schemes/ports)
K8S_SERVICE_HOSTS_CLEAN = []
for host in K8S_SERVICE_HOSTS_RAW:
    if host:
        # Remove http:// or https:// if present
        clean_host = host.replace('http://', '').replace('https://', '')
        # Remove port if present
        if ':' in clean_host:
            clean_host = clean_host.split(':')[0]
        K8S_SERVICE_HOSTS_CLEAN.append(clean_host)

# For CORS: full URLs with schemes
K8S_SERVICE_HOSTS_WITH_SCHEME = [f"http://{host}" for host in K8S_SERVICE_HOSTS_RAW if host]

K8S_SERVICE_HOSTS = K8S_SERVICE_HOSTS_CLEAN

ALLOWED_HOSTS = ['*']
# 	'localhost',
# 	'localhost:3000',
# 	'127.0.0.1',
# 	'[::1]',
# 	'trascendence.42firenze.it',
# 	Microservices['Login'],
# 	Microservices['Chat'],
# 	Microservices['Users'],
# 	Microservices['Notifications'],
# 	Microservices['Pong'],
# ]  + K8S_SERVICE_HOSTS

# CORS_ALLOWED_ORIGINS = [
# 	'http://localhost:3000',
# 	'http://localhost',
# 	'http://127.0.0.1',
# 	'http://[::1]',
# 	'https://trascendence.42firenze.it',
# 	Microservices['Login'],
# 	Microservices['Chat'],
# 	Microservices['Users'],
# 	Microservices['Notifications'],
# 	Microservices['Pong'],
# ]  + K8S_SERVICE_HOSTS_WITH_SCHEME
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1',
    'http://[::1]',
    'https://trascendence.42firenze.it',
    # Aggiungi IP privati per HTTPS
    'https://10.0.2.15',  # L'IP specifico della tua VM
    # O meglio ancora, patterns per tutti gli IP privati:
    'http://10.*',
    'https://10.*',
    'http://192.168.*',
    'https://192.168.*',
    'http://172.16.*',
    'https://172.16.*',
    'http://172.17.*',
    'https://172.17.*',
    'http://172.18.*',
    'https://172.18.*',
    # Continua per tutti i range 172.16.x.x fino a 172.31.x.x
    'http://localhost:8443',
    'http://127.0.0.1:8443',
    'http://10.0.2.15:8443',
    'http://10.0.2.15.xip.io:8443',
    'http://10.11.*.xip.io:8443',
    Microservices['Login'],
    Microservices['Chat'],
    Microservices['Users'],
    Microservices['Notifications'],
    Microservices['Pong'],
]  + K8S_SERVICE_HOSTS_WITH_SCHEME

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
    'django_prometheus', 
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'my_chat',
    'oauth2_provider',
    'django_filters',
    'corsheaders',
    'channels',
    'celery',
    'redis',
    'drf_yasg',
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',  # Add at the top
    'my_chat.middleware.HealthCheckMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'my_chat.middleware.ErrorLoggingMiddleware',
    'django_prometheus.middleware.PrometheusAfterMiddleware',  # Add at the end
]
    # 'oauth2_provider.middleware.OAuth2TokenMiddleware',

ROOT_URLCONF = 'chat.urls'

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

# WSGI_APPLICATION = 'chat.wsgi.application'
ASGI_APPLICATION = 'chat.asgi.application'

oauth2_settings = {
    'OAUTH2_INTROSPECTION_URL': 'http://localhost:8000/o/introspect/',
    'CLIENT_ID': secrets.token_urlsafe(32),
    'CLIENT_SECRET': secrets.token_urlsafe(64),
    'TOKEN': '',
    'REFRESH_TOKEN': '',
    'EXPIRES': '',
    'token_type': '',
    'scope': '',
    'SERVICE_PASSWORD': os.getenv('SERVICE_PASSWORD', '123'),
}

# Use SQLite for tests, PostgreSQL otherwise
import sys
if 'test' in sys.argv:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': str(BASE_DIR / 'db.sqlite3'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'chat_db'),
            'USER': os.getenv('POSTGRES_USER', 'pasquale'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', '123'),
            'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
            'PORT': os.getenv('POSTGRES_PORT', '5438'),
        },
        'backup': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': str(BASE_DIR / 'db.sqlite3'),
        }
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

# BUFET_URL = os.getenv('bufet_url', 'http://localhost:8003/task/bufet')

# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/
# Update your static files configuration
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "static"),
]

# Media files (user uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Security settings for file uploads
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755
# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ORIGIN_ALLOW_ALL = True

REDIS_HOST = os.getenv('REDIS_HOST', 'my-umbrella-redis-chart-service.redis-namespace.svc.cluster.local')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')
REDIS_CACHE_DB = os.getenv('REDIS_CACHE_DB', '0')  # Chat: DB 0
REDIS_CHANNEL_DB = os.getenv('REDIS_CHANNEL_DB', '8')  # Chat: Channel DB 8

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CACHE_DB}',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'KEY_PREFIX': 'chat:',  # Service prefix for data isolation
        }
    }
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CHANNEL_DB}'],
            'prefix': 'chat',  # Channel prefix
        },
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'my_chat.middleware.JWTAuth',
        ],
        'DEFAULT_FILTER_BACKENDS': [
            'django_filters.rest_framework.DjangoFilterBackend',
        ],
}

# Get environment specifics
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# Environment-based logging configuration

# Logging configuration optimized for ELK Stack

# ELK-Optimized Logging Configuration for chat service
# This configuration provides standardized logging for the ELK Stack

import os
from datetime import datetime

# Logging environment configuration
USE_JSON_LOGGING = os.getenv('USE_JSON_LOGGING', 'true').lower() == 'true'
USE_FILE_LOGGING = os.getenv('USE_FILE_LOGGING', 'false').lower() == 'true'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# Create logs directory for file logging (if enabled)
if USE_FILE_LOGGING:
    LOG_DIR = os.path.join(BASE_DIR, 'logs')
    os.makedirs(LOG_DIR, exist_ok=True)
    ERROR_LOG = os.path.join(LOG_DIR, f'error_{datetime.now().strftime("%Y-%m-%d")}.log')
    INFO_LOG = os.path.join(LOG_DIR, f'info_{datetime.now().strftime("%Y-%m-%d")}.log')
else:
    ERROR_LOG = None
    INFO_LOG = None

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json_kubernetes': {
            'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "module": "%(module)s", "message": "%(message)s", "pathname": "%(pathname)s", "lineno": %(lineno)d, "funcName": "%(funcName)s", "process": %(process)d, "thread": %(thread)d, "service": "chat"}',
            'datefmt': '%Y-%m-%dT%H:%M:%S.%fZ',
            'style': '%',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        # Primary handler for Kubernetes - JSON logs to stdout
        'console_json': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'json_kubernetes',
        },
        # Development console handler
        'console_verbose': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        # Optional file handlers (controlled by USE_FILE_LOGGING)
        'file_error': {
            'level': 'ERROR',
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': ERROR_LOG or '/dev/null',
            'when': 'midnight',
            'backupCount': 7,
            'formatter': 'json_kubernetes',
        } if USE_FILE_LOGGING and ERROR_LOG else {
            'level': 'ERROR',
            'class': 'logging.NullHandler',
        },
        'file_info': {
            'level': 'INFO',
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': INFO_LOG or '/dev/null',
            'when': 'midnight',
            'backupCount': 7,
            'formatter': 'json_kubernetes',
        } if USE_FILE_LOGGING and INFO_LOG else {
            'level': 'INFO',
            'class': 'logging.NullHandler',
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'filters': ['require_debug_false'],
            'formatter': 'verbose',
        },
    },
    'loggers': {
        # Root logger
        '': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        # Django core loggers
        'django': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'django.request': {
            'handlers': (['console_json'] if USE_JSON_LOGGING else ['console_verbose']) + ['mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'WARNING',
            'propagate': False,
        },
        # ASGI/WebSocket loggers (for chat and pong services)
        'daphne': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'INFO',
            'propagate': False,
        },
        'channels': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'INFO',
            'propagate': False,
        },
        'websockets': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'INFO',
            'propagate': False,
        },
        # Service-specific loggers
        'chat': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
            'propagate': False,
        },
        'my_chat': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
            'propagate': False,
        },
        # Additional app-specific loggers
        'task_app': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
            'propagate': False,
        },
        'user_app': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
            'propagate': False,
        },
        'pong_app': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
            'propagate': False,
        },
        'my_notifications': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
            'propagate': False,
        },
        'api_docs': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
            'propagate': False,
        },
        # Third-party library loggers
        'redis': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'WARNING',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'INFO',
            'propagate': False,
        },
        'oauth2_provider': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'INFO',
            'propagate': False,
        },
        'corsheaders': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}
