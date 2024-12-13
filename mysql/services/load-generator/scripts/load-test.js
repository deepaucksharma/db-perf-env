import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const successRate = new Rate('success_rate');
const queryLatency = new Trend('query_latency');
const requestsPerSecond = new Rate('requests_per_second');

// Test configuration
export const options = {
    stages: [
        { duration: '2m', target: 50 },  // Ramp up
        { duration: '25m', target: 50 }, // Stay at peak load
        { duration: '3m', target: 0 }    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
        'error_rate': ['rate<0.1'],        // Error rate under 10%
        'success_rate': ['rate>0.9'],      // Success rate over 90%
        'requests_per_second': ['rate>30']  // At least 30 RPS
    }
};

const API_BASE = __ENV.API_URL || 'http://api:3000';

// Endpoint definitions with weights
const ENDPOINTS = [
    { path: '/random_search', weight: 3 },
    { path: '/aggregation', weight: 2 },
    { path: '/complex_join', weight: 3 },
    { path: '/health', weight: 1 }
];

// Endpoint selection based on weights
function selectEndpoint() {
    const totalWeight = ENDPOINTS.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of ENDPOINTS) {
        if (random < endpoint.weight) return endpoint.path;
        random -= endpoint.weight;
    }
    return ENDPOINTS[0].path;
}

// VU script
export default function() {
    const endpoint = selectEndpoint();
    const url = `${API_BASE}${endpoint}`;
    const start = new Date();
    
    const response = http.get(url);
    const duration = new Date() - start;
    
    // Record metrics
    queryLatency.add(duration);
    errorRate.add(response.status !== 200);
    successRate.add(response.status === 200);
    requestsPerSecond.add(1);
    
    // Detailed logging for sample requests
    if (Math.random() < 0.01) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            endpoint,
            status: response.status,
            duration,
            body: response.body.slice(0, 100) + '...'
        }));
    }
    
    // Response validation
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
    
    // Random sleep between requests (0.5-1.5s)
    sleep(Math.random() + 0.5);
}

// Test lifecycle hooks
export function setup() {
    console.log('Load test starting...');
    // Verify API health before starting
    const healthCheck = http.get(`${API_BASE}/health`);
    check(healthCheck, {
        'API is healthy': (r) => r.status === 200
    });
}

export function teardown(data) {
    console.log('Load test completed');
    console.log('Final metrics:', {
        errorRate: errorRate.value,
        successRate: successRate.value,
        avgLatency: queryLatency.avg,
        p95Latency: queryLatency.p(95)
    });
}