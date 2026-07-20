import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    webhook_concurrency: {
      executor: 'shared-iterations',
      vus: 50, // 50 concurrent webhooks
      iterations: 50,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate==0'], // Zero 5xx errors
    http_req_duration: ['p(95)<5000'], // Webhooks might trigger emails, so giving a slightly larger buffer
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8787';

export default function () {
  // Simulate a Stripe webhook event
  const payload = JSON.stringify({
    id: `evt_test_${__ITER}_${__VU}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${__ITER}_${__VU}`,
        amount_total: 4500,
        customer_email: `customer${__ITER}@example.com`,
        payment_status: 'paid',
        metadata: {
          sessionId: `sess_${__ITER}_${__VU}`
        }
      }
    }
  });

  const res = http.post(`${BASE_URL}/api/webhooks/stripe`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': 't=12345,v1=test_signature', // In a real test, this would need to be a valid generated signature or bypass auth for testing
    },
  });

  check(res, {
    'is status 200': (r) => r.status === 200,
  });

  sleep(1);
}
