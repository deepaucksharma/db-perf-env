#!/bin/bash
set -e

echo "Verifying PostgreSQL New Relic integration..."

# Check if the integration binary exists
echo "Checking integration binary..."
docker-compose exec newrelic-infra-bundle ls -l /var/db/newrelic-infra/newrelic-integrations/bin/nri-postgresql

# Check the version
echo "Checking integration version..."
docker-compose exec newrelic-infra-bundle /var/db/newrelic-infra/newrelic-integrations/bin/nri-postgresql -version

# Test the integration
echo "Testing integration connection..."
docker-compose exec newrelic-infra-bundle /var/db/newrelic-infra/newrelic-integrations/bin/nri-postgresql \
  -hostname postgres-perf \
  -port 5432 \
  -username ${POSTGRES_MONITOR_USER} \
  -password ${POSTGRES_MONITOR_PASSWORD} \
  -database ${POSTGRES_DB}

echo "Verification complete!"
