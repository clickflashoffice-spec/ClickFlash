import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const syncDuration = new Trend('sync_duration');
const apiResponseTime = new Trend('api_response_time');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8090';

export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 25 },
    { duration: '10m', target: 50 },
    { duration: '5m', target: 25 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.1'],
    sync_duration: ['p(95)<2000'],
  },
};

const testData = {
  albumId: 'test-album-' + Date.now(),
  kioskIds: Array.from({ length: 10 }, (_, i) => `kiosk-${i}-${Date.now()}`),
};

export function setup() {
  const authRes = http.post(`${BASE_URL}/api/auth/login`, {
    email: 'admin@localhost',
    password: 'admin123',
  });

  const token = authRes.json('token');
  
  return { token };
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/system/health`);
    check(res, {
      'health check status 200': (r) => r.status === 200,
      'health check returns healthy': (r) => r.json('status') === 'healthy',
    });
    errorRate.add(res.status !== 200);
  });

  group('Sync Operations', () => {
    const syncStart = Date.now();
    
    const syncRes = http.post(
      `${BASE_URL}/api/sync`,
      JSON.stringify({
        kioskId: testData.kioskIds[Math.floor(Math.random() * testData.kioskIds.length)],
        lastSyncTimestamp: new Date(Date.now() - 3600000).toISOString(),
        photos: Array.from({ length: 10 }, (_, i) => ({
          id: `photo-${i}-${Date.now()}`,
          status: 'pending',
        })),
      }),
      { headers }
    );

    syncDuration.add(Date.now() - syncStart);
    
    check(syncRes, {
      'sync status 200': (r) => r.status === 200,
      'sync returns success': (r) => r.json('success') === true,
    });
    errorRate.add(syncRes.status !== 200);
  });

  group('Photo Operations', () => {
    const apiStart = Date.now();
    
    const photosRes = http.get(`${BASE_URL}/api/collections/photos?limit=50`, { headers });
    
    apiResponseTime.add(Date.now() - apiStart);
    
    check(photosRes, {
      'photos status 200': (r) => r.status === 200,
      'photos returns array': (r) => Array.isArray(r.json()),
    });
    errorRate.add(photosRes.status !== 200);
  });

  group('Album Operations', () => {
    const albumRes = http.get(`${BASE_URL}/api/collections/albums?limit=20`, { headers });
    
    check(albumRes, {
      'albums status 200': (r) => r.status === 200,
      'albums returns array': (r) => Array.isArray(r.json()),
    });
    errorRate.add(albumRes.status !== 200);
  });

  group('Order Operations', () => {
    const ordersRes = http.get(`${BASE_URL}/api/orders?limit=20`, { headers });
    
    check(ordersRes, {
      'orders status 200': (r) => r.status === 200,
      'orders returns array': (r) => Array.isArray(r.json()),
    });
    errorRate.add(ordersRes.status !== 200);
  });

  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'test-results/k6-stress-summary.json': JSON.stringify({
      metrics: {
        http_req_duration_p95: data.metrics.http_req_duration.values['p(95)'],
        http_req_duration_p99: data.metrics.http_req_duration.values['p(99)'],
        http_req_failed_rate: data.metrics.http_req_failed.values.rate,
        errors_rate: data.metrics.errors.values.rate,
        sync_duration_p95: data.metrics.sync_duration.values['p(95)'],
      },
      scenarios: data.scenarios,
    }),
  };
}

function textSummary(data, options) {
  const { metrics } = data;
  
  let summary = '\n';
  summary += '='.repeat(60) + '\n';
  summary += '  k6 Stress Test Results\n';
  summary += '='.repeat(60) + '\n\n';
  
  summary += `Requests:\n`;
  summary += `  Total:     ${metrics.http_reqs.values.count}\n`;
  summary += `  Failed:    ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;
  
  summary += `Response Times:\n`;
  summary += `  Mean:      ${metrics.http_req_duration.values.mean.toFixed(2)}ms\n`;
  summary += `  P95:       ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  P99:       ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += `Sync Duration:\n`;
  summary += `  P95:       ${metrics.sync_duration.values['p(95)'].toFixed(2)}ms\n\n`;
  
  summary += `Custom Metrics:\n`;
  summary += `  Error Rate: ${(metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  summary += '\n' + '='.repeat(60) + '\n';
  
  return summary;
}
