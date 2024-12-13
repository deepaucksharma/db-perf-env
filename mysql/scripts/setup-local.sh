#!/bin/bash
set -e

echo "Setting up local MySQL environment..."

# Check MySQL installation
if ! command -v mysql &> /dev/null; then
    echo "Error: MySQL is not installed locally"
    exit 1
fi

# Create .env.local from template
if [ ! -f .env.local ]; then
    echo "Creating .env.local from template..."
    cp .env.local.template .env.local
    echo "Please update .env.local with your local MySQL credentials"
    exit 1
fi

# Source environment variables
source .env.local

# Create database and users
mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE};
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%';
CREATE USER IF NOT EXISTS '${MYSQL_MONITOR_USER}'@'%' IDENTIFIED BY '${MYSQL_MONITOR_PASSWORD}';
GRANT SELECT, PROCESS, REPLICATION CLIENT ON *.* TO '${MYSQL_MONITOR_USER}'@'%';
FLUSH PRIVILEGES;
EOF

# Initialize database
echo "Running initialization scripts..."
mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} < db-setup/migrations/01_init_schema.sql

echo "Local MySQL setup completed!"
