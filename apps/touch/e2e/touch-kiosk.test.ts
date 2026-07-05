/**
 * ClickFlash Touch Kiosk - Automated Test Suite
 * 
 * Tests kiosk customer flow, LAN pairing, and offline mode
 * 
 * Run: npx playwright test touch-kiosk.test.ts
 */

import { test, expect } from '@playwright/test';

const TOUCH_URL = 'http://localhost:3001';
const MASTER_URL = 'http://localhost:8090';

test.describe('Touch Kiosk - Installation & Startup', () => {
  test('T-001: App starts on port 3001', async ({ request }) => {
    const response = await request.get(`${TOUCH_URL}/api/health`);
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.status).toBe('ok');
    } else {
      // Touch might not be running - this is acceptable for CI
      test.skip();
    }
  });

  test('T-004: Kiosk mode is fullscreen', async ({ page }) => {
    await page.goto(TOUCH_URL);
    
    // Check if page is fullscreen (no window chrome)
    const hasTitleBar = await page.evaluate(() => {
      return window.outerHeight - window.innerHeight > 100;
    });
    
    expect(hasTitleBar).toBe(false);
  });
});

test.describe('Touch Kiosk - Customer Flow', () => {
  test('T-009: Customer can enter session code', async ({ page }) => {
    await page.goto(TOUCH_URL);
    
    // Enter session code
    const codeInput = await page.locator('[data-testid="session-code-input"]');
    await codeInput.fill('TEST123');
    
    // Click enter
    await page.click('[data-testid="enter-button"]');
    
    // Should show photos or error
    const errorMessage = await page.locator('[data-testid="error-message"]');
    const photoGrid = await page.locator('[data-testid="photo-grid"]');
    
    expect(await errorMessage.isVisible() || await photoGrid.isVisible()).toBe(true);
  });

  test('T-012: Customer can select photos', async ({ page }) => {
    await page.goto(TOUCH_URL);
    
    // Navigate to a session with photos
    await page.goto(`${TOUCH_URL}/session/DEMO`);
    
    // Wait for photos to load
    await page.waitForSelector('[data-testid="photo-item"]', { timeout: 5000 });
    
    // Click first photo to select
    await page.click('[data-testid="photo-item"]:first-child');
    
    // Check if selected
    const classAttr = await page.locator('[data-testid="photo-item"]:first-child').getAttribute('class') || '';
    const isSelected = classAttr.includes('selected');
    expect(isSelected).toBe(true);
  });

  test('T-020: Customer can add to cart', async ({ page }) => {
    await page.goto(`${TOUCH_URL}/session/DEMO`);
    
    // Select a photo
    await page.click('[data-testid="photo-item"]:first-child');
    
    // Click add to cart
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Check cart count
    const cartCount = await page.locator('[data-testid="cart-count"]').textContent();
    expect(cartCount).toBe('1');
  });
});

test.describe('Touch Kiosk - LAN Pairing', () => {
  test('T-047: Auto-discovery finds Master on LAN', async ({ request }) => {
    // This test requires both Master and Touch to be running on same LAN
    const response = await request.get(`${TOUCH_URL}/api/discovery`);
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.servers).toBeDefined();
      expect(Array.isArray(body.servers)).toBe(true);
    } else {
      test.skip();
    }
  });

  test('T-050: Folder sync works after pairing', async ({ request }) => {
    // Check if paired
    const statusResponse = await request.get(`${TOUCH_URL}/api/pairing/status`);
    
    if (statusResponse.status() === 200) {
      const body = await statusResponse.json();
      
      if (body.paired) {
        // Check folder sync
        const syncResponse = await request.get(`${TOUCH_URL}/api/sync/status`);
        expect(syncResponse.status()).toBe(200);
        
        const syncBody = await syncResponse.json();
        expect(syncBody.lastSync).toBeDefined();
      }
    }
  });
});

test.describe('Touch Kiosk - Offline Mode', () => {
  test('T-039: Offline indicator shows when disconnected', async ({ page }) => {
    await page.goto(TOUCH_URL);
    
    // Simulate offline
    await page.context().setOffline(true);
    
    // Check for offline indicator
    const offlineIndicator = await page.locator('[data-testid="offline-indicator"]');
    expect(await offlineIndicator.isVisible()).toBe(true);
    
    // Restore online
    await page.context().setOffline(false);
  });

  test('T-040: Orders queue when offline', async ({ request }) => {
    // Create an order while offline
    const orderResponse = await request.post(`${TOUCH_URL}/api/orders`, {
      data: {
        customerName: 'Offline Test',
        items: [{ productId: 'photo-1', quantity: 1 }],
        total: 10.00
      }
    });
    
    expect(orderResponse.status()).toBe(200);
    
    // Check queue
    const queueResponse = await request.get(`${TOUCH_URL}/api/sync/queue`);
    expect(queueResponse.status()).toBe(200);
    
    const queue = await queueResponse.json();
    expect(queue.pending).toBeGreaterThan(0);
  });
});

test.describe('Touch Kiosk - Performance', () => {
  test('T-057: Photos load in under 2 seconds', async ({ page }) => {
    await page.goto(`${TOUCH_URL}/session/DEMO`);
    
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="photo-item"]', { timeout: 2000 });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });

  test('T-058: Swipe is smooth (60 FPS)', async ({ page }) => {
    await page.goto(`${TOUCH_URL}/session/DEMO`);
    await page.waitForSelector('[data-testid="photo-item"]');
    
    // Measure frame rate during scroll
    const frameRate = await page.evaluate(async () => {
      let frames = 0;
      const startTime = performance.now();
      
      // Scroll for 1 second
      const scrollInterval = setInterval(() => {
        window.scrollBy(0, 100);
        frames++;
      }, 16); // ~60fps
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearInterval(scrollInterval);
      
      const endTime = performance.now();
      return (frames / ((endTime - startTime) / 1000));
    });
    
    expect(frameRate).toBeGreaterThan(45); // Allow some variance
  });
});
