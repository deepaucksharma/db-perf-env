#!/bin/bash
set -e

# Wait for MySQL to be ready
while ! mysqladmin ping -h"localhost" -u"root" -p"${MYSQL_ROOT_PASSWORD}" --silent; do
    echo "Waiting for MySQL to be ready..."
    sleep 2
done

# Run Flyway migrations in order
echo "Running Flyway migrations..."
for sql_file in /flyway/sql/V*__*.sql; do
    echo "Executing $sql_file..."
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" < "$sql_file"
done

# Load initial data
echo "Loading department data..."
cd /scripts && python3 departments_data.py

echo "Loading employee data..."
cd /scripts && python3 load_data.py

echo "Database initialization completed!"