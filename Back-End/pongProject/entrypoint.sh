#!/bin/bash

set -e

export DJANGO_SETTINGS_MODULE=pongProject.settings

# mkdir -p /app/static
# ln -sf /app/staticfiles/* /app/static/
# # collect static files
# python manage.py collectstatic --noinput


# migrations at startup
python manage.py makemigrations --noinput
python manage.py makemigrations pong_app --noinput
python manage.py migrate --noinput
    
# For development
if [ "$DEBUG" = True ]; then
    python manage.py runserver 0.0.0.0:8000
else
    /usr/local/bin/daphne -v 3 --access-log - -b 0.0.0.0 -p 8000 pongProject.asgi:application || { echo "Daphne failed to start"; exit 1; }
fi