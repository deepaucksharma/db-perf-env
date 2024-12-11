#!/bin/bash
set -e

echo "[INFO] Deploying local environment..."

# Ensure New Relic license key is set
if [ -z "$NEW_RELIC_LICENSE_KEY" ]; then
    echo "[ERROR] NEW_RELIC_LICENSE_KEY is not set in .env file"
    exit 1
fi

docker-compose down --remove-orphans
docker-compose up -d --build

echo "[INFO] Environment deployed!"
echo "[INFO] Checking New Relic Infrastructure agent status..."
sleep 5
docker logs newrelic-infra

echo "[INFO] Container status:"
docker-compose ps
