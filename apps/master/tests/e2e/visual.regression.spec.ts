import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('Login page visual snapshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('Login page with error state', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.locator('[role="alert"], .text-red-400, [data-testid="error-message"]'))
      .toBeVisible();
    
    await expect(page).toHaveScreenshot('login-page-error.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('Dashboard page visual snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard-page.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('Albums page visual snapshot', async ({ page }) => {
    await page.goto('/albums');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('albums-page.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('Orders page visual snapshot', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('orders-page.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('Settings page visual snapshot', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('settings-page.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('Dark mode dashboard visual snapshot', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('Dark mode albums visual snapshot', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/albums');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('albums-dark-mode.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('Modal dialog visual snapshot', async ({ page }) => {
    await page.goto('/albums');
    await page.waitForLoadState('networkidle');
    
    const createButton = page.getByTestId('create-album').or(page.getByRole('button', { name: /create|add/i })).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('modal-create-album.png', {
        maxDiffPixelRatio: 0.001,
      });
    }
  });

  test('Toast notification visual snapshot', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    const backupButton = page.getByTestId('backup-now').or(page.getByRole('button', { name: /backup/i })).first();
    if (await backupButton.isVisible()) {
      await backupButton.click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('[class*="toast"], [data-testid="success-toast"]'))
        .toBeVisible();
      
      await expect(page).toHaveScreenshot('toast-notification.png', {
        maxDiffPixelRatio: 0.001,
      });
    }
  });

  test('Responsive layout - mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('Responsive layout - tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      maxDiffPixelRatio: 0.001,
    });
  });
});

test.describe('Visual Regression - Critical Components', () => {
  test('Button states visual comparison', async ({ page }) => {
    await page.goto('/login');
    
    const button = page.getByRole('button', { name: /sign in/i });
    await expect(button).toBeVisible();
    
    await expect(button).toHaveScreenshot('button-default.png');
    
    await button.hover();
    await expect(button).toHaveScreenshot('button-hover.png');
    
    await button.focus();
    await expect(button).toHaveScreenshot('button-focus.png');
    
    await button.click();
    await expect(button).toHaveScreenshot('button-active.png');
  });

  test('Form input states visual comparison', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.getByLabel(/email/i);
    
    await expect(emailInput).toHaveScreenshot('input-default.png');
    
    await emailInput.focus();
    await expect(emailInput).toHaveScreenshot('input-focus.png');
    
    await emailInput.fill('test@test.com');
    await expect(emailInput).toHaveScreenshot('input-filled.png');
    
    await emailInput.fill('');
    await emailInput.blur();
    await page.waitForTimeout(100);
    
    await page.evaluate((el) => el.classList.add('error'), await emailInput.elementHandle());
    await expect(emailInput).toHaveScreenshot('input-error.png');
  });
});
