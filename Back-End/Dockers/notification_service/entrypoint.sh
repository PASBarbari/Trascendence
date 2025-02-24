#!/bin/bash

cd /Notifications

# Apply datab
python3 manage.py makemigrations
python3 manage.py makemigrations my_notifications
python3 manage.py migrate

# Stars
python3 manage.py runserver 0.0.0.0:8000