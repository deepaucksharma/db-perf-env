import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Configuration
const baseUrl = __ENV.API_URL || 'http://api:3000';
const newRelicConfig = {
    accountId: __ENV.NEW_RELIC_ACCOUNT_ID,
    apiKey: __ENV.NEW_RELIC_LICENSE_KEY,
    insightsEndpoint: `https://insights-collector.newrelic.com/v1/accounts/${__ENV.NEW_RELIC_ACCOUNT_ID}/events`
};

// Custom metrics
const dbLatency = new Trend('db_operation_latency');
const errorRate = new Rate('error_rate');
const queryCount = new Counter('queries_executed');
const throughputRate = new Rate('throughput_rate');
const slowQueryRate = new Rate('slow_query_rate');

// Test scenarios configuration
const scenarios = {
    io_heavy: [
        { url: '/complex_join', weight: 4, tag: 'complex_join' },
        { url: '/huge_group_by', weight: 3, tag: 'aggregation' },
        { url: '/low_selectivity', weight: 3, tag: 'table_scan' }
    ],
    lock_heavy: [
        { url: '/lock_contention', weight: 2, tag: 'locks' },
        { url: '/ddl_lock', weight: 1, tag: 'ddl' }
    ],
    memory_heavy: [
        { url: '/memory_pressure', weight: 3, tag: 'memory' },
        { url: '/huge_group_by', weight: 2, tag: 'aggregation' }
    ],
    search_scenario: [
        { url: '/random_search', weight: 1, tag: 'search' }
    ],
    mixed: [
        { url: '/health', weight: 1, tag: 'health' },
        { url: '/complex_join', weight: 2, tag: 'complex_join' },
        { url: '/random_search', weight: 2, tag: 'search' },
        { url: '/huge_group_by', weight: 2, tag: 'aggregation' },
        { url: '/low_selectivity', weight: 2, tag: 'table_scan' },
        { url: '/lock_contention', weight: 1, tag: 'locks' },
        { url: '/ddl_lock', weight: 1, tag: 'ddl' },
        { url: '/memory_pressure', weight: 2, tag: 'memory' }
    ]
};

// Helper function to pick endpoint based on weights
function pickEndpoint(scenario) {
    const endpoints = scenarios[scenario];
    const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
    let r = Math.random() * totalWeight;
    
    for (const endpoint of endpoints) {
        if (r < endpoint.weight) return endpoint;
        r -= endpoint.weight;
    }
    
    return endpoints[0];
}

// NewRelic event recording
function recordNewRelicEvent(eventType, attributes) {
    if (!newRelicConfig.apiKey) return; // Skip if no API key

    const payload = [{
        eventType,
        timestamp: Date.now(),
        ...attributes
    }];

    http.post(newRelicConfig.insightsEndpoint,
        JSON.stringify(payload),
        {
            headers: {
                'X-Insert-Key': newRelicConfig.apiKey,
                'Content-Type': 'application/json'
            }
        }
    );
}

// Common request execution function
function executeRequest(endpoint, scenario) {
    const startTime = Date.now();
    const url = `${baseUrl}${endpoint.url}`;
    
    const res = http.get(url, {
        tags: { endpoint: endpoint.url, scenario, type: endpoint.tag }
    });
    
    const duration = Date.now() - startTime;
    
    // Record metrics
    dbLatency.add(duration, { endpoint: endpoint.url });
    queryCount.add(1, { endpoint: endpoint.url });
    throughputRate.add(1);
    errorRate.add(res.status !== 200);
    slowQueryRate.add(duration > 1000); // Mark queries over 1s as slow
    
    // Record to New Relic
    recordNewRelicEvent('LoadTestQuery', {
        endpoint: endpoint.url,
        duration,
        status: res.status,
        scenario,
        type: endpoint.tag,
        success: res.status === 200
    });
    
    // Validate response
    check(res, {
        'status is 200': (r) => r.status === 200,
        'response is valid': (r) => r.status === 200 && r.body.length > 0
    });
    
    // Variable sleep to prevent thundering herd
    sleep(Math.random() * 0.5 + 0.1);
}

// Test scenarios
export const options = {
    scenarios: {
        io_heavy: {
            executor: 'constant-arrival-rate',
            rate: parseInt(__ENV.K6_VUS) || 10,
            timeUnit: '1s',
            duration: __ENV.K6_DURATION || '5m',
            preAllocatedVUs: 20,
            maxVUs: 50,
            exec: 'runIOHeavy',
            tags: { scenario: 'io_heavy' }
        },
        lock_heavy: {
            executor: 'constant-arrival-rate',
            rate: Math.floor((parseInt(__ENV.K6_VUS) || 10) / 2),
            timeUnit: '1s',
            duration: __ENV.K6_DURATION || '5m',
            preAllocatedVUs: 10,
            maxVUs: 25,
            exec: 'runLockHeavy',
            tags: { scenario: 'lock_heavy' },
            startTime: '1m'
        },
        memory_heavy: {
            executor: 'ramping-arrival-rate',
            startRate: 5,
            timeUnit: '1s',
            stages: [
                { duration: '2m', target: 10 },
                { duration: '5m', target: 20 },
                { duration: '2m', target: 5 }
            ],
            preAllocatedVUs: 10,
            maxVUs: 30,
            exec: 'runMemoryHeavy',
            tags: { scenario: 'memory_heavy' },
            startTime: '2m'
        },
        search_scenario: {
            executor: 'per-vu-iterations',
            vus: parseInt(__ENV.K6_VUS) || 10,
            iterations: 100,
            maxDuration: __ENV.K6_DURATION || '5m',
            exec: 'runSearchScenario',
            tags: { scenario: 'search' },
            startTime: '3m'
        },
        mixed: {
            executor: 'ramping-vus',
            startVUs: 5,
            stages: [
                { duration: '1m', target: 10 },
                { duration: '3m', target: 20 },
                { duration: '5m', target: 30 },
                { duration: '1m', target: 5 }
            ],
            exec: 'runMixed',
            tags: { scenario: 'mixed' },
            startTime: '4m'
        }
    },
    thresholds: {
        'db_operation_latency': ['p(95)<2000'], // 95% of queries under 2s
        'http_req_duration': ['p(95)<3000'],     // 95% of requests under 3s
        'error_rate': ['rate<0.05'],             // Less than 5% errors
        'slow_query_rate': ['rate<0.10']         // Less than 10% slow queries
    }
};

// Scenario implementations
export function runIOHeavy() {
    const endpoint = pickEndpoint('io_heavy');
    executeRequest(endpoint, 'io_heavy');
}

export function runLockHeavy() {
    const endpoint = pickEndpoint('lock_heavy');
    executeRequest(endpoint, 'lock_heavy');
}

export function runMemoryHeavy() {
    const endpoint = pickEndpoint('memory_heavy');
    executeRequest(endpoint, 'memory_heavy');
}

export function runSearchScenario() {
    const endpoint = pickEndpoint('search_scenario');
    executeRequest(endpoint, 'search');
}

export function runMixed() {
    const endpoint = pickEndpoint('mixed');
    executeRequest(endpoint, 'mixed');
}

// Setup and teardown hooks
export function setup() {
    recordNewRelicEvent('LoadTestStart', {
        testConfig: JSON.stringify(options),
        timestamp: Date.now()
    });
}

export function teardown(data) {
    recordNewRelicEvent('LoadTestEnd', {
        testDuration: Date.now() - data.startTime,
        totalQueries: queryCount.value,
        errorRate: errorRate.value,
        avgLatency: dbLatency.avg,
        p95Latency: dbLatency.p(95)
    });
}