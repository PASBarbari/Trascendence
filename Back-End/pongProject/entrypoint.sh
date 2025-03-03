#!/bin/bash

set -e

export DJANGO_SETTINGS_MODULE=pongProject.settings

# migrations at startup
python manage.py makemigrations
python manage.py makemigrations pong_app
python manage.py migrate

# REMOVE THIS LINE:
# python3 -m pip install daphne
    
# For development
if [ "$DEBUG" = True ]; then
    python manage.py runserver 0.0.0.0:8000
else
    /usr/local/bin/daphne -b 0.0.0.0 -p 8000 pongProject.asgi:application || { echo "Daphne failed to start"; exit 1; }
fi