import http from 'http';
import { check } from 'k6/http';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8090';

const healthLatency = new Trend('health_check');
const ordersLatency = new Trend('orders_list');
const photosLatency = new Trend('photos_list');

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
  },
};

export default function() {
  const start = Date.now();
  
  const healthRes = http.get(`${BASE_URL}/api/health`);
  healthLatency.add(Date.now() - start);
  
  if (check(healthRes, {
    'health endpoint works': (r) => r.status === 200,
    'health returns status': (r) => JSON.parse(r.body).status === 'healthy',
  })) {
    console.log('Health check passed');
  }

  const ordersStart = Date.now();
  const ordersRes = http.get(`${BASE_URL}/api/orders`);
  ordersLatency.add(Date.now() - ordersStart);
  
  check(ordersRes, {
    'orders endpoint works': (r) => r.status === 200,
    'orders returns array': (r) => Array.isArray(JSON.parse(r.body).orders),
  });

  const photosStart = Date.now();
  const photosRes = http.get(`${BASE_URL}/api/collections/photos/records?page=1&perPage=20`);
  photosLatency.add(Date.now() - photosStart);
  
  check(photosRes, {
    'photos endpoint works': (r) => r.status === 200,
    'photos returns items': (r) => 'items' in JSON.parse(r.body),
  });
}

export function handleSummary(data: any) {
  return {
    'load-test-report.json': JSON.stringify(data, null, 2),
  };
}
