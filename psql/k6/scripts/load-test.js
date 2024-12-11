import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const queryDuration = new Trend('query_duration');

// New Relic configuration
const NR_LICENSE_KEY = __ENV.NEW_RELIC_LICENSE_KEY;
const NR_APP_NAME = __ENV.NEW_RELIC_APP_NAME || 'postgres-perf-demo-load';
const NR_METRICS_API = 'https://metric-api.newrelic.com/metric/v1';

export let options = {
  vus: __ENV.K6_VUS || 10,
  duration: __ENV.K6_DURATION || '5m',
  thresholds: {
    errors: ['rate<0.1'],
    http_req_duration: ['p(95)<2000']
  }
};

function sendMetricsToNewRelic(metrics) {
  const payload = [{
    metrics: [
      {
        name: 'PostgresLoadTest',
        type: 'gauge',
        value: metrics.duration,
        timestamp: Date.now(),
        attributes: {
          queryType: metrics.queryType,
          success: metrics.success,
          statusCode: metrics.statusCode,
          virtualUsers: options.vus
        }
      }
    ]
  }];

  const headers = {
    'Api-Key': NR_LICENSE_KEY,
    'Content-Type': 'application/json'
  };

  http.post(NR_METRICS_API, JSON.stringify(payload), { headers });
}

const ENDPOINTS = [
  { name: 'complex', weight: 0.4 },
  { name: 'lock', weight: 0.3 },
  { name: 'stats', weight: 0.3 }
];

function selectEndpoint() {
  const r = Math.random();
  let sum = 0;
  for (const endpoint of ENDPOINTS) {
    sum += endpoint.weight;
    if (r <= sum) return endpoint.name;
  }
  return ENDPOINTS[0].name;
}

export default function() {
  const queryType = selectEndpoint();
  const url = `http://api:3000/query/${queryType}`;
  
  const startTime = new Date().getTime();
  const response = http.get(url);
  const duration = new Date().getTime() - startTime;
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200
  });

  errorRate.add(!success);
  queryDuration.add(duration);

  sendMetricsToNewRelic({
    queryType,
    duration,
    success,
    statusCode: response.status
  });

  sleep(1);
}
