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


def ensure_scheme(urls):
    """Add 'http://' scheme to URLs that don't have one"""
    if isinstance(urls, str):
        if not urls.startswith(('http://', 'https://')):
            return f"http://{urls}"
        return urls
    
    # Handle lists
    result = []
    for url in urls:
        if url and not url.startswith(('http://', 'https://')):
            result.append(f"http://{url}")
        else:
            result.append(url)
    return result

Microservices = {
    'Login': ensure_scheme(os.getenv('LOGIN_URL', 'http://localhost:8000')),
    'Chat': ensure_scheme(os.getenv('CHAT_URL', 'http://localhost:8001')),
    'Users': ensure_scheme(os.getenv('USER_URL', 'http://localhost:8002')),
    'Notifications': ensure_scheme(os.getenv('NOTIFICATIONS_URL', 'http://localhost:8003')),
    'Pong': ensure_scheme(os.getenv('PONG_URL', 'http://localhost:8004')),
}

K8S_ALLOWED_HOSTS = os.environ.get('K8S_ALLOWED_HOSTS', '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16').split(',')

def extract_hostname(url):
    """Estrae il nome host da un URL completo."""
    if not url:
        return url
    # Rimuovi http:// o https://
    if url.startswith(('http://', 'https://')):
        url = url.split('://', 1)[1]
    # Rimuovi la porta se presente
    if ':' in url:
        url = url.split(':', 1)[0]
    return url

K8S_SERVICE_HOSTS = [
    extract_hostname(Microservices['Login']),
    extract_hostname(Microservices['Chat']),
    extract_hostname(Microservices['Users']),
    extract_hostname(Microservices['Notifications']),
    extract_hostname(Microservices['Pong']),
]

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
]  + K8S_SERVICE_HOSTS

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
]  + ensure_scheme(K8S_SERVICE_HOSTS)
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
]  + ensure_scheme(K8S_SERVICE_HOSTS)

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
	'corsheaders.middleware.CorsMiddleware',
	'django.middleware.security.SecurityMiddleware',
	'django.contrib.sessions.middleware.SessionMiddleware',
	'django.middleware.common.CommonMiddleware',
	'django.middleware.csrf.CsrfViewMiddleware',
	'django.contrib.auth.middleware.AuthenticationMiddleware',
	'django.contrib.messages.middleware.MessageMiddleware',
	'django.middleware.clickjacking.XFrameOptionsMiddleware',
	# 'my_chat.middleware.TokenAuthMiddlewareHTTP',
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

WSGI_APPLICATION = 'chat.wsgi.application'
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

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
	'default': {
	'ENGINE': 'django.db.backends.postgresql',
	'NAME': os.getenv('POSTGRES_DB', 'chat_db'),
	'USER': os.getenv('POSTGRES_USER', 'pasquale'),
	'PASSWORD': os.getenv('POSTGRES_PASSWORD', '123'),
	'HOST': os.getenv('POSTGRES_HOST', 'localhost'),
	'PORT': os.getenv('POSTGRES_PORT', '5436'),
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
STATIC_URL = '/static/'
STATIC_ROOT = '/home/lollo/Documents/challenge_fides/Back-End/login/staticfiles'
# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ORIGIN_ALLOW_ALL = True

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = os.getenv('REDIS_PORT', '6700')
REDIS_CACHE_DB = os.getenv('REDIS_CACHE_DB', '0')
REDIS_CHANNEL_DB = os.getenv('REDIS_CHANNEL_DB', '1')

CACHES = {
	'default': {
		'BACKEND': 'django_redis.cache.RedisCache',
		'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CACHE_DB}',
		'OPTIONS': {
			'CLIENT_CLASS': 'django_redis.client.DefaultClient',
		}
	}
}



CHANNEL_LAYERS = {
	'default': {
		'BACKEND': 'channels_redis.core.RedisChannelLayer',
		'CONFIG': {
			"hosts": [f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CHANNEL_DB}'],
			'prefix': 'chat',
		},
	}
}


REST_FRAMEWORK = {
	'DEFAULT_AUTHENTICATION_CLASSES': [
		'my_chat.middleware.JWTAuth',
		],
		'DEFAULT_PERMISSION_CLASSES': [
				'my_chat.Permissions.IsAuthenticatedUserProfile',
		],
		'DEFAULT_FILTER_BACKENDS': [
			'django_filters.rest_framework.DjangoFilterBackend',
		],
}

LOGGING = {
	'version': 1,
	'disable_existing_loggers': False,
	'handlers': {
		'loki': {
			'class': 'logging.StreamHandler',
			'formatter': 'detailed',
			'stream': 'ext://sys.stdout',  # Sends logs to stdout for Loki
		},
	},
	'loggers': {
		'django': {
			'handlers': ['loki'],
			'level': 'INFO',
			'propagate': True,
		},
	},
	'formatters': {
		'detailed': {
			'format': '{levelname} {asctime} {module} {message}',
			'style': '{',
		},
	},
}

SIMPLE_JWT = {
	'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
	'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
	'ROTATE_REFRESH_TOKENS': True,
	'BLACKLIST_AFTER_ROTATION': True,
	'ALGORITHM': 'HS256',
	# 'ISSUER': 'login',
	'SIGNING_KEY': SECRET_KEY,
	'VERIFYING_KEY': None,
	'AUTH_HEADER_TYPES': ('Bearer',),
	'USER_ID_FIELD': 'user_id',
	'USER_ID_CLAIM': 'user_id',
	'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
	'TOKEN_TYPE_CLAIM': 'token_type',
}

OAUTH2_APP_NAME = 'Chat_' + datetime.strftime(datetime.now(), '%Y-%m-%d:%H%M%S')
Microservices = {
	'Login': os.getenv('LOGIN_URL', 'http://localhost:8000'),
	'Chat': os.getenv('CHAT_URL', 'http://localhost:8001'),
	'Users': os.getenv('USER_URL', 'http://localhost:8002'),
	'Notifications': os.getenv('NOTIFICATIONS_URL', 'http://localhost:8003'),
	'Personal' : "Self",
}

SWAGGER_SETTINGS = {
	'USE_SESSION_AUTH': False,
	'SECURITY_DEFINITIONS': {
		'Your App API - Swagger': {
			'type': 'oauth2',
			'authorizationUrl': f"{Microservices['Login']}/o/authorize",
			'tokenUrl': f"{Microservices['Login']}/o/token/",
			'flow': 'accessCode',
			'scopes': {
				'read:groups': 'read groups',
			}
		}
	},
	'OAUTH2_CONFIG': {
		'clientId': f'{oauth2_settings["CLIENT_ID"]}',
		'clientSecret': f'{oauth2_settings["CLIENT_SECRET"]}',
		'appName': f'{OAUTH2_APP_NAME}',
	},
}

ADMIN = {
	'username': os.getenv('ADMIN_USERNAME', 'admin'),
	'email': os.getenv('ADMIN_EMAIL', 'admin@admin.com'),
	'password': os.getenv('ADMIN_PASSWORD', 'admin'),
}

CSRF_LOGIN_URL = Microservices['Login'] + '/login/get_csrf_token'
REGISTER_URL = Microservices['Login'] + '/login/Serviceregister'
# OAUTH2_REDIRECT_URL = f"{Microservices['Login']}/static/drf-yasg/swagger-ui-dist/oauth2-redirect.html"
# OAUTH2_REDIRECT_URL = 'http://localhost:8001/static/drf-yasg/swagger-ui-dist/oauth2-redirect.html'
