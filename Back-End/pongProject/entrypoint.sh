#!/bin/bash

set -e

# migrations at startup
python manage.py makemigrations
python manage.py makemigrations pong_app
python manage.py migrate

# For development
if [ "$DEBUG" = True ]; then
    python manage.py runserver 0.0.0.0:8000
else
    # For production use Daphne (ASGI server)
    daphne -b 0.0.0.0 -p 8000 pongProject.asgi:application || { echo "Daphne failed to start"; exit 1; }
fi