#!/bin/bash

cd /login

# Apply datab
python3 manage.py makemigrations
python3 manage.py makemigrations my_login
python3 manage.py migrate

# Stars
python3 manage.py runserver 0.0.0.0:8000