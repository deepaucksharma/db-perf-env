// Renamed to newrelic.cjs
'use strict'

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'MySQL-Performance-Demo-API'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info',
    filepath: '/var/log/newrelic/newrelic_agent.log'
  },
  allow_all_headers: true,
  distributed_tracing: {
    enabled: true
  },
  transaction_tracer: {
    enabled: true,
    record_sql: 'raw',
    explain_threshold: 500
  },
  slow_sql: {
    enabled: true
  }
}
