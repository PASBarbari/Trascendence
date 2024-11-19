#!/bin/bash

sudo apt update
sudo apt install gnome-terminal -y
sudo apt upgrade -y

CURRENT_DIR=$(pwd)

# Avvia docker-compose
cd $CURRENT_DIR/Back-End/Dockers
docker-compose up -d

if [ $? -ne 0 ]; then
    sudo docker-compose up -d
fi

cd -

cd Back-End
source venv/bin/activate
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    python3 -m venv venv
    source venv/bin/activate
else
    echo "Virtual environment activated"
fi

if [ $EXIT_CODE -ne 0 ]; then
    echo "Error: Virtual environment failed with exit code $EXIT_CODE"
    exit $EXIT_CODE
fi

pip install -r requirements.txt

sleep 5

# Apri tre terminali esterni
gnome-terminal -- bash -c "cd $CURRENT_DIR/Back-End && source venv/bin/activate && cd login && python3 manage.py makemigrations && python3 manage.py migrate && python3 manage.py runserver; exec bash"
gnome-terminal -- bash -c "cd $CURRENT_DIR/Back-End && source venv/bin/activate && cd chat && python3 manage.py makemigrations && python3 manage.py makemigrations my_chat && python3 manage.py migrate && python3 manage.py runserver 8001; exec bash"
gnome-terminal -- bash -c "cd $CURRENT_DIR/Front-End && npm start || (npm install && npm start); exec bash"

echo "Server processes started in separate terminals."

read -p "Premi invio per chiudere i container e i terminali"

# Chiudi i terminali aperti
pkill -f "gnome-terminal -- bash -c"

cd $CURRENT_DIR/Back-End/Dockers
docker-compose down

if [ $? -ne 0 ]; then
    sudo docker-compose down --remove-orphans
fi