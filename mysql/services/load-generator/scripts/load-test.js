import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    scenarios: {
        // Heavy analytical queries
        analytical_load: {
            executor: 'constant-vus',
            vus: 10,
            duration: '30m',
            exec: 'runAnalyticalQueries'
        },
        
        // Lock contention generator
        lock_contention: {
            executor: 'ramping-arrival-rate',
            startRate: 5,
            timeUnit: '1s',
            preAllocatedVUs: 20,
            stages: [
                { duration: '5m', target: 10 },
                { duration: '10m', target: 20 },
                { duration: '5m', target: 5 }
            ],
            exec: 'generateLockContention'
        },
        
        // Memory pressure generator
        memory_pressure: {
            executor: 'per-vu-iterations',
            vus: 15,
            iterations: 100,
            maxDuration: '30m',
            exec: 'generateMemoryPressure'
        },
        
        // Mixed workload
        mixed_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '5m', target: 20 },
                { duration: '10m', target: 40 },
                { duration: '5m', target: 10 }
            ],
            exec: 'runMixedWorkload'
        }
    },
    thresholds: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<5000']
    }
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

function makeRequest(url, name) {
    const response = http.get(`${BASE_URL}${url}`);
    check(response, {
        [`${name} status was 200`]: (r) => r.status === 200,
        [`${name} duration < 5s`]: (r) => r.timings.duration < 5000
    });
    return response;
}

// Heavy analytical queries
export function runAnalyticalQueries() {
    makeRequest('/employee-analysis?detailed=true', 'Employee Analysis');
    sleep(Math.random() * 2 + 1);
    
    makeRequest('/salary-distribution?detailed=true', 'Salary Distribution');
    sleep(Math.random() * 3 + 2);
}

// Lock contention generator
export function generateLockContention() {
    const requests = [];
    for (let i = 0; i < 3; i++) {
        requests.push(['GET', `${BASE_URL}/update-salaries`]);
    }
    
    const responses = http.batch(requests);
    responses.forEach((response, index) => {
        check(response, {
            [`Lock contention ${index + 1} status was 200`]: (r) => r.status === 200
        });
    });
    
    sleep(Math.random() * 1 + 0.5);
}

// Memory pressure generator
export function generateMemoryPressure() {
    const requests = [];
    for (let i = 0; i < 5; i++) {
        requests.push(['GET', `${BASE_URL}/salary-distribution?detailed=true`]);
    }
    
    const responses = http.batch(requests);
    responses.forEach((response, index) => {
        check(response, {
            [`Memory pressure ${index + 1} status was 200`]: (r) => r.status === 200
        });
    });
    
    sleep(Math.random() * 2 + 1);
}

// Mixed workload
export function runMixedWorkload() {
    const endpoints = [
        { url: '/employee-analysis', weight: 2 },
        { url: '/salary-distribution', weight: 3 },
        { url: '/update-salaries', weight: 1 }
    ];
    
    let totalWeight = endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of endpoints) {
        if (random < endpoint.weight) {
            makeRequest(endpoint.url, 'Mixed Workload');
            break;
        }
        random -= endpoint.weight;
    }
    
    sleep(Math.random() * 1 + 0.5);
}

e