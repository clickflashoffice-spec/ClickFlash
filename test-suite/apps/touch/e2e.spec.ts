import { test, expect } from '@playwright/test';
import { TestData } from '../../utils/test-data';

/**
 * Touch App E2E Tests
 * 
 * Tests for the kiosk/customer-facing application
 */

test.describe('Touch App - Boot and Configuration', () => {
  test('app boots successfully', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('[data-testid="touch-app"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeHidden({ timeout: 10000 });
  });

  test('loads configuration from Master', async ({ page }) => {
    await page.goto('/');
    
    // Wait for config load
    await page.waitForSelector('[data-testid="config-loaded"]');
    
    const studioName = await page.locator('[data-testid="studio-name"]').textContent();
    expect(studioName).toBeTruthy();
  });

  test('displays connection status', async ({ page }) => {
    await page.goto('/');
    
    const status = await page.locator('[data-testid="connection-status"]').textContent();
    expect(['connected', 'connecting', 'offline']).toContain(status);
  });
});

test.describe('Touch App - Product Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="product-grid"]');
  });

  test('displays product grid', async ({ page }) => {
    const products = await page.locator('[data-testid="product-card"]').count();
    expect(products).toBeGreaterThan(0);
  });

  test('product shows correct pricing', async ({ page }) => {
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    
    const price = await firstProduct.locator('[data-testid="product-price"]').textContent();
    expect(price).toMatch(/^\$[\d.]+$/);
  });

  test('product shows image', async ({ page }) => {
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    const image = firstProduct.locator('[data-testid="product-image"]');
    
    await expect(image).toBeVisible();
    expect(await image.getAttribute('src')).toBeTruthy();
  });
});

test.describe('Touch App - Album Selection', () => {
  test('enter album code', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-album-button"]');
    
    await page.fill('[data-testid="album-code-input"]', 'ABC123');
    await page.click('[data-testid="submit-code-button"]');
    
    await expect(page.locator('[data-testid="album-photos"]')).toBeVisible();
  });

  test('invalid album code shows error', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-album-button"]');
    
    await page.fill('[data-testid="album-code-input"]', 'INVALID');
    await page.click('[data-testid="submit-code-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid code');
  });

  test('scan QR code', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="scan-qr-button"]');
    
    await expect(page.locator('[data-testid="qr-scanner"]')).toBeVisible();
    
    // Simulate QR scan (mock)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('qr-scanned', { detail: { code: 'ALBUM-ABC123' } }));
    });
    
    await expect(page.locator('[data-testid="album-photos"]')).toBeVisible();
  });
});

test.describe('Touch App - Photo Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-album-button"]');
    await page.fill('[data-testid="album-code-input"]', 'ABC123');
    await page.click('[data-testid="submit-code-button"]');
    await page.waitForSelector('[data-testid="photo-carousel"]');
  });

  test('select photos', async ({ page }) => {
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="photo-item"]:nth-child(2)');
    
    const selectedCount = await page.locator('[data-testid="selected-count"]').textContent();
    expect(selectedCount).toContain('2');
  });

  test('deselect photos', async ({ page }) => {
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="photo-item"]:first-child');
    
    const selectedCount = await page.locator('[data-testid="selected-count"]').textContent();
    expect(selectedCount).toContain('0');
  });

  test('zoom photo', async ({ page }) => {
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="zoom-button"]');
    
    await expect(page.locator('[data-testid="zoomed-photo"]')).toBeVisible();
  });
});

test.describe('Touch App - Cart and Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-album-button"]');
    await page.fill('[data-testid="album-code-input"]', 'ABC123');
    await page.click('[data-testid="submit-code-button"]');
    await page.waitForSelector('[data-testid="photo-carousel"]');
    
    // Select photos
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="photo-item"]:nth-child(2)');
  });

  test('add items to cart', async ({ page }) => {
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Select product
    await page.click('[data-testid="product-4x6-print"]');
    await page.fill('[data-testid="quantity-input"]', '2');
    await page.click('[data-testid="confirm-add-button"]');
    
    await expect(page.locator('[data-testid="cart-sidebar"]')).toBeVisible();
    const cartCount = await page.locator('[data-testid="cart-count"]').textContent();
    expect(cartCount).toContain('2');
  });

  test('remove items from cart', async ({ page }) => {
    // Add item first
    await page.click('[data-testid="add-to-cart-button"]');
    await page.click('[data-testid="product-4x6-print"]');
    await page.click('[data-testid="confirm-add-button"]');
    
    // Remove item
    await page.click('[data-testid="remove-item-button"]:first-child');
    
    const cartCount = await page.locator('[data-testid="cart-count"]').textContent();
    expect(cartCount).toContain('0');
  });

  test('proceed to checkout', async ({ page }) => {
    // Add items
    await page.click('[data-testid="add-to-cart-button"]');
    await page.click('[data-testid="product-4x6-print"]');
    await page.click('[data-testid="confirm-add-button"]');
    
    await page.click('[data-testid="checkout-button"]');
    
    await expect(page.locator('[data-testid="checkout-form"]')).toBeVisible();
  });

  test('complete card payment', async ({ page }) => {
    // Add items and checkout
    await page.click('[data-testid="add-to-cart-button"]');
    await page.click('[data-testid="product-4x6-print"]');
    await page.click('[data-testid="confirm-add-button"]');
    await page.click('[data-testid="checkout-button"]');
    
    // Fill customer details
    await page.fill('[data-testid="customer-name-input"]', 'Test Customer');
    await page.fill('[data-testid="customer-email-input"]', 'customer@test.com');
    
    // Fill card details (Stripe test)
    const stripeFrame = page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
    await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/30');
    await stripeFrame.locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="confirm-payment-button"]');
    
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="receipt-button"]')).toBeVisible();
  });

  test('complete cash payment', async ({ page }) => {
    // Add items and checkout
    await page.click('[data-testid="add-to-cart-button"]');
    await page.click('[data-testid="product-4x6-print"]');
    await page.click('[data-testid="confirm-add-button"]');
    await page.click('[data-testid="checkout-button"]');
    
    // Select cash payment
    await page.click('[data-testid="cash-payment-button"]');
    
    // Enter amount
    await page.fill('[data-testid="cash-amount-input"]', '50');
    await page.click('[data-testid="confirm-cash-button"]');
    
    await expect(page.locator('[data-testid="change-due"]')).toBeVisible();
    await expect(page.locator('[data-testid="receipt-button"]')).toBeVisible();
  });
});

test.describe('Touch App - Receipt and Printing', () => {
  test('generate receipt', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-album-button"]');
    await page.fill('[data-testid="album-code-input"]', 'ABC123');
    await page.click('[data-testid="submit-code-button"]');
    await page.waitForSelector('[data-testid="photo-carousel"]');
    
    // Complete order
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="add-to-cart-button"]');
    await page.click('[data-testid="product-4x6-print"]');
    await page.click('[data-testid="confirm-add-button"]');
    await page.click('[data-testid="checkout-button"]');
    await page.click('[data-testid="cash-payment-button"]');
    await page.fill('[data-testid="cash-amount-input"]', '50');
    await page.click('[data-testid="confirm-cash-button"]');
    
    // View receipt
    await page.click('[data-testid="receipt-button"]');
    
    await expect(page.locator('[data-testid="receipt-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="receipt-order-id"]')).toBeVisible();
  });

  test('print receipt', async ({ page }) => {
    // Complete order first
    await page.goto('/');
    await page.click('[data-testid="enter-album-button"]');
    await page.fill('[data-testid="album-code-input"]', 'ABC123');
    await page.click('[data-testid="submit-code-button"]');
    await page.waitForSelector('[data-testid="photo-carousel"]');
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="add-to-cart-button"]');
    await page.click('[data-testid="product-4x6-print"]');
    await page.click('[data-testid="confirm-add-button"]');
    await page.click('[data-testid="checkout-button"]');
    await page.click('[data-testid="cash-payment-button"]');
    await page.fill('[data-testid="cash-amount-input"]', '50');
    await page.click('[data-testid="confirm-cash-button"]');
    
    await page.click('[data-testid="receipt-button"]');
    await page.click('[data-testid="print-receipt-button"]');
    
    await expect(page.locator('[data-testid="print-success"]')).toBeVisible();
  });
});

test.describe('Touch App - Admin Functions', () => {
  test('access admin menu with PIN', async ({ page }) => {
    await page.goto('/');
    
    // Long press to access admin
    const adminArea = await page.locator('[data-testid="admin-trigger"]');
    await adminArea.click({ delay: 3000 });
    
    await page.fill('[data-testid="admin-pin-input"]', '1234');
    await page.click('[data-testid="confirm-pin-button"]');
    
    await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible();
  });

  test('update product prices', async ({ page }) => {
    // Access admin menu
    await page.goto('/');
    const adminArea = await page.locator('[data-testid="admin-trigger"]');
    await adminArea.click({ delay: 3000 });
    await page.fill('[data-testid="admin-pin-input"]', '1234');
    await page.click('[data-testid="confirm-pin-button"]');
    
    await page.click('[data-testid="products-menu-item"]');
    await page.click('[data-testid="edit-product-button"]:first-child');
    
    await page.fill('[data-testid="product-price-input"]', '15.99');
    await page.click('[data-testid="save-product-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('view session history', async ({ page }) => {
    // Access admin menu
    await page.goto('/');
    const adminArea = await page.locator('[data-testid="admin-trigger"]');
    await adminArea.click({ delay: 3000 });
    await page.fill('[data-testid="admin-pin-input"]', '1234');
    await page.click('[data-testid="confirm-pin-button"]');
    
    await page.click('[data-testid="history-menu-item"]');
    
    const sessions = await page.locator('[data-testid="session-item"]').count();
    expect(sessions).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Touch App - Error Handling', () => {
  test('handles Master disconnection', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="product-grid"]');
    
    // Simulate disconnect
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('master-disconnected'));
    });
    
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
  });

  test('handles printer error', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-album-button"]');
    await page.fill('[data-testid="album-code-input"]', 'ABC123');
    await page.click('[data-testid="submit-code-button"]');
    await page.waitForSelector('[data-testid="photo-carousel"]');
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="add-to-cart-button"]');
    await page.click('[data-testid="product-4x6-print"]');
    await page.click('[data-testid="confirm-add-button"]');
    await page.click('[data-testid="checkout-button"]');
    await page.click('[data-testid="cash-payment-button"]');
    await page.fill('[data-testid="cash-amount-input"]', '50');
    await page.click('[data-testid="confirm-cash-button"]');
    
    // Simulate printer error
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('printer-error', { detail: { message: 'Out of paper' } }));
    });
    
    await expect(page.locator('[data-testid="printer-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="printer-error"]')).toContainText('paper');
  });

  test('handles timeout gracefully', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="enter-album-button"]');
    await page.fill('[data-testid="album-code-input"]', 'TIMEOUT');
    
    // Slow down network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 10000));
      await route.continue();
    });
    
    await page.click('[data-testid="submit-code-button"]');
    
    await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible();
  });
});
