#!/bin/bash

set -e

export DJANGO_SETTINGS_MODULE=Notifications.settings

# collect static files
python manage.py collectstatic --noinput

# migrations at startup
python manage.py makemigrations
python manage.py makemigrations my_notifications
python manage.py migrate

# For development
if [ "$DEBUG" = True ]; then
    python manage.py runserver 0.0.0.0:8000
else
    # For production use Daphne (ASGI server)
    daphne -v 3 --access-log - -b 0.0.0.0 -p 8000 Notifications.asgi:application || { echo "Daphne failed to start"; exit 1; }
fi