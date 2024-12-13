#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo ".env file not found!"
    exit 1
fi

# Detect environment
if [ -f /.dockerenv ]; then
    ENVIRONMENT="docker"
else
    ENVIRONMENT="vm"
fi

echo "[INFO] Starting deployment in ${ENVIRONMENT} environment..."

# VM-specific setup
if [ "$ENVIRONMENT" = "vm" ]; then
    echo "[INFO] Setting up VM environment..."
    
    # Install required packages
    if ! command -v mysql &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y mysql-server python3 python3-pip
        sudo systemctl start mysql
    fi

    # Copy MySQL configs
    sudo mkdir -p /etc/mysql/conf.d
    sudo cp db-setup/config/mysql.cnf /etc/mysql/conf.d/custom_mysql.cnf
    sudo cp db-setup/config/performance-schema.cnf /etc/mysql/conf.d/performance_schema.cnf
    sudo systemctl restart mysql
fi

# Wait for MySQL
echo "[INFO] Waiting for MySQL..."
max_attempts=30
attempt=1
while ! mysqladmin ping -h"localhost" -u"root" -p"${MYSQL_ROOT_PASSWORD}" --silent; do
    if [ $attempt -eq $max_attempts ]; then
        echo "Failed to connect to MySQL after $max_attempts attempts"
        exit 1
    fi
    echo "Attempt $attempt of $max_attempts: MySQL not ready, waiting..."
    sleep 2
    ((attempt++))
done

# Initialize database
echo "[INFO] Running migrations..."
for migration in db-setup/migrations/V*.sql; do
    echo "Running migration: $migration"
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" < "$migration"
done

# Setup Python environment and run data scripts
echo "[INFO] Setting up Python environment..."
pip3 install --no-cache-dir -r db-setup/requirements.txt

echo "[INFO] Running data setup scripts..."
cd db-setup/scripts
python3 create_tables.py
python3 departments_data.py
python3 load_data.py
cd ../..

# If in Docker environment, handle additional services
if [ "$ENVIRONMENT" = "docker" ]; then
    echo "[INFO] Starting Docker services..."
    docker-compose up -d api load-generator
fi

echo "[INFO] Deployment completed successfully!"
