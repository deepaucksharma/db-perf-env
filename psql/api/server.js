import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const queryDuration = new Trend('query_duration');

const NR_LICENSE_KEY = __ENV.NEW_RELIC_LICENSE_KEY;
const NR_APP_NAME = __ENV.NEW_RELIC_APP_NAME || 'Postgres-Employees-Performance-Demo-LoadGen';
const NR_METRICS_API = 'https://metric-api.newrelic.com/metric/v1';

export let options = {
  vus: parseInt(__ENV.K6_VUS) || 50,
  duration: __ENV.K6_DURATION || '30m',
  thresholds: {
    errors: ['rate<0.1'],
    http_req_duration: ['p(95)<2000']
  },
  scenarios: {
    io_heavy: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30m',
      exec: 'runIOHeavy'
    },
    lock_heavy: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      stages: [
        { duration: '3m', target: 15 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 10 }
      ],
      exec: 'runLockHeavy'
    },
    memory_heavy: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 200,
      maxDuration: '30m',
      exec: 'runMemoryHeavy'
    },
    mixed: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 30,
      stages: [
          { duration: '5m', target: 10 },
          { duration: '20m', target: 10 },
          { duration: '5m', target: 0 }
      ],
      exec: 'runMixed'
    }
  }
};

function hitEndpoint(url, params = {}) {
  const res = http.get(url, { params });
  check(res, { 'status 200': (r) => r.status === 200 });
  return res;
}

export function runIOHeavy() {
  const prefixChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const requests = [
    { method: 'GET', url: `${__ENV.API_URL}/slow_query` },
    { method: 'GET', url: `${__ENV.API_URL}/slow_query_force_table_scan`, params: { prefix: prefixChar } }
  ];
  const responses = http.batch(requests);
  responses.forEach(res => {
    check(res, { 'status 200': (r) => r.status === 200 });
  });
  sleep(Math.random() * 0.5 + 0.2);
}

export function runLockHeavy() {
  hitEndpoint(`${__ENV.API_URL}/lock_contention`);
  hitEndpoint(`${__ENV.API_URL}/lock_contention_salaries`);
  hitEndpoint(`${__ENV.API_URL}/blocking_sessions`);
  sleep(0.1);
}

export function runMemoryHeavy() {
  const requests = [
    { method: 'GET', url: `${__ENV.API_URL}/memory_pressure` },
    { method: 'GET', url: `${__ENV.API_URL}/memory_pressure_generate_memory_pressure` }
  ];
  const responses = http.batch(requests);
  responses.forEach(res => {
    check(res, { 'status 200': (r) => r.status === 200 });
  });
  sleep(Math.random() * 2 + 1);
}

const ENDPOINTS = [
  { name: 'slow_query', weight: 0.2 },
  { name: 'slow_query_force_table_scan', weight: 0.2 },
  { name: 'lock_contention', weight: 0.15 },
  { name: 'lock_contention_salaries', weight: 0.15 },
  { name: 'memory_pressure', weight: 0.15 },
  { name: 'memory_pressure_generate_memory_pressure', weight: 0.15 }
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

export function runMixed() {
  const queryType = selectEndpoint();
  const url = `${__ENV.API_URL}/${queryType}`;
  const startTime = new Date().getTime();
  const response = http.get(url);
  const duration = new Date().getTime() - startTime;
  const success = check(response, { 'status is 200': (r) => r.status === 200 });
  errorRate.add(!success);
  queryDuration.add(duration);
  sendMetricsToNewRelic({ queryType, duration, success, statusCode: response.status });
  sleep(1);
}

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
  
  const response = http.post(NR_METRICS_API, JSON.stringify(payload), { headers });
  if (response.status >= 400) {
    console.error(`Error sending metrics to New Relic: ${response.status} - ${response.body}`);
  }
}

export default function() {
    runIOHeavy();
    runLockHeavy();
    runMemoryHeavy();
    runMixed();
}