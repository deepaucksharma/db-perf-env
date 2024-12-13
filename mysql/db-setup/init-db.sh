#!/bin/bash
set -e

# Wait for MySQL to be ready
while ! mysqladmin ping -h"localhost" -u"root" -p"${MYSQL_ROOT_PASSWORD}" --silent; do
    echo "Waiting for MySQL to be ready..."
    sleep 2
done

echo "Running Flyway migrations..."
for sql_file in /flyway/sql/V*__*.sql; do
    echo "Executing $sql_file"
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" < "$sql_file"
done

echo "Loading sample data..."
cd /scripts && python3 load_data.py

echo "Database initialization completed!"
