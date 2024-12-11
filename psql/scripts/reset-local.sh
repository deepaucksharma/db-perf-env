#!/bin/bash
set -e

echo "[INFO] Starting environment reset..."

# Stop all containers
echo "[INFO] Stopping all containers..."
docker-compose down

# Remove volumes
echo "[INFO] Removing volumes..."
docker volume rm $(docker volume ls -q | grep postgres-perf) 2>/dev/null || true

# Clean up Docker resources
echo "[INFO] Cleaning up Docker resources..."
docker system prune -f

echo "[INFO] Environment reset complete!"
echo "[INFO] To redeploy, run: make deploy"
