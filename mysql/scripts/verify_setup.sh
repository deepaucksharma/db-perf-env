#!/bin/bash
set -e

echo "Verifying setup..."

# Check MySQL connection
echo "Checking MySQL connection..."
if ! docker-compose exec mysql mysqladmin ping -h"localhost" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --silent; then
    echo "Error: Cannot connect to MySQL"
    exit 1
fi

# Check database tables
echo "Checking database tables..."
docker-compose exec mysql mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "
    SELECT table_name, table_rows 
    FROM information_schema.tables 
    WHERE table_schema = '$MYSQL_DATABASE'
" "$MYSQL_DATABASE"

# Check API health
echo "Checking API health..."
if ! curl -s "http://localhost:$API_PORT/health" | grep -q "healthy"; then
    echo "Error: API is not healthy"
    exit 1
fi

# Check monitoring user
echo "Checking monitoring user permissions..."
docker-compose exec mysql mysql -u"$MYSQL_MONITOR_USER" -p"$MYSQL_MONITOR_PASSWORD" \
    -e "SELECT COUNT(*) FROM performance_schema.setup_instruments WHERE enabled='YES'"

echo "Verification completed successfully!"
