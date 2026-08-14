import { test, expect } from '@playwright/test';

test.describe('Visual Regressions - Touch Kiosk', () => {
  test('Kiosk Idle Screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('kiosk-idle.png', { maxDiffPixels: 100, fullPage: true });
  });
});
