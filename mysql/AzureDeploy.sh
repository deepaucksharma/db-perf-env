#!/bin/bash
set -eo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function for rollback
rollback() {
    log_error "Deployment failed at step: $1"
    log_info "Starting rollback procedure..."
    
    case $1 in
        mysql_install)
            sudo apt-get remove -y mysql-server
            ;;
        mysql_config)
            sudo rm -f /etc/mysql/conf.d/*
            sudo systemctl restart mysql
            ;;
        schema)
            mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP DATABASE IF EXISTS ${MYSQL_DATABASE}"
            ;;
        data)
            mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "
                USE ${MYSQL_DATABASE};
                TRUNCATE TABLE dept_emp;
                TRUNCATE TABLE salaries;
                TRUNCATE TABLE employees;
                TRUNCATE TABLE departments;"
            ;;
    esac
    
    log_info "Rollback completed"
    exit 1
}

# Function to verify MySQL is responding
verify_mysql() {
    local max_attempts=30
    local attempt=1
    
    while ! mysqladmin ping -h"localhost" -u"root" -p"${MYSQL_ROOT_PASSWORD}" --silent; do
        if [ $attempt -eq $max_attempts ]; then
            log_error "Failed to connect to MySQL after $max_attempts attempts"
            return 1
        fi
        log_info "Attempt $attempt of $max_attempts: MySQL not ready, waiting..."
        sleep 2
        ((attempt++))
    done
    return 0
}

# Function to verify database schema
verify_schema() {
    local required_tables=("departments" "employees" "salaries" "dept_emp")
    for table in "${required_tables[@]}"; do
        if ! mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" -e "DESC ${table}" >/dev/null 2>&1; then
            log_error "Table ${table} not found in database"
            return 1
        fi
    done
    return 0
}

# Main deployment script
main() {
    # Load environment variables
    if [ -f .env ]; then
        log_info "Loading environment variables..."
        set -a
        source .env
        set +a
    else
        log_error ".env file not found!"
        exit 1
    fi

    # Detect environment
    if [ -f /.dockerenv ]; then
        ENVIRONMENT="docker"
    else
        ENVIRONMENT="vm"
    fi
    log_info "Starting deployment in ${ENVIRONMENT} environment..."

    # VM-specific setup
    if [ "$ENVIRONMENT" = "vm" ]; then
        log_info "Setting up VM environment..."
        
        # Install required packages
        if ! command -v mysql &> /dev/null; then
            log_info "Installing MySQL and dependencies..."
            sudo apt-get update
            sudo apt-get install -y mysql-server python3 python3-pip || rollback "mysql_install"
            sudo systemctl start mysql
        fi

        # Setup directories and configurations
        log_info "Setting up MySQL configuration..."
        sudo mkdir -p /etc/mysql/conf.d /var/log/mysql
        sudo chown -R mysql:mysql /var/log/mysql
        sudo chmod 750 /var/log/mysql
        
        # Copy and configure MySQL configs
        sudo cp db-setup/config/mysql.cnf /etc/mysql/conf.d/
        sudo cp db-setup/config/performance-schema.cnf /etc/mysql/conf.d/
        sudo chmod 644 /etc/mysql/conf.d/*.cnf
        sudo chown mysql:mysql /etc/mysql/conf.d/*.cnf
        sudo systemctl restart mysql || rollback "mysql_config"
    fi

    # Verify MySQL is running
    log_info "Verifying MySQL connection..."
    verify_mysql || rollback "mysql_connection"

    # Initialize schema
    log_info "Running database schema migrations..."
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" < "db-setup/migrations/01_init_schema.sql" || rollback "schema"
    
    # Setup users and permissions
    log_info "Setting up database users and permissions..."
    bash "db-setup/migrations/02_init_users.sh" || rollback "users"

    # Verify schema
    log_info "Verifying database schema..."
    verify_schema || rollback "schema_verification"

    # Setup Python environment
    log_info "Setting up Python environment..."
    pip3 install --no-cache-dir -r db-setup/requirements.txt
    pip3 install faker

    # Load initial data
    log_info "Loading initial data..."
    cd db-setup/scripts
    
    log_info "Creating departments..."
    python3 departments_data.py || rollback "data"
    
    log_info "Loading employee data..."
    python3 load_data.py || rollback "data"
    
    cd ../..

    # Verify data
    log_info "Verifying data load..."
    local counts=$(mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -N -B -e "
        SELECT 
            (SELECT COUNT(*) FROM ${MYSQL_DATABASE}.departments) as dept_count,
            (SELECT COUNT(*) FROM ${MYSQL_DATABASE}.employees) as emp_count,
            (SELECT COUNT(*) FROM ${MYSQL_DATABASE}.salaries) as salary_count;
    ")
    
    read dept_count emp_count salary_count <<< "$counts"
    
    if [ "$dept_count" -eq 0 ] || [ "$emp_count" -eq 0 ] || [ "$salary_count" -eq 0 ]; then
        log_error "Data verification failed. Empty tables detected."
        rollback "data_verification"
    fi

    # Print deployment summary
    log_info "Deployment Summary:"
    echo "-----------------------------"
    echo "Departments: $dept_count"
    echo "Employees: $emp_count"
    echo "Salary Records: $salary_count"
    echo "-----------------------------"

    log_info "Deployment completed successfully!"
}

# Execute main function
main "$@"