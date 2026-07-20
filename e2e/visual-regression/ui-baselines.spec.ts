import { test, expect } from '@playwright/test';

test.describe('Visual Regression Baselines', () => {
  test('Management Hub Dark Mode Dashboard', async ({ page }) => {
    await page.goto('http://localhost:5175/manage');
    await page.waitForSelector('text=Workforce');
    await expect(page).toHaveScreenshot('management-dashboard-dark.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('Gallery Landing Viewport Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5176/gallery');
    await expect(page).toHaveScreenshot('gallery-landing-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
