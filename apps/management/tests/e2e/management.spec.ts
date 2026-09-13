import { test, expect } from '@playwright/test';

test.describe('Management Hub - Core Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.addInitScript(() => { localStorage.clear(); });
    await page.goto('http://127.0.0.1:5175');
  });

  test('should display login screen when unauthenticated', async ({ page }) => {
    // Basic check for Login UI
    await expect(page.getByText(/Management Hub/i).first()).toBeVisible();
    await expect(page.getByPlaceholder('admin@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('Enter password')).toBeVisible();
  });

  test('should login successfully and navigate main views', async ({ page }) => {
    // Use the quick access button
    await page.getByRole('button', { name: /Instant CEO & Fleet Command Preview/i }).click();

    // Verify Dashboard loads
    await expect(page.getByText('Management Command Hub').first()).toBeVisible();

    // Test navigation to Fleet / Live Ops
    await page.getByRole('button', { name: 'Live Ops' }).click();
    await expect(page).toHaveURL(/.*#\/fleet/);

    // Test navigation to Ingestion Studio
    await page.getByRole('button', { name: 'Ingestion Studio' }).click();
    await expect(page).toHaveURL(/.*#\/ingestion-studio/);

    // Test navigation to Galleries
    await page.getByRole('button', { name: 'Galleries' }).click();
    await expect(page).toHaveURL(/.*#\/galleries/);
  });
});
