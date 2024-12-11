#!/bin/bash
set -e

echo "[INFO] Starting deployment process..."

# Check for required files
if [ ! -f .env ]; then
    echo "[ERROR] .env file not found"
    echo "[INFO] Creating from example..."
    cp .env.example .env
    echo "[ACTION] Please edit .env with your settings"
    exit 1
fi

# Create required directories
mkdir -p db-setup/logs

# Check if New Relic license key is set
if ! grep -q "NEW_RELIC_LICENSE_KEY" .env || grep -q "NEW_RELIC_LICENSE_KEY=your_license_key" .env; then
    echo "[ERROR] Please set your New Relic license key in .env file"
    exit 1
fi

echo "[INFO] Stopping any existing containers..."
docker-compose down --remove-orphans

echo "[INFO] Building and starting services..."
docker-compose build
docker-compose up -d

echo "[INFO] Waiting for services to initialize..."
sleep 15

echo "[INFO] Verifying PostgreSQL integration..."
./verify-nri-postgresql.sh

echo "[INFO] Checking container status..."
docker-compose ps

echo "[INFO] Deployment complete!"
echo "[INFO] Access the API at: http://localhost:${API_PORT:-3000}"
echo "[INFO] Monitor the logs with: docker-compose logs -f"
