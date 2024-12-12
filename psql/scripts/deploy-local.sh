#!/bin/bash
set -e

echo "[INFO] Starting deployment process..."

if [ ! -f .env ]; then
    echo "[ERROR] .env file not found"
    echo "[INFO] Creating from example..."
    cp .env.example .env
    echo "[ACTION] Please edit .env with your settings"
    exit 1
fi

if grep -q "NEW_RELIC_LICENSE_KEY=your_license_key_here" .env; then
    echo "[ERROR] Please set your New Relic license key in the .env file"
    exit 1
fi

mkdir -p db-setup/logs

echo "[INFO] Stopping any existing containers..."
docker-compose down --remove-orphans

echo "[INFO] Building and starting services..."
docker-compose build
docker-compose up -d

echo "[INFO] Waiting for k6 load generator to complete..."
docker-compose wait k6

# Get the exit code of the k6 container.
K6_EXIT_CODE=$?

# Check if the k6 container exited with an error.
if [ $K6_EXIT_CODE -ne 0 ]; then
  echo "[ERROR] k6 load-gen container exited with error code: $K6_EXIT_CODE"
  exit $K6_EXIT_CODE
fi

echo "[INFO] Verifying PostgreSQL integration..."
./scripts/verify-nri-postgresql.sh

echo "[INFO] Checking container status..."
docker-compose ps

echo "[INFO] Deployment complete!"
echo "[INFO] Access the API at: http://localhost:${API_PORT:-3000}"
echo "[INFO] Monitor logs with: docker-compose logs -f"