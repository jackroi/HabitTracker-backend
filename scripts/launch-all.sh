#!/usr/bin/env sh


# Stop running containers
docker container stop "habit-tracker-db" 2>/dev/null 1>/dev/null
docker container stop "habit-tracker-api" 2>/dev/null 1>/dev/null

# Remove old containers and networks
docker container rm "habit-tracker-db" 2>/dev/null 1>/dev/null
docker container rm "habit-tracker-api" 2>/dev/null 1>/dev/null
docker network rm "habit-tracker-network" 2>/dev/null 1>/dev/null


# Create network
docker network create --driver bridge "habit-tracker-network"

# Run mongodb
docker run --name "habit-tracker-db" \
           --network "habit-tracker-network" \
           -d -p 27017:27017 \
           mongo:4.4.5-bionic

# Run REST api server
docker run --name "habit-tracker-api" \
           --network "habit-tracker-network" \
           -v $(pwd):"/app" \
           -it \
           -p 8080:8080 \
           node:14 \
           bash
