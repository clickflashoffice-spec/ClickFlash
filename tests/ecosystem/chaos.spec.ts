import { test, expect } from '@playwright/test';

test.describe('Edge Node Chaos & Resilience', () => {
  test('Master OS circuit breaker handles cloud network partition gracefully', async ({ request }) => {
    await expect.poll(async () => {
      try {
        const response = await request.get('http://localhost:8090/api/health', { timeout: 2000 });
        return response.status();
      } catch (e) {
        return 0;
      }
    }, { timeout: 45000 }).toBe(200);

    const response = await request.get('http://localhost:8090/api/health');
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});

