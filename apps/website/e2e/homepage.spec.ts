import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/ClickFlash/);
  });

  test('should have working navigation', async ({ page }) => {
    // Check main navigation links
    const navLinks = page.locator('nav a');
    expect(await navLinks.count()).toBeGreaterThan(0);
    
    // Test a navigation link
    await page.click('nav a[href="/features"]');
    await expect(page).toHaveURL(/\/features/);
  });

  test('should display hero section', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"]');
    await expect(hero).toBeVisible();
    await expect(hero).toContainText('Photography');
  });

  test('should have call-to-action buttons', async ({ page }) => {
    const ctaButton = page.locator('[data-testid="cta-button"]');
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toBeEnabled();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should load 3D elements', async ({ page }) => {
    // Wait for 3D canvas to load
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });

  test('should have proper meta tags', async ({ page }) => {
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);
  });
});

test.describe('Contact Form', () => {
  test('should submit contact form', async ({ page }) => {
    await page.goto('/contact');
    
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="message-input"]', 'Test message');
    
    await page.click('[data-testid="submit-button"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should show validation errors', async ({ page }) => {
    await page.goto('/contact');
    
    // Submit empty form
    await page.click('[data-testid="submit-button"]');
    
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
  });
});
