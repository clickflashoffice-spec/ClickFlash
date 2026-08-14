import { test, expect } from '@playwright/test';

test.describe('Website Navigation', () => {
  test('should navigate through all main pages', async ({ page }) => {
    // Home
    await page.goto('/');
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();

    // Features
    await page.click('[data-testid="nav-features"]');
    await expect(page).toHaveURL(/\/features/);
    await expect(page.locator('[data-testid="features-section"]')).toBeVisible();

    // Pricing
    await page.click('[data-testid="nav-pricing"]');
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.locator('[data-testid="pricing-section"]')).toBeVisible();

    // About
    await page.click('[data-testid="nav-about"]');
    await expect(page).toHaveURL(/\/about/);
    await expect(page.locator('[data-testid="about-section"]')).toBeVisible();

    // Contact
    await page.click('[data-testid="nav-contact"]');
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.locator('[data-testid="contact-section"]')).toBeVisible();
  });

  test('should handle 404 page', async ({ page }) => {
    await page.goto('/non-existent-page');
    await expect(page.locator('[data-testid="404-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-home-link"]')).toBeVisible();
  });

  test('should have working footer links', async ({ page }) => {
    await page.goto('/');
    
    await page.click('[data-testid="footer-privacy-link"]');
    await expect(page).toHaveURL(/\/privacy/);

    await page.goto('/');
    await page.click('[data-testid="footer-terms-link"]');
    await expect(page).toHaveURL(/\/terms/);
  });

  test('should scroll to sections via anchor links', async ({ page }) => {
    await page.goto('/');
    
    await page.click('[data-testid="scroll-to-features"]');
    await expect(page.locator('[data-testid="features-section"]')).toBeInViewport();

    await page.click('[data-testid="scroll-to-pricing"]');
    await expect(page.locator('[data-testid="pricing-section"]')).toBeInViewport();
  });
});

test.describe('Mobile Navigation', () => {
  test('should toggle mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Open menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Click link and verify menu closes
    await page.click('[data-testid="mobile-nav-features"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeHidden();
    await expect(page).toHaveURL(/\/features/);
  });
});
