import { test, expect } from '@playwright/test';

test.describe('Management Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Fulfill backend API calls with mock data to prevent network errors in test environment
    await page.route('**/api/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} })
    }));

    await page.goto('/manage/?mode=management', { waitUntil: 'networkidle' });
    const userInput = page.locator('[data-testid="username-input"]');
    await expect(userInput).toBeVisible({ timeout: 20000 });
    await userInput.fill('alaeddine@example.com');
    await page.fill('[data-testid="password-input"]', 'DEFAULT_PASSWORD_PLACEHOLDER');
    await page.click('[data-testid="login-button"]');
    // Use robust check for heading indicating dashboard loaded
    await expect(page.locator('h1').filter({ hasText: /Dashboard|Unified/i })).toBeVisible({ timeout: 15000 });
  });

  test('should display dashboard metrics', async ({ page }) => {
    await expect(page.getByText(/Revenue/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Orders/i).first()).toBeVisible();
    await expect(page.getByText(/Photos/i).first()).toBeVisible();
  });

  test('should toggle time ranges', async ({ page }) => {
    await page.getByRole('button', { name: /today/i }).click();
    await page.getByRole('button', { name: /30d/i }).click();
  });

  test('should toggle context', async ({ page }) => {
    const switcher = page.getByText(/Operating Context/i);
    await expect(switcher).toBeVisible();
    await switcher.click();
    const locationOption = page.getByText(/Marhaba Club/i).first();
    await locationOption.click();
    await expect(page.locator('h1').filter({ hasText: /Marhaba Club/i })).toBeVisible();
  });

  test('should navigate to fleet monitor', async ({ page }) => {
    const navBtn = page.getByRole('button', { name: 'Operations tab' });
    if (await navBtn.isVisible()) {
      await navBtn.click();
    } else {
      await page.getByRole('button', { name: /Operations/i }).first().click();
    }
    await page.getByRole('button', { name: /Stations Overview/i }).first().click();
    await expect(page.locator('h1').filter({ hasText: /Fleet Monitor/i })).toBeVisible();
  });
});
