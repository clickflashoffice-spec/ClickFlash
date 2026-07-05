import { test, expect } from '@playwright/test';

test.describe('Ecosystem Circulation Flow', () => {
  // Test configuration
  test.describe.configure({ mode: 'serial' }); // Run in order since it represents a flow

  let orderId: string;
  let albumId: string = 'album-test-123';
  let photoId: string = 'photo-test-123';

  test('1. Touch Kiosk: Select photo and create order', async ({ browser }) => {
    // 1. Launch Touch kiosk
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Assuming Touch kiosk runs on 8091 or we mock the API response
    // But since this is an E2E testing the actual UI, we hit localhost:8091
    await page.goto('http://localhost:8091/');
    
    // Wait for kiosk welcome screen
    await expect(page.locator('text=Welcome to ClickFlash')).toBeVisible({ timeout: 10000 });
    
    // Tap to start
    await page.locator('text=Tap to Start').click();

    // In a real E2E, we would select a specific photo. We'll simulate tapping a photo grid
    await expect(page.locator('.photo-grid')).toBeVisible();
    await page.locator('.photo-thumbnail').first().click();
    
    // Add to cart
    await page.locator('text=Add to Cart').click();

    // Checkout
    await page.locator('text=Checkout').click();
    
    // Fill out customer details if necessary
    await page.fill('input[name="customerEmail"]', 'test@clickflash.app');
    
    // Confirm order (cash or card)
    await page.locator('button:has-text("Pay at Desk")').click();

    // Wait for success screen
    await expect(page.locator('text=Order Received')).toBeVisible();

    // In a real system, the order gets a unique ID visible on screen or in DB
    // We can extract order ID from DOM or assume it synced to Master
  });

  test('2. Master Portal: Fulfill and sync order', async ({ browser }) => {
    // 2. Launch Master portal
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:8090/orders');
    
    // Log in
    await page.fill('input[name="email"]', 'admin@clickflash.app');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for Dashboard to load
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Go to Orders
    await page.click('a[href="/orders"]');

    // Find the pending order we just created
    // We expect at least one pending order in the Kanban or List view
    await expect(page.locator('.order-card', { hasText: 'test@clickflash.app' })).toBeVisible();

    // Click on the order to open details
    await page.locator('.order-card', { hasText: 'test@clickflash.app' }).click();

    // Mark as Paid
    await page.locator('button:has-text("Mark Paid")').click();

    // Wait for status to change
    await expect(page.locator('text=Status: Paid')).toBeVisible();

    // The backend CloudSyncService will pick this up automatically based on sync_status = 'pending'
  });
});
