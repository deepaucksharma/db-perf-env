'use strict';

exports.config = {
  app_name: ['MySQL-Employee-Performance-API'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  distributed_tracing: {
    enabled: true
  },
  transaction_tracer: {
    enabled: true,
    // Obfuscate SQL to avoid exposing sensitive data, while still providing query structure
    record_sql: 'obfuscated', 
    // EXPLAIN queries longer than 250ms for deeper insight
    explain_threshold: 250
  },
  slow_sql: {
    enabled: true
  },
  attributes: {
    enabled: true
  },
  logging: {
    level: 'info'
  }
};
