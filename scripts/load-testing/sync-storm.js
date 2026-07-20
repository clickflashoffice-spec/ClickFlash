import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    sync_storm: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 }, // Ramp up to 50 concurrent stations quickly
        { duration: '1m', target: 50 }, // Hold for 1 minute
        { duration: '30s', target: 0 },  // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate==0'], // Zero 5xx or 4xx errors expected
    http_req_duration: ['p(95)<1500'], // 95% under 1.5s
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8787';

export default function () {
  // Simulate an internet outage recovery where stations sync simultaneously
  const payload = JSON.stringify({
    sessions: [
      { id: `sess_${__ITER}_${__VU}`, status: 'completed', photoCount: 15 },
    ],
    payments: [
      { id: `pay_${__ITER}_${__VU}`, amount: 4500, status: 'captured' }
    ]
  });

  const stationId = `station_${__VU}`;

  const res = http.post(`${BASE_URL}/api/cloud/fleet/stations/${stationId}/sync`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TEST_AUTH_TOKEN || 'test-token'}`,
    },
  });

  check(res, {
    'is status 200': (r) => r.status === 200,
    'has sync checksum': (r) => JSON.parse(r.body).checksum !== undefined,
  });

  sleep(2);
}
