#!/bin/bash
set -e
echo "[INFO] Deploying local environment..."
docker-compose down --remove-orphans
docker-compose up -d --build
echo "[INFO] Environment deployed!"
docker-compose ps

# Call verify_environment.sh
bash verify_environment.sh

# Call verify_environment.sh
bash verify_environment.sh
