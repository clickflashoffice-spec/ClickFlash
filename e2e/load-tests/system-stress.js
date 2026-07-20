import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

export const requests = new Counter('http_reqs');

export const options = {
  stages: [
    { duration: '10s', target: 50 }, // Ramp up to 50 users
    { duration: '20s', target: 50 }, // Stay at 50
    { duration: '5s', target: 0 },   // Ramp down
  ],
};

export default function () {
  const payload = JSON.stringify({
    shift_id: `shift-${__VU}-${__ITER}`,
    photographer: 'stress-test-user',
    face_vector: [0.1, 0.2, 0.3],
    timestamp: new Date().toISOString()
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('http://127.0.0.1:8090/api/shifts/proxy', payload, params);

  check(res, {
    'is status 200': (r) => r.status === 200,
    'queue processed': (r) => JSON.parse(r.body).status === 'queued' || JSON.parse(r.body).status === 'synced',
  });

  sleep(1);
}
