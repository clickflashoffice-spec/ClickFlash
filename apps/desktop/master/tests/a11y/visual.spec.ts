import { test, expect, Page } from '@playwright/test';

const UPDATE_SNAPSHOTS = process.env.UPDATE_VISUAL === 'true';

test.describe('Visual Regression Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('login page visual snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const loginForm = page.locator('main, [role="main"], form').first();
    
    await expect(loginForm).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('dashboard page visual snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dashboard = page.locator('main, [role="main"]').first();
    
    await expect(dashboard).toHaveScreenshot('dashboard-page.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('albums page visual snapshot', async ({ page }) => {
    await page.goto('/albums');
    await page.waitForLoadState('networkidle');

    const albumsGrid = page.locator('[class*="grid"], [class*="album"]').first();
    
    await expect(albumsGrid).toHaveScreenshot('albums-page.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('orders page visual snapshot', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    const ordersTable = page.locator('table, [role="table"]').first();
    
    await expect(ordersTable).toHaveScreenshot('orders-page.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('settings page visual snapshot', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const settings = page.locator('main, [role="main"]').first();
    
    await expect(settings).toHaveScreenshot('settings-page.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });
});

test.describe('Component Visual States', () => {
  test('button states', async ({ page }) => {
    await page.goto('/login');

    const button = page.locator('button[type="submit"], [data-testid="login-button"]').first();

    await expect(button).toHaveScreenshot('button-default.png', {
      maxDiffPixelRatio: 0.05,
    });

    await button.hover();
    await expect(button).toHaveScreenshot('button-hover.png', {
      maxDiffPixelRatio: 0.05,
    });

    await button.click();
    await expect(button).toHaveScreenshot('button-active.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('input states', async ({ page }) => {
    await page.goto('/login');

    const input = page.locator('input[type="text"], input[type="email"]').first();

    await expect(input).toHaveScreenshot('input-empty.png', {
      maxDiffPixelRatio: 0.05,
    });

    await input.fill('test@example.com');
    await expect(input).toHaveScreenshot('input-filled.png', {
      maxDiffPixelRatio: 0.05,
    });

    await input.focus();
    await expect(input).toHaveScreenshot('input-focused.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('error state styling', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="username-input"]', 'invalid');
    await page.fill('[data-testid="password-input"]', 'wrong');
    await page.click('[data-testid="login-button"]');

    const errorMessage = page.locator('[data-testid="error-message"]').first();
    
    if (await errorMessage.isVisible({ timeout: 3000 })) {
      await expect(errorMessage).toHaveScreenshot('error-message.png', {
        maxDiffPixelRatio: 0.1,
      });
    }
  });

  test('loading state styling', async ({ page }) => {
    await page.goto('/login');

    const spinner = page.locator('[class*="spinner"], [class*="loader"], [role="progressbar"]').first();
    
    if (await spinner.isVisible({ timeout: 2000 })) {
      await expect(spinner).toHaveScreenshot('loading-spinner.png', {
        maxDiffPixelRatio: 0.1,
      });
    }
  });
});

test.describe('Responsive Visual Tests', () => {
  const viewports = [
    { width: 1920, height: 1080, name: 'desktop-1080p' },
    { width: 1366, height: 768, name: 'laptop' },
    { width: 768, height: 1024, name: 'tablet-portrait' },
    { width: 375, height: 667, name: 'mobile' },
  ];

  for (const viewport of viewports) {
    test(`${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`login-${viewport.name}.png`, {
        maxDiffPixelRatio: 0.15,
        animations: 'disabled',
      });
    });
  }
});
