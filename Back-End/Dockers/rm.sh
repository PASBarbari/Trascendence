#!/bin/bash

# Get a list of all image IDs
all_images=$(docker images -q)

# Get a list of image IDs used in docker-compose.yml
used_images=$(docker-compose config | grep 'image:' | awk '{print $2}' | xargs -I {} docker images {} -q)

# Find the difference between all images and used images
unused_images=$(comm -23 <(echo "$all_images" | sort) <(echo "$used_images" | sort))

# Remove unused images
if [ -n "$unused_images" ]; then
  echo "Removing unused images..."
  for image in $unused_images; do
    # Remove any stopped containers using the image
    containers=$(docker ps -a -q --filter ancestor=$image)
    if [ -n "$containers" ]; then
      sudo docker rm -f $containers
    fi
    # Forcefully remove the image
    sudo docker rmi -f $image
  done
else
  echo "No unused images to remove."
fi