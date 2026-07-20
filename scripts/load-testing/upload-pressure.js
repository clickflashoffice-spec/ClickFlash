import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    upload_pressure: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '5m',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.01'], // less than 1% errors
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8787';

export default function () {
  // Simulate uploading a ~5MB chunk of a 50MB file to the R2 proxy
  // We'll generate a dummy payload to represent the binary chunk
  const payload = new Uint8Array(5 * 1024 * 1024); // 5MB payload
  for (let i = 0; i < payload.length; i++) {
    payload[i] = Math.floor(Math.random() * 256);
  }

  const res = http.post(`${BASE_URL}/api/cloud/sync/photos`, payload.buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': `Bearer ${__ENV.TEST_AUTH_TOKEN || 'test-token'}`,
      'X-Station-ID': `station_${__VU}`,
    },
  });

  check(res, {
    'is status 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);
}
