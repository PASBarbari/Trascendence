#!/bin/sh

set -e

# migrations at startup
python manage.py makemigrations
python manage.py makemigrations my_login
python manage.py migrate

# For development
if [ "$DEBUG" = "True" ]; then
    python manage.py runserver 0.0.0.0:8000
else
    # For production use Gunicorn (WSGI server) with improved logging
    gunicorn login.wsgi:application --bind 0.0.0.0:8000 \
        --log-level=debug \
        --capture-output \
        --access-logfile - \
        --error-logfile - || { echo "Gunicorn failed to start"; exit 1; }
fi