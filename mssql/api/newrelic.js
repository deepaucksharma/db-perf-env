'use strict';

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'MSSQL-Employees-Performance-API'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  distributed_tracing: { enabled: true },
  transaction_tracer: {
    enabled: true,
    record_sql: 'raw',
    explain_threshold: 500
  },
  slow_sql: { enabled: true },
  attributes: { enabled: true },
  logging: { level: 'info' }
};
