#!/bin/bash
set -e

echo "Verifying PostgreSQL New Relic integration..."

# Check if the integration binary exists
echo "Checking integration binary..."
if ! docker-compose exec newrelic-infra-bundle ls -l /var/db/newrelic-infra/newrelic-integrations/bin/nri-postgresql; then
    echo "Error: nri-postgresql binary not found!"
    exit 1
fi

# Check the version
echo "Checking integration version..."
if ! docker-compose exec newrelic-infra-bundle /var/db/newrelic-infra/newrelic-integrations/bin/nri-postgresql -version; then
    echo "Error: nri-postgresql version check failed!"
    exit 1
fi

# Test the integration
echo "Testing integration connection..."
if ! docker-compose exec newrelic-infra-bundle /var/db/newrelic-infra/newrelic-integrations/bin/nri-postgresql \
  -hostname postgres-newrelic \
  -port 5432 \
  -username ${POSTGRES_MONITOR_USER} \
  -password ${POSTGRES_MONITOR_PASSWORD} \
  -database ${POSTGRES_DB}; then
    echo "Error: nri-postgresql integration test failed!"
    exit 1
fi

echo "Verification complete!"