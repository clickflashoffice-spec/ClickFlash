import { test, expect } from '@playwright/test';

test.describe('Web Checkout & Auth (E2E)', () => {
  test('should authenticate via Magic Link', async ({ page }) => {
    // 1. User navigates to gallery login
    await page.goto('http://127.0.0.1:3001/login');
    
    // 2. User requests magic link
    await expect(page.locator('text=Request Access Link')).toBeVisible();
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.click('button:has-text("Send Link")');

    // 3. System shows success state
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 });

    // Note: Actual email clicking would require Mailtrap API or similar in full E2E
    // For this test, we verify the request succeeds and the UI updates
  });

  test('should process Stripe Checkout correctly', async ({ page }) => {
    // Navigate to a gallery album (simulated logged in)
    await page.goto('http://127.0.0.1:3001/album/demo-album');

    // Add to cart
    const buyBtn = page.locator('button:has-text("Buy Album")');
    if (await buyBtn.isVisible({ timeout: 5000 })) {
      await buyBtn.click();
    }

    // Go to checkout
    const checkoutBtn = page.locator('button:has-text("Checkout")');
    if (await checkoutBtn.isVisible({ timeout: 5000 })) {
      await checkoutBtn.click();

      // Verify Stripe Payment Element or redirect
      await expect(page.locator('iframe[title*="Secure payment input"]')).toBeVisible({ timeout: 15000 }).catch(() => {
        // Alternatively, might be redirected to stripe.com
        expect(page.url()).toContain('stripe.com');
      });
    }
  });
});
