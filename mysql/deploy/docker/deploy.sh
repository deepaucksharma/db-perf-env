#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../common/validate.sh"

# Validate environment
validate_environment "docker"

# Load environment variables
source "${SCRIPT_DIR}/../../config/docker.env"

echo "Starting Docker deployment..."

# Ensure Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Starting Docker..."
    sudo systemctl start docker
fi

# Pull required images
echo "Pulling required Docker images..."
docker-compose pull

# Start services
echo "Starting services..."
docker-compose up -d mysql

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
until docker-compose exec -T mysql mysqladmin ping -h"localhost" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --silent; do
    echo "MySQL is unavailable - sleeping"
    sleep 5
done

# Initialize data
echo "Initializing data..."
source "${SCRIPT_DIR}/../common/init-data.sh"

# Start remaining services
echo "Starting API and load generator..."
docker-compose up -d api load-generator

echo "Deployment complete!"
