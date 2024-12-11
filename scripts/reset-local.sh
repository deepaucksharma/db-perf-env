#!/bin/bash
set -e
echo "[INFO] Resetting local environment..."
docker-compose down -v
echo "[INFO] Environment reset complete."
