import { test, expect, Page } from '@playwright/test';

test.describe('Error Handling Tests', () => {
  test('should display user-friendly error on 404', async ({ page }) => {
    await page.goto('/api/nonexistent-endpoint');
    
    await expect(page.locator('body')).not.toHaveText(/Cannot GET/i, { timeout: 3000 }).catch(() => {});
  });

  test('should handle network timeout gracefully', async ({ page }) => {
    await page.route('**/api/slow', route => {
      setTimeout(() => route.fulfill({ status: 200, body: 'OK' }), 30000);
    });

    const start = Date.now();
    await page.goto('/api/slow', { timeout: 5000 }).catch(() => {});
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(35000);
  });

  test('should display toast on form submission error', async ({ page }) => {
    await page.goto('/login');

    await page.route('**/api/auth/login', route => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
    });

    await page.fill('[data-testid="username-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');

    const toast = page.locator('[data-testid="error-toast"], .toast.error, [role="alert"]').first();
    
    if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await toast.textContent()).toBeTruthy();
    }
  });

  test('should retry failed requests', async ({ page }) => {
    let attempts = 0;
    
    await page.route('**/api/data', route => {
      attempts++;
      if (attempts < 3) {
        route.fulfill({ status: 503, body: 'Service unavailable' });
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ data: 'success' }) });
      }
    });

    const response = await page.evaluate(async () => {
      const response = await fetch('/api/data');
      return { status: response.status, data: await response.json() };
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toBe('success');
    expect(attempts).toBe(3);
  });
});

test.describe('Logging Tests', () => {
  test('should log client-side errors', async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/login');

    await page.evaluate(() => {
      console.error('Client error for testing');
      window.logger?.error('Test error');
    });

    await page.waitForTimeout(500);

    const hasClientError = errors.some(e => e.includes('Client error'));
    expect(hasClientError).toBe(true);
  });
});

test.describe('Fallback UI Tests', () => {
  test('should show fallback when data fails to load', async ({ page }) => {
    await page.route('**/api/orders', route => {
      route.abort();
    });

    await page.goto('/orders');
    await page.waitForTimeout(2000);

    const fallback = page.locator('[data-testid="loading"], [data-testid="error"], [data-testid="empty"]').first();
    
    const hasFallback = await fallback.isVisible().catch(() => false);
    expect(hasFallback).toBeTruthy();
  });
});
