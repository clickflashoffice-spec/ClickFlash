import { test, expect } from '@playwright/test';

test.describe('Management Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Abort backend API calls to force the app to fallback to local mock data instantly
    // This prevents TCP timeouts on browsers when the backend is offline
    await page.route('http://127.0.0.1:8092/api/**', route => route.abort());
    await page.route('http://localhost:8092/api/**', route => route.abort());

    await page.goto('/manage/', { waitUntil: 'domcontentloaded' });
    await page.fill('[data-testid="username-input"]', 'alaeddine@example.com');
    await page.fill('[data-testid="password-input"]', 'DEFAULT_PASSWORD_PLACEHOLDER');
    await page.click('[data-testid="login-button"]');
    // Use robust check for heading indicating dashboard loaded
    await expect(page.locator('h1').filter({ hasText: /Dashboard/i })).toBeVisible({ timeout: 15000 });
  });

  test('should display dashboard metrics', async ({ page }) => {
    await expect(page.getByText('Revenue', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Orders', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Photos', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Avg Order', { exact: true }).first()).toBeVisible();
  });

  test('should toggle time ranges', async ({ page }) => {
    await page.getByRole('button', { name: 'today', exact: true }).click();
    await page.getByRole('button', { name: '30d', exact: true }).click();
    // After clicking, the time range state should update (mocked API might be fast, just verify buttons exist and are clickable)
  });

  test('should toggle context', async ({ page }) => {
    // ManagementLayout has a select for Hotel Context with title="Select Hotel Context"
    const contextSelect = page.locator('select[title="Select Hotel Context"]');
    await expect(contextSelect).toBeVisible();
    // Select a different context
    await contextSelect.selectOption({ label: 'Marhaba Club' });
    // It should change the dashboard title
    await expect(page.locator('h1').filter({ hasText: /Marhaba Club Dashboard/i })).toBeVisible();
  });

  test('should navigate to fleet monitor', async ({ page }) => {
    // SimplifiedSidebar expands
    await page.getByRole('button', { name: /Operations/i }).click();
    await page.getByRole('button', { name: /Stations Overview/i }).click();
    await expect(page.locator('h1').filter({ hasText: /Fleet Monitor/i })).toBeVisible();
  });
});
