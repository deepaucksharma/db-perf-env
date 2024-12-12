#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h "localhost" -U "${POSTGRES_USER}"
do
    sleep 2
done

echo "Starting data load process..."
python3 /docker-entrypoint-initdb.d/load_data.py
