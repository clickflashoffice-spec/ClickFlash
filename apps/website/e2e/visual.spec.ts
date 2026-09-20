import { test, expect } from '@playwright/test';

// Visual regression tests
const pages = [
  { name: 'homepage', path: '/' },
  { name: 'features', path: '/features' },
  { name: 'pricing', path: '/pricing' },
  { name: 'contact', path: '/contact' },
];

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
];

for (const pageConfig of pages) {
  test.describe(`Visual: ${pageConfig.name}`, () => {
    for (const viewport of viewports) {
      test(`${pageConfig.name} on ${viewport.name}`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });

        // Navigate
        await page.goto(pageConfig.path);
        await page.waitForLoadState('networkidle');

        // Wait for animations to complete
        await page.waitForTimeout(1000);

        // Take screenshot
        await expect(page).toHaveScreenshot(
          `${pageConfig.name}-${viewport.name}.png`,
          {
            fullPage: true,
            animations: 'disabled',
          }
        );
      });
    }
  });
}

test.describe('Visual: Component States', () => {
  test('navigation menu expanded', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await page.waitForTimeout(500);
    
    await expect(page.locator('[data-testid="mobile-menu"]')).toHaveScreenshot(
      'mobile-menu-expanded.png'
    );
  });

  test('modal open', async ({ page }) => {
    await page.goto('/');
    
    // Trigger modal
    await page.click('[data-testid="cta-button"]');
    await page.waitForTimeout(500);
    
    await expect(page.locator('[data-testid="modal"]')).toHaveScreenshot(
      'modal-open.png'
    );
  });
});
