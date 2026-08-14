import http from 'http';
import { check, stress } from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8090';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const syncDuration = new Trend('sync_duration');

const photosCreated = new Counter('photos_created');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.1'],
  },
};

export function setup() {
  console.log(`Starting stress test against ${BASE_URL}`);
  
  const response = http.get(`${BASE_URL}/api/health`);
  if (response.status !== 200) {
    throw new Error(`Backend health check failed: ${response.status}`);
  }
  
  return { token: 'test-token' };
}

export default function(data: { token: string }) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  const responses = http.batch([
    ['GET', `${BASE_URL}/api/health`, null, headers],
    ['GET', `${BASE_URL}/api/cloud/status`, null, headers],
    ['GET', `${BASE_URL}/api/orders`, null, headers],
  ]);

  for (const response of responses) {
    apiLatency.add(response.timings.duration);
    
    if (response.status >= 400) {
      errorRate.add(1);
      console.log(`API Error: ${response.status} ${response.url}`);
    } else {
      errorRate.add(0);
    }
  }
}

export function handleSummary(data: { metrics: Record<string, any> }) {
  return {
    'stdout': textSummary(data),
    'summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data: { metrics: Record<string, any> }): string {
  const metrics = data.metrics;
  
  let summary = '\n=== Stress Test Summary ===\n\n';
  
  if (metrics.http_req_duration) {
    summary += `API Response Time:\n`;
    summary += `  p95: ${metrics.http_req_duration.values['p(95)']?.toFixed(2)}ms\n`;
    summary += `  p99: ${metrics.http_req_duration.values['p(99)']?.toFixed(2)}ms\n`;
    summary += `  Avg: ${metrics.http_req_duration.values平均值?.toFixed(2)}ms\n`;
  }
  
  if (metrics.errors) {
    summary += `\nError Rate: ${(metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  }
  
  if (metrics.iterations) {
    summary += `\nTotal Iterations: ${metrics.iterations.values.iterations}\n`;
  }
  
  summary += '\n============================\n';
  
  return summary;
}
