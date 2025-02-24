#!/bin/bash

cd /task_user

# Apply datab
python3 manage.py makemigrations
python3 manage.py makemigrations user_app task_app
python3 manage.py migrate

# Stars
python3 manage.py runserver 0.0.0.0:8000