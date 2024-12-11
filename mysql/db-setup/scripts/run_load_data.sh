#!/bin/bash
set -e

echo "Waiting for MySQL to be ready..."
while ! mysqladmin ping -h"localhost" --silent; do
    sleep 2
done

echo "Starting data load process..."
python3 /docker-entrypoint-initdb.d/load_data.py
