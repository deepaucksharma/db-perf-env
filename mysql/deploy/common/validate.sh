#!/bin/bash

validate_environment() {
    local deploy_type=$1
    
    # Check for required tools
    case $deploy_type in
        "docker")
            command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
            command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed."; exit 1; }
            ;; 
        "azure")
            command -v mysql >/dev/null 2>&1 || { echo "MySQL client is required but not installed."; exit 1; }
            ;;
    esac
    
    # Check for required files
    local required_files=(
        "../../config/mysql/${deploy_type}.cnf"
        "../../config/${deploy_type}.env"
        "../../db-setup/migrations/V1__init_monitoring.sql"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "${SCRIPT_DIR}/${file}" ]]; then
            echo "Required file not found: ${file}"
            exit 1
        fi
    done
}
