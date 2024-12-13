#!/bin/bash
set -e

echo "Verifying MySQL performance testing environment setup..."

# Check required files exist
required_files=(
    ".env"
    "docker-compose.yml"
    "db-setup/Dockerfile"
    "db-setup/migrations/01_init_schema.sql"
    "db-setup/migrations/02_init_users.sh"
    "db-setup/scripts/load_data.py"
    "services/api/server.js"
    "services/load-generator/scripts/load-test.js"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "Error: Required file $file not found!"
        exit 1
    fi
done

echo "File structure verified successfully."

# Verify Docker and dependencies
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed."; exit 1; }

echo "Dependencies verified successfully."

echo "Setup verification complete. You can now run: docker-compose up -d"
