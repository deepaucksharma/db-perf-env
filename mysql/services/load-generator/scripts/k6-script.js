import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.API_URL || 'http://localhost:3000';

// Probability weights for random endpoints in mixed scenario
const endpoints = {
    slowQuery:      { url: '/slow_query', weight: 3 },
    slowScan:       { url: '/slow_query_force_table_scan', weight: 3 },
    lockContention: { url: '/lock_contention', weight: 2 },
    createLock:     { url: '/lock_contention_create_lock_contention', weight: 2 },
    blocking:       { url: '/blocking_sessions', weight: 2 },
    memoryPressure: { url: '/memory_pressure', weight: 2 },
    memoryGen:      { url: '/memory_pressure_generate_memory_pressure', weight: 2 },
    // Optional: DDL Lock endpoint (implement in your server)
    // ddlLock:        { url: '/ddl_lock', weight: 1 }
};

export const options = {
    scenarios: {
        // Scenario 1: Heavy IO Bound - Large result sets, slow queries
        io_heavy: {
            executor: 'constant-vus',
            vus: 20,
            duration: '30m',
            exec: 'runIOHeavy'
        },
        // Scenario 2: Lock Heavy - Induce row-level and metadata lock contention
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
        // Scenario 3: Memory Heavy - Force temp tables, large sorts, and memory allocation
        memory_heavy: {
            executor: 'per-vu-iterations',
            vus: 10,
            iterations: 200,
            maxDuration: '30m',
            exec: 'runMemoryHeavy'
        },
        // Scenario 4: (Optional) DDL Lock Heavy - Cause metadata locks 
        // Uncomment only if /ddl_lock endpoint is implemented
        /*
        ddl_lock_heavy: {
            executor: 'ramping-arrival-rate',
            startRate: 2,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            stages: [
                { duration: '2m', target: 5 },
                { duration: '5m', target: 10 },
                { duration: '2m', target: 5 }
            ],
            exec: 'runDDLHeavy'
        },
        */
        // Scenario 5: Mixed Workload - Random operations to ensure variety
        mixed: {
            executor: 'constant-arrival-rate',
            rate: 10,
            timeUnit: '1s',
            duration: '30m',
            preAllocatedVUs: 30,
            exec: 'runMixed'
        }
    }
};

// Helper function to hit endpoints and verify response
function hitEndpoint(url, params = {}) {
    const res = http.get(`${baseUrl}${url}`, { params });
    check(res, { 'status 200': (r) => r.status === 200 });
    return res;
}

// Generate IO-heavy load: frequent slow queries and table scans
export function runIOHeavy() {
    // Parallel requests for maximum IO pressure
    const prefixChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const requests = [
        { method: 'GET', url: `${baseUrl}/slow_query` },
        { method: 'GET', url: `${baseUrl}/slow_query_force_table_scan`, params: { prefix: prefixChar } }
    ];
    const responses = http.batch(requests);
    responses.forEach(res => {
        check(res, { 'status 200': (r) => r.status === 200 });
    });

    // Sleep a bit to allow MySQL to accumulate waits
    sleep(Math.random() * 0.5 + 0.2);
}

// Generate lock-heavy load: concurrent transactions causing lock waits
export function runLockHeavy() {
    // Mix lock endpoints to produce different types of locks
    hitEndpoint('/lock_contention');
    hitEndpoint('/lock_contention_create_lock_contention');
    hitEndpoint('/blocking_sessions');
    // Short pause to maintain pressure
    sleep(0.1);
}

// Generate memory-heavy load: large temp tables, big sorts
export function runMemoryHeavy() {
    // Run parallel memory-intensive operations
    const requests = [
        { method: 'GET', url: `${baseUrl}/memory_pressure` },
        { method: 'GET', url: `${baseUrl}/memory_pressure_generate_memory_pressure` }
    ];
    const responses = http.batch(requests);
    responses.forEach(res => {
        check(res, { 'status 200': (r) => r.status === 200 });
    });

    // Allow accumulation of memory usage
    sleep(Math.random() * 2 + 1);
}

// (Optional) Generate DDL lock waits: metadata lock caused by DDL operations
// Ensure /ddl_lock endpoint exists on the server side. It might perform an ALTER TABLE or similar DDL.
export function runDDLHeavy() {
    hitEndpoint('/ddl_lock');
    sleep(Math.random() * 0.5 + 0.5);
}

// Mixed workload: randomly choose from all available endpoints
export function runMixed() {
    const allEndpoints = Object.values(endpoints);
    // Calculate total weight
    const totalWeight = allEndpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosen = allEndpoints[0];

    for (const ep of allEndpoints) {
        if (rand < ep.weight) {
            chosen = ep;
            break;
        }
        rand -= ep.weight;
    }

    // Introduce random parameter to avoid caching
    const randomPrefix = String.fromCharCode(65 + Math.floor(Math.random() * 26));

    // Hit the chosen endpoint
    const res = http.get(`${baseUrl}${chosen.url}`, { params: { prefix: randomPrefix } });
    check(res, { 'status 200': (r) => r.status === 200 });

    // Variable sleep to simulate mixed user behavior
    sleep(Math.random() * 0.7 + 0.1);
}

// Default function: also runs mixed load if executed outside scenarios
export default function() {
    runMixed();
}
