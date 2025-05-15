#!/bin/sh

export DJANGO_SETTINGS_MODULE=chat.settings

# collect static files
python manage.py collectstatic --noinput

# Run migrations at startup
python manage.py makemigrations
python manage.py makemigrations my_chat
python manage.py migrate

# For development
if [ "$DEBUG" = True ]; then
    python manage.py runserver 0.0.0.0:8000 || { echo "Runserver failed to start"; exit 1; }
else
    # For production use Daphne (ASGI server)
    /usr/local/bin/daphne -b 0.0.0.0 -p 8000 chat.asgi:application --root-path=/api/chat || { echo "Daphne failed to start"; exit 1; }
fi