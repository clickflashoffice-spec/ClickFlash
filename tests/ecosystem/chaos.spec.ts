import { test, expect } from '@playwright/test';

test.describe('Edge Node Chaos & Resilience', () => {
  test('Master OS circuit breaker handles cloud network partition gracefully', async ({ page }) => {
    await page.goto('http://127.0.0.1:8090/');
    await expect(page.getByTestId('status-indicator')).toContainText('ONLINE', { timeout: 20000 });
    
    await page.route('**/api/sync/**', route => {
      route.abort('internetdisconnected');
    });

    await expect(page.getByTestId('status-indicator')).toContainText('LOCAL_AUTONOMOUS', { timeout: 20000 });

    await page.unroute('**/api/sync/**');

    await expect(page.getByTestId('status-indicator')).toContainText('ONLINE', { timeout: 20000 });
  });
});

