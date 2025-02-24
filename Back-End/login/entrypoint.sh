#!/bin/bash

cd /chat

# Apply datab
python3 manage.py makemigrations
python3 manage.py makemigrations my_chat
python3 manage.py migrate

# Star
python3 manage.py runserver 0.0.0.0:8000