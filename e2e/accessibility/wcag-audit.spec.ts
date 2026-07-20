import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Accessibility Audit', () => {
  test('Management Hub Dashboard Accessibility', async ({ page }) => {
    await page.goto('http://localhost:5175/manage');
    // Wait for content to load
    await page.waitForSelector('text=Workforce');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Gallery Client Portal Accessibility', async ({ page }) => {
    await page.goto('http://localhost:5176/gallery');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
