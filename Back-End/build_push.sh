#!/bin/bash
# Script to build and push Docker images
set -e
# Build the Docker image
USERNAME=bombatomica

docker build -t $USERNAME/user:latest ./task_user/
docker build -t $USERNAME/login:latest ./login/
docker build -t $USERNAME/chat:latest ./chat/
docker build -t $USERNAME/notifications:latest ./Notifications/
docker build -t $USERNAME/pong:latest ./pongProject/

docker push $USERNAME/user:latest
docker push $USERNAME/login:latest
docker push $USERNAME/chat:latest
docker push $USERNAME/notifications:latest
docker push $USERNAME/pong:latest
