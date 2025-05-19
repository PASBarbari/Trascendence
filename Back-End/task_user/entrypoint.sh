#!/bin/sh

set -e

# collect static files
python manage.py collectstatic --noinput

# migrations at startup
python manage.py makemigrations user_app task_app --noinput
python manage.py migrate --noinput

# For development
if [ "$DEBUG" = "True" ]; then
    python manage.py runserver 0.0.0.0:8000
else
    # For production use Gunicorn (WSGI server)
    gunicorn --bind 0.0.0.0:8000 task_user.wsgi:application || { echo "Gunicorn failed to start"; exit 1; }
fi