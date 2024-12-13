import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const queryLatency = new Trend('query_latency');

// NewRelic custom events
const newrelicEvents = {
  apiEndpoint: 'https://insights-collector.newrelic.com/v1/accounts/${ACCOUNT_ID}/events',
  licenseKey: __ENV.NEW_RELIC_LICENSE_KEY,
  
  recordEvent(eventType, attributes) {
    const payload = {
      eventType,
      timestamp: Date.now(),
      ...attributes
    };
    
    http.post(
      this.apiEndpoint,
      JSON.stringify([payload]),
      {
        headers: {
          'X-Insert-Key': this.licenseKey,
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
