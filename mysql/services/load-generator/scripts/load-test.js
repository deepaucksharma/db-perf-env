import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const dbLatency = new Trend('db_operation_latency');
const errorRate = new Rate('error_rate');
const successRate = new Rate('success_rate');
const requestCount = new Counter('requests');

export const options = {
    stages: [
        { duration: '1m', target: 5 },   // Ramp up
        { duration: '2m', target: 10 },  // Hold at moderate load
        { duration: '5m', target: 20 },  // Increase load
        { duration: '2m', target: 5 },   // Scale down
        { duration: '1m', target: 0 }    // Cool down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
        'error_rate': ['rate<0.1'],          // Error rate under 10%
        'success_rate': ['rate>0.9']         // Success rate over 90%
    },
    setupTimeout: '30s'
};

const API_BASE = 'http://api:3000';

const ENDPOINTS = [
    { path: '/health', weight: 1 },
    { path: '/complex_join', weight: 3 },
    { path: '/random_search', weight: 3 },
    { path: '/aggregation', weight: 2 }
];

function selectEndpoint() {
    const totalWeight = ENDPOINTS.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of ENDPOINTS) {
        if (random < endpoint.weight) return endpoint.path;
        random -= endpoint.weight;
    }
    return ENDPOINTS[0].path;
}

export function setup() {
    console.log('Setting up load test...');
    const maxRetries = 10;
    const retryDelay = 3;
    
    for (let i = 0; i < maxRetries; i++) {
        const res = http.get(`${API_BASE}/health`);
        if (res.status === 200) {
            console.log('API is ready');
            return;
        }
        console.log(`API not ready, attempt ${i + 1}/${maxRetries}`);
        sleep(retryDelay);
    }
    throw new Error('API failed to become ready');
}

export default function() {
    const endpoint = selectEndpoint();
    const url = `${API_BASE}${endpoint}`;
    const start = new Date();
    
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    
    const response = http.get(url, { headers });
    const duration = new Date() - start;
    
    // Record metrics
    dbLatency.add(duration);
    requestCount.add(1);
    errorRate.add(response.status !== 200);
    successRate.add(response.status === 200);
    
    // Verify response
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response has data': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body && body.rows && Array.isArray(body.rows);
            } catch {
                return false;
            }
        }
    });
    
    // Random sleep between requests (0.5s to 2s)
    sleep(Math.random() * 1.5 + 0.5);
}

export function teardown(data) {
    console.log('Load test completed');
    console.log('Final metrics:', {
        totalRequests: requestCount.value,
        errorRate: errorRate.value,
        successRate: successRate.value,
        avgLatency: dbLatency.avg,
        p95Latency: dbLatency.p(95)
    });
}
