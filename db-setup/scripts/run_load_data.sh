#!/bin/bash
set -e

echo "Waiting for MSSQL to be ready..."
until /opt/mssql-tools/bin/sqlcmd -S mssql -U SA -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" 2>/dev/null; do
    sleep 10
done

echo "MSSQL is ready. Running migrations..."
for file in /app/migrations/*.sql; do
    echo "Running migration: $file"
    /opt/mssql-tools/bin/sqlcmd -S mssql -U SA -P "$MSSQL_SA_PASSWORD" -i "$file"
done

echo "Migrations complete. Loading data..."
python3 /app/scripts/load_data.py

echo "Data load complete!"
