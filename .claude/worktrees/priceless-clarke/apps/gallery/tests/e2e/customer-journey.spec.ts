import { test, expect } from '@playwright/test';

test.describe('Customer Gallery Journey', () => {
  test('should browse and purchase photos', async ({ page }) => {
    await page.goto('/gallery/ALBUM123');

    const hasAccessCode = await page.locator('[data-testid="access-code-input"]').isVisible().catch(() => false);
    if (hasAccessCode) {
      await page.fill('[data-testid="access-code-input"]', 'CODE123');
      await page.click('[data-testid="submit-code-button"]');
    }

    await expect(page.locator('[data-testid="gallery-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="photo-grid"]')).toBeVisible();

    await page.click('[data-testid="photo-item"]:nth-child(1)');
    await expect(page.locator('[data-testid="photo-lightbox"]')).toBeVisible();

    await page.click('[data-testid="next-photo-button"]');
    await page.click('[data-testid="next-photo-button"]');
    await page.click('[data-testid="prev-photo-button"]');
    await page.click('[data-testid="close-lightbox-button"]');

    await page.click('[data-testid="photo-item"]:nth-child(2) [data-testid="add-to-cart"]');
    await page.click('[data-testid="photo-item"]:nth-child(3) [data-testid="add-to-cart"]');

    await page.click('[data-testid="cart-button"]');
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('2');

    await page.selectOption('[data-testid="product-type-select"]', 'digital-download');
    await page.selectOption('[data-testid="product-size-select"]', 'original');

    await page.click('[data-testid="checkout-button"]');

    await page.fill('[data-testid="email-input"]', 'customer@example.com');
    await page.fill('[data-testid="name-input"]', 'Customer Name');

    await page.click('[data-testid="pay-with-card-button"]');
    
    const stripeFrame = page.frameLocator('[data-testid="stripe-card-frame"]');
    await stripeFrame.locator('[data-testid="card-number-input"]').fill('4242424242424242');
    await stripeFrame.locator('[data-testid="card-expiry-input"]').fill('12/25');
    await stripeFrame.locator('[data-testid="card-cvc-input"]').fill('123');

    await page.click('[data-testid="complete-purchase-button"]');

    await expect(page.locator('[data-testid="purchase-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="download-link"]')).toBeVisible();
  });

  test('should share album via email', async ({ page }) => {
    await page.goto('/gallery/ALBUM123');
    await page.click('[data-testid="share-button"]');
    await page.fill('[data-testid="share-email-input"]', 'friend@example.com');
    await page.fill('[data-testid="share-message-input"]', 'Check out these photos!');
    await page.click('[data-testid="send-share-button"]');
    await expect(page.locator('[data-testid="share-success"]')).toBeVisible();
  });

  test('should filter photos by category', async ({ page }) => {
    await page.goto('/gallery/ALBUM123');
    await page.click('[data-testid="filter-button"]');
    await page.selectOption('[data-testid="category-filter"]', 'people');
    const photos = page.locator('[data-testid="photo-item"]');
    const count = await photos.count();
    if (count > 0) {
      await expect(page.locator('[data-testid="photo-category-badge"]')).toContainText('people');
    }
  });

  test('should favorite photos', async ({ page }) => {
    await page.goto('/gallery/ALBUM123');
    await page.click('[data-testid="photo-item"]:nth-child(1) [data-testid="favorite-button"]');
    await page.click('[data-testid="view-favorites-button"]');
    await expect(page.locator('[data-testid="favorites-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="photo-item"]')).toHaveCount(1);
  });
});
