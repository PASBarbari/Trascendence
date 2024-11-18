#!/bin/bash

DJANGO_DIR="/home/lollo/Documents/challenge_fides/Back-End/login/"
DOCKER_DIR="/home/lollo/Documents/challenge_fides/Back-End/Dockers/user_db/"

start_services() {
	# Navigate to the Django back-end directory and run the server
	cd "$DJANGO_DIR"
	echo "Starting Django back-end..."
	python manage.py runserver &

	DJANGO_PID=$!
	echo "Django server PID: $DJANGO_PID"

	# Navigate to the Docker directory and start the containers
	cd "$DOCKER_DIR"
	echo "Starting Docker containers..."
	docker-compose up -d

	echo "All services started successfully."
}

stop_services() {
	echo "Stopping services..."

	# Stop Docker containers
	cd "$DOCKER_DIR"
	echo "Stopping Docker containers..."
	docker-compose down

	# Stop Django server
	if [ -n "$DJANGO_PID" ]; then
		echo "Stopping Django server with PID: $DJANGO_PID"
		kill $DJANGO_PID
	else
		echo "Django server PID not found. Attempting to find and stop it..."
		pkill -f "python manage.py runserver"
	fi

	echo "All services stopped successfully."
}

if [ "$1" == "STOP" ]; then
	stop_services
else
	start_services
fi