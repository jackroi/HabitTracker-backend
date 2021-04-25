#!/usr/bin/env sh


docker rmi "habit-tracker-api-image" 2>/dev/null 1>/dev/null

docker build . -t "habit-tracker-api-image"
