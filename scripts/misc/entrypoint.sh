#!/bin/sh

set -e

# collect static files
python manage.py collectstatic --noinput

# migrations at startup (for the lightweight SQLite DB)
python manage.py migrate --noinput

# For development
if [ "$DEBUG" = "True" ]; then
    python manage.py runserver 0.0.0.0:8005
else
    # For production use Gunicorn (WSGI server)
    gunicorn --bind 0.0.0.0:8005 api_docs.wsgi:application \
        --log-level=info \
        --capture-output \
        --access-logfile - \
        --error-logfile - || { echo "Gunicorn failed to start"; exit 1; }
fi
