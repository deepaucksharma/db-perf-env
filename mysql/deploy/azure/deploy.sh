#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../common/validate.sh"

# Validate environment
validate_environment "azure"

# Load environment variables
source "${SCRIPT_DIR}/../../config/azure.env"

echo "Starting Azure VM native deployment..."

# Install MySQL if not present
if ! command -v mysql &> /dev/null; then
    echo "Installing MySQL..."
    sudo microdnf update
    sudo microdnf install -y mysql-server
fi

# Configure MySQL
echo "Configuring MySQL..."
sudo cp "${SCRIPT_DIR}/../../config/mysql/azure.cnf" /etc/mysql/conf.d/performance.cnf
sudo systemctl restart mysql

# Initialize database
echo "Initializing database..."
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" < "${SCRIPT_DIR}/../../db-setup/migrations/V1__init_monitoring.sql"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" < "${SCRIPT_DIR}/../../db-setup/migrations/V2__create_base_schema.sql"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" < "${SCRIPT_DIR}/../../db-setup/migrations/V3__add_indexes.sql"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" < "${SCRIPT_DIR}/../../db-setup/migrations/V4__create_views.sql"

# Initialize data
echo "Initializing data..."
source "${SCRIPT_DIR}/../common/init-data.sh"

# Setup monitoring
echo "Setting up monitoring..."
source "${SCRIPT_DIR}/setup-monitoring.sh"

echo "Deployment complete!"
