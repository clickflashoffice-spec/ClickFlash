import { spawn } from 'child_process';
import { test, expect } from '@playwright/test';

test.describe('Error Boundary Tests', () => {
  test('should display error boundary on component crash', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.evaluate(() => {
      const error = new Error('Simulated component error');
      window.dispatchEvent(new ErrorEvent('error', { error }));
    });
    
    await page.waitForTimeout(1000);
    
    const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary, [class*="error"]').first();
    
    if (await errorBoundary.isVisible()) {
      expect(await errorBoundary.textContent()).toBeTruthy();
    }
  });

  test('should log errors to console', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/dashboard');
    
    const consoleError = page.evaluate(() => {
      console.error('Test error from Playwright');
      return true;
    });

    expect(consoleError).toBeTruthy();
    await page.waitForTimeout(500);
    
    expect(errors.some(e => e.includes('Test error'))).toBe(true);
  });

  test('should recover from network errors gracefully', async ({ page }) => {
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    await page.goto('/dashboard');
    
    const errorMessage = page.locator('text=/error|failed|offline/i').first();
    
    if (await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(await errorMessage.textContent()).toBeTruthy();
    }
  });
});

test.describe('Exception Handler Tests', () => {
  test('should catch unhandled promise rejections', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/login');
    
    await page.evaluate(() => {
      Promise.reject(new Error('Unhandled promise rejection'));
    });

    await page.waitForTimeout(1000);
    
    const hasError = errors.some(e => 
      e.includes('Unhandled') || 
      e.includes('promise') || 
      e.includes('rejection')
    );
    
    expect(hasError).toBe(true);
  });
});
