import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics
const requestDuration = new Trend('request_duration_ms');
const errorRate = new Rate('error_rate');

export let options = {
  vus: parseInt(__ENV.K6_VUS) || 50,
  duration: __ENV.K6_DURATION || '30m',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    'error_rate': ['rate<0.1']
  }
};

const baseUrl = __ENV.API_URL || 'http://api-layer:3000';

// New Relic Telemetry API details
const NEW_RELIC_LICENSE_KEY = __ENV.NEW_RELIC_LICENSE_KEY;
const NEW_RELIC_APP_NAME = __ENV.NEW_RELIC_APP_NAME || 'MyApp';
const NR_METRIC_ENDPOINT = 'https://metric-api.newrelic.com/metric/v1';

function sendMetricsToNewRelic(metrics) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  const metricsPayload = [{
    "metrics": metrics.map(m => ({
      "name": `Custom/LoadGenerator/${m.name}`,
      "type": m.type,
      "value": m.value,
      "timestamp": timestamp,
      "attributes": {
        "appName": NEW_RELIC_APP_NAME,
        "environment": __ENV.NODE_ENV || "production"
      }
    }))
  }];

  const res = http.post(NR_METRIC_ENDPOINT,
    JSON.stringify(metricsPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': NEW_RELIC_LICENSE_KEY
      }
    }
  );

  if (res.status !== 202) {
    console.error(`Failed to send metrics to New Relic: ${res.status} ${res.body}`);
  }
}

export default function () {
  // Randomly choose between complex query and lock test
  const endpoint = Math.random() < 0.7 ? '/complex_query' : '/lock_test';
  
  const start = Date.now();
  const res = http.get(`${baseUrl}${endpoint}`);
  const duration = Date.now() - start;
  
  // Check response
  const success = check(res, { 
    'status 200': (r) => r.status === 200,
    'valid json': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    }
  });

  // Record metrics
  requestDuration.add(duration);
  errorRate.add(!success);

  // Prepare metrics for New Relic
  const metrics = [
    {
      name: "RequestDuration",
      type: "gauge",
      value: duration
    },
    {
      name: "RequestSuccess",
      type: "count",
      value: success ? 1 : 0
    },
    {
      name: endpoint.substring(1),  // Remove leading slash
      type: "count",
      value: 1
    }
  ];

  // Send metrics to New Relic
  sendMetricsToNewRelic(metrics);

  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}
