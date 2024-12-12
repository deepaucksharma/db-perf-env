#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h "localhost" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
do
    sleep 2
done

echo "Running SQL migrations..."
for sql_file in /docker-entrypoint-initdb.d/*.sql; do
    echo "Executing: ${sql_file}"
    psql -h localhost -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -f "$sql_file"
done

echo "Starting data load process..."
python3 /docker-entrypoint-initdb.d/load_data.py