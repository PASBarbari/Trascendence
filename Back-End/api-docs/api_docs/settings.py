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
            'NAME': os.getenv('POSTGRES_DB', 'apidocs_db'),
            'USER': os.getenv('POSTGRES_USER', 'pasquale'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', '123'),
            'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
            'PORT': os.getenv('POSTGRES_PORT', '5439'),
        },
        'backup': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': str(BASE_DIR / 'db.sqlite3'),
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

# ELK-Optimized Logging Configuration for api-docs service
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
            'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "module": "%(module)s", "message": "%(message)s", "pathname": "%(pathname)s", "lineno": %(lineno)d, "funcName": "%(funcName)s", "process": %(process)d, "thread": %(thread)d, "service": "api-docs"}',
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
        'api-docs': {
            'handlers': ['console_json'] if USE_JSON_LOGGING else ['console_verbose'],
            'level': 'DEBUG' if os.getenv('DEBUG', 'False').lower() == 'true' else 'INFO',
            'propagate': False,
        },
        'my_api-docs': {
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
