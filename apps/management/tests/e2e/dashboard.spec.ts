import { test, expect } from '@playwright/test';

test.describe('Management Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should display dashboard metrics', async ({ page }) => {
    await expect(page.locator('[data-testid="total-albums-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-photos-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-revenue-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-users-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-albums-value"]')).toHaveText(/\d+/);
  });

  test('should show recent activity', async ({ page }) => {
    await expect(page.locator('[data-testid="recent-activity-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-item"]')).toHaveCount.greaterThan(0);
  });

  test('should display charts', async ({ page }) => {
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="albums-chart"]')).toBeVisible();
  });

  test('should filter dashboard by date range', async ({ page }) => {
    await page.click('[data-testid="date-range-picker"]');
    await page.click('[data-testid="last-30-days"]');
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
  });

  test('should navigate to reports', async ({ page }) => {
    await page.click('[data-testid="nav-reports"]');
    await expect(page).toHaveURL('/reports');
    await expect(page.locator('[data-testid="sales-report"]')).toBeVisible();
    await expect(page.locator('[data-testid="usage-report"]')).toBeVisible();
  });

  test('should export dashboard data', async ({ page }) => {
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-pdf"]');
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
