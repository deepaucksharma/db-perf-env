#!/bin/bash

MODE=${1:-docker}

case $MODE in
  docker)
    echo "Running with Docker MySQL..."
    cp .env.docker .env
    docker compose --profile docker up -d
    ;;
  local)
    echo "Running with local MySQL..."
    if [ ! -f .env.local ]; then
      echo "Error: .env.local not found. Run setup-local.sh first"
      exit 1
    fi
    cp .env.local .env
    docker compose up -d api load-generator
    ;;
  *)
    echo "Usage: $0 [docker|local]"
    exit 1
    ;;
esac
