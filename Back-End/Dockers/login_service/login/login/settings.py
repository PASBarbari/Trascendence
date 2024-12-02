"""
Django settings for login project.

Generated by 'django-admin startproject' using Django 4.2.16.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.2/ref/settings/
"""

from pathlib import Path
import os
import secrets

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-kp7qs)0l1ie$%muo93+829po%pe9*gz8z8ah6dy0)cskj-5l*c')
#'django-insecure-kp7qs)0l1ie$%muo93+829po%pe9*gz8z8ah6dy0)cskj-5l*c'
API_KEY = os.getenv('API_KEY', '123')
# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = [
	'localhost',
	'127.0.0.1',
	'http://localhost:8000',
	'http://localhost:8001',
	'http://localhost:3000',
]

CORS_ALLOWED_ORIGINS = [
	'http://localhost:8000',
	'http://localhost:8001',
	'http://localhost:3000',
]
# CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
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
	'my_login',
	'corsheaders',
	'oauth2_provider',
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

ROOT_URLCONF = 'login.urls'

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

WSGI_APPLICATION = 'login.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
	'default': {
		'ENGINE': 'django.db.backends.postgresql',
		'NAME': os.getenv('POSTGRES_DB', 'login'),
		'USER': os.getenv('POSTGRES_USER', 'pasquale'),
		'PASSWORD' : os.getenv('POSTGRES_PASSWORD', '123'),
		'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
		'PORT': os.getenv('POSTGRES_PORT', '5432'),
	}
}

#user model
AUTH_USER_MODEL = 'my_login.AppUser'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'oauth2_provider.contrib.rest_framework.OAuth2Authentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

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

OAUTH2_PROVIDER = {
    'ACCESS_TOKEN_EXPIRE_SECONDS': 36000,
    'AUTHORIZATION_CODE_EXPIRE_SECONDS': 600,
    'REFRESH_TOKEN_EXPIRE_SECONDS': 36000,
    'ROTATE_REFRESH_TOKENS': True,
    'SCOPES': {
        'read': 'Read scope',
        'write': 'Write scope',
        'groups': 'Access to your groups',
    },
    # 'OAUTH2_VALIDATOR_CLASS': 'oauth2_provider.oauth2_validators.OAuth2Validator',
		'OAUTH2_VALIDATOR_CLASS': 'my_login.validations.CustomOAuth2Validator',
}
# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True
client = {
	'CLIENT_ID' : '',
	'CLIENT_SECRET' : '',
}

client['CLIENT_ID'] = os.getenv('CLIENT_ID', '2')
client['CLIENT_SECRET'] = os.getenv('CLIENT_SECRET', '123')

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = '/home/lollo/Documents/challenge_fides/Back-End/login/staticfiles'
# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SERVICE_PASSWORD = os.getenv('SERVICE_PASSWORD','123') # this is the password that the service will use to authenticate itself to the OAuth2 server

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
        'level': 'DEBUG',
    },
}

# LOGGING = {
#     'version': 1,
#     'disable_existing_loggers': False,
#     'handlers': {
#         'loki': {
#             'class': 'logging.StreamHandler',
#             'formatter': 'detailed',
#             'stream': 'ext://sys.stdout',  # Sends logs to stdout for Loki
#         },
#     },
#     'loggers': {
#         'django': {
#             'handlers': ['loki'],
#             'level': 'INFO',
#             'propagate': True,
#         },
#     },
#     'formatters': {
#         'detailed': {
#             'format': '{levelname} {asctime} {module} {message}',
#             'style': '{',
#     	    },
# 	    },
# }
Microservices = {
	'Login': os.getenv('LOGIN_SERVICE', 'http://localhost:8000'),
	'Chat': os.getenv('CHAT_SERVICE', 'http://localhost:8001'),
	'Users': os.getenv('USERS_SERVICE', 'http://localhost:8002'),
	'Notifications': os.getenv('NOTIFICATIONS_SERVICE', 'http://localhost:8003'),
}