import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Performance Monitoring - Memory Leak', () => {
  test('should not leak memory over successive navigations', async ({ page, browserName }) => {
    // Memory API is primarily available in Chromium
    test.skip(browserName !== 'chromium', 'Memory API only supported in Chromium');

    await login(page);
    await expect(page.getByText(/home/i, { exact: false }).first()).toBeVisible({ timeout: 10000 });

    const getHeapSize = async () => {
      // Force garbage collection if we ran with --js-flags="--expose-gc"
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      }).catch(() => {});

      return page.evaluate(() => {
        const perf = (window.performance as any).memory;
        return perf ? perf.usedJSHeapSize : null;
      });
    };

    // Warmup cycle
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /albums/i, exact: false }).first().click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /dashboard/i, exact: false }).first().click();
      await page.waitForTimeout(500);
    }

    const initialMemory = await getHeapSize();
    if (!initialMemory) {
      console.warn('Memory API not accessible.');
      return;
    }

    // Run navigation loop
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: /albums/i, exact: false }).first().click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /dashboard/i, exact: false }).first().click();
      await page.waitForTimeout(500);
    }

    const finalMemory = await getHeapSize();

    if (finalMemory && initialMemory) {
      const differenceMB = (finalMemory - initialMemory) / (1024 * 1024);
      console.log(`Memory Difference after 10 iterations: ${differenceMB.toFixed(2)} MB`);
      
      // We allow some acceptable growth but it shouldn't grow boundlessly.
      // Assert that the JS heap didn't increase by more than 50MB
      expect(differenceMB).toBeLessThan(50);
    }
  });
});
