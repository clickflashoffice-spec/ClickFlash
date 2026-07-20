import { test, expect } from '@playwright/test';

test.describe('Visual Regressions - Master App', () => {
  test('Print Station Idle Screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('print-station-idle.png', { maxDiffPixels: 100, fullPage: true });
  });
});
