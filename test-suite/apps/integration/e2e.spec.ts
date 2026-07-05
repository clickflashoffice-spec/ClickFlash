import { test, expect } from '@playwright/test';

/**
 * Cross-App Integration E2E Tests
 * 
 * Tests for interactions between multiple ClickFlash apps
 */

test.describe('Integration - Master ↔ Touch Kiosk Pairing', () => {
  test('complete pairing flow', async ({ page, browser }) => {
    // Open Master app
    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();
    await masterPage.goto('http://localhost:8090');
    
    // Login to Master
    await masterPage.fill('[data-testid="email-input"]', 'admin@test.com');
    await masterPage.fill('[data-testid="password-input"]', 'TestPassword123!');
    await masterPage.click('[data-testid="login-button"]');
    await masterPage.waitForURL('/dashboard');
    
    // Navigate to kiosk pairing
    await masterPage.click('[data-testid="settings-nav"]');
    await masterPage.click('[data-testid="kiosks-tab"]');
    await masterPage.click('[data-testid="pair-new-kiosk-button"]');
    
    // Get QR code data
    const qrToken = await masterPage.locator('[data-testid="pairing-token"]').textContent();
    expect(qrToken).toBeTruthy();
    
    // Open Touch app
    const touchContext = await browser.newContext();
    const touchPage = await touchContext.newPage();
    await touchPage.goto('http://localhost:3001');
    
    // Enter pairing code
    await touchPage.click('[data-testid="enter-album-button"]');
    await touchPage.fill('[data-testid="album-code-input"]', qrToken!);
    await touchPage.click('[data-testid="submit-code-button"]');
    
    // Verify connection on Master
    await masterPage.waitForSelector('[data-testid="kiosk-status-online"]');
    const status = await masterPage.locator('[data-testid="kiosk-status"]:first-child').textContent();
    expect(status).toBe('online');
    
    // Cleanup
    await masterContext.close();
    await touchContext.close();
  });

  test('album transfer to kiosk', async ({ page, browser }) => {
    // Setup paired kiosk
    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();
    await masterPage.goto('http://localhost:8090');
    await masterPage.fill('[data-testid="email-input"]', 'admin@test.com');
    await masterPage.fill('[data-testid="password-input"]', 'TestPassword123!');
    await masterPage.click('[data-testid="login-button"]');
    await masterPage.waitForURL('/dashboard');
    
    // Create and send album
    await masterPage.click('[data-testid="album-card"]:first-child');
    await masterPage.click('[data-testid="send-to-kiosk-button"]');
    await masterPage.selectOption('[data-testid="kiosk-select"]', { index: 0 });
    await masterPage.click('[data-testid="confirm-send-button"]');
    
    // Verify on Touch
    const touchContext = await browser.newContext();
    const touchPage = await touchContext.newPage();
    await touchPage.goto('http://localhost:3001');
    
    await touchPage.waitForSelector('[data-testid="album-photos"]');
    const photos = await touchPage.locator('[data-testid="photo-item"]').count();
    expect(photos).toBeGreaterThan(0);
    
    await masterContext.close();
    await touchContext.close();
  });

  test('order sync from Touch to Master', async ({ browser }) => {
    // Setup
    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();
    await masterPage.goto('http://localhost:8090');
    await masterPage.fill('[data-testid="email-input"]', 'admin@test.com');
    await masterPage.fill('[data-testid="password-input"]', 'TestPassword123!');
    await masterPage.click('[data-testid="login-button"]');
    await masterPage.waitForURL('/dashboard');
    
    const touchContext = await browser.newContext();
    const touchPage = await touchContext.newPage();
    await touchPage.goto('http://localhost:3001');
    
    // Create order on Touch
    await touchPage.click('[data-testid="enter-album-button"]');
    await touchPage.fill('[data-testid="album-code-input"]', 'ABC123');
    await touchPage.click('[data-testid="submit-code-button"]');
    await touchPage.waitForSelector('[data-testid="photo-carousel"]');
    await touchPage.click('[data-testid="photo-item"]:first-child');
    await touchPage.click('[data-testid="add-to-cart-button"]');
    await touchPage.click('[data-testid="product-4x6-print"]');
    await touchPage.click('[data-testid="confirm-add-button"]');
    await touchPage.click('[data-testid="checkout-button"]');
    await touchPage.click('[data-testid="cash-payment-button"]');
    await touchPage.fill('[data-testid="cash-amount-input"]', '50');
    await touchPage.click('[data-testid="confirm-cash-button"]');
    
    // Verify order appears on Master
    await masterPage.click('[data-testid="orders-nav"]');
    await masterPage.waitForSelector('[data-testid="order-item"]');
    
    const orders = await masterPage.locator('[data-testid="order-item"]').count();
    expect(orders).toBeGreaterThan(0);
    
    await masterContext.close();
    await touchContext.close();
  });
});

test.describe('Integration - Master ↔ Gallery', () => {
  test('publish album to gallery', async ({ page, browser }) => {
    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();
    await masterPage.goto('http://localhost:8090');
    await masterPage.fill('[data-testid="email-input"]', 'admin@test.com');
    await masterPage.fill('[data-testid="password-input"]', 'TestPassword123!');
    await masterPage.click('[data-testid="login-button"]');
    await masterPage.waitForURL('/dashboard');
    
    // Navigate to album
    await masterPage.click('[data-testid="album-card"]:first-child');
    await masterPage.click('[data-testid="publish-button"]');
    
    // Configure gallery settings
    await masterPage.selectOption('[data-testid="visibility-select"]', 'public');
    await masterPage.click('[data-testid="generate-link-button"]');
    
    const galleryUrl = await masterPage.locator('[data-testid="gallery-link"]').inputValue();
    expect(galleryUrl).toContain('gallery');
    
    // Verify gallery is accessible
    const galleryContext = await browser.newContext();
    const galleryPage = await galleryContext.newPage();
    await galleryPage.goto(galleryUrl);
    
    await galleryPage.waitForSelector('[data-testid="gallery-container"]');
    const photos = await galleryPage.locator('[data-testid="gallery-photo"]').count();
    expect(photos).toBeGreaterThan(0);
    
    await masterContext.close();
    await galleryContext.close();
  });

  test('private album requires access code', async ({ browser }) => {
    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();
    await masterPage.goto('http://localhost:8090');
    await masterPage.fill('[data-testid="email-input"]', 'admin@test.com');
    await masterPage.fill('[data-testid="password-input"]', 'TestPassword123!');
    await masterPage.click('[data-testid="login-button"]');
    await masterPage.waitForURL('/dashboard');
    
    // Publish private album
    await masterPage.click('[data-testid="album-card"]:first-child');
    await masterPage.click('[data-testid="publish-button"]');
    await masterPage.selectOption('[data-testid="visibility-select"]', 'private');
    await masterPage.fill('[data-testid="access-code-input"]', 'SECRET123');
    await masterPage.click('[data-testid="generate-link-button"]');
    
    const galleryUrl = await masterPage.locator('[data-testid="gallery-link"]').inputValue();
    
    // Try to access without code
    const galleryContext = await browser.newContext();
    const galleryPage = await galleryContext.newPage();
    await galleryPage.goto(galleryUrl);
    
    await galleryPage.waitForSelector('[data-testid="access-code-form"]');
    
    // Enter code
    await galleryPage.fill('[data-testid="access-code-input"]', 'SECRET123');
    await galleryPage.click('[data-testid="submit-code-button"]');
    
    await galleryPage.waitForSelector('[data-testid="gallery-container"]');
    
    await masterContext.close();
    await galleryContext.close();
  });
});

test.describe('Integration - Master ↔ Management Hub', () => {
  test('sync studio data to management', async ({ browser }) => {
    // Create data on Master
    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();
    await masterPage.goto('http://localhost:8090');
    await masterPage.fill('[data-testid="email-input"]', 'admin@test.com');
    await masterPage.fill('[data-testid="password-input"]', 'TestPassword123!');
    await masterPage.click('[data-testid="login-button"]');
    await masterPage.waitForURL('/dashboard');
    
    // Create album
    await masterPage.click('[data-testid="new-album-button"]');
    await masterPage.fill('[data-testid="album-name-input"]', 'Sync Test Album');
    await masterPage.click('[data-testid="create-album-button"]');
    
    // Create order
    await masterPage.click('[data-testid="orders-nav"]');
    await masterPage.click('[data-testid="new-order-button"]');
    await masterPage.fill('[data-testid="customer-name-input"]', 'Sync Customer');
    await masterPage.fill('[data-testid="customer-email-input"]', 'sync@test.com');
    await masterPage.click('[data-testid="create-order-button"]');
    
    // Verify on Management Hub
    const mgmtContext = await browser.newContext();
    const mgmtPage = await mgmtContext.newPage();
    await mgmtPage.goto('https://management-hub.clickflash-office.workers.dev');
    await mgmtPage.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await mgmtPage.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await mgmtPage.click('[data-testid="login-button"]');
    await mgmtPage.waitForURL('/dashboard');
    
    await mgmtPage.click('[data-testid="studios-nav"]');
    await mgmtPage.click('[data-testid="studio-row"]:first-child');
    
    // Verify album count updated
    await mgmtPage.waitForSelector('[data-testid="studio-albums"]');
    const albumCount = await mgmtPage.locator('[data-testid="album-count"]').textContent();
    expect(parseInt(albumCount || '0')).toBeGreaterThan(0);
    
    await masterContext.close();
    await mgmtContext.close();
  });
});

test.describe('Integration - Cloudflare Workers', () => {
  test('MoneyTrash → Gallery data flow', async () => {
    // This would test the actual API integration between services
    // Requires running Cloudflare Workers in development mode
    
    const moneytrashUrl = 'https://moneytrash-api.clickflash-office.workers.dev';
    const galleryUrl = 'https://gallery-backend.clickflash-office.workers.dev';
    
    // Create album via MoneyTrash API
    const createResponse = await fetch(`${moneytrashUrl}/albums`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        name: 'Integration Test',
        visibility: 'public'
      })
    });
    
    expect(createResponse.status).toBe(201);
    const album = await createResponse.json();
    
    // Verify album accessible via Gallery
    const galleryResponse = await fetch(`${galleryUrl}/albums/${album.id}`);
    expect(galleryResponse.status).toBe(200);
    
    const galleryAlbum = await galleryResponse.json();
    expect(galleryAlbum.id).toBe(album.id);
  });

  test('D1 database consistency', async () => {
    const apiUrl = 'https://moneytrash-api.clickflash-office.workers.dev';
    
    // Create product
    const createResponse = await fetch(`${apiUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        name: 'Consistency Test',
        price: 9.99,
        category: 'prints',
        sku: 'CONS-001'
      })
    });
    
    expect(createResponse.status).toBe(201);
    const product = await createResponse.json();
    
    // Immediate read
    const readResponse = await fetch(`${apiUrl}/products/${product.id}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    expect(readResponse.status).toBe(200);
    const readProduct = await readResponse.json();
    expect(readProduct.name).toBe('Consistency Test');
    
    // Update
    const updateResponse = await fetch(`${apiUrl}/products/${product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ price: 14.99 })
    });
    
    expect(updateResponse.status).toBe(200);
    
    // Verify update
    const verifyResponse = await fetch(`${apiUrl}/products/${product.id}`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    const verifyProduct = await verifyResponse.json();
    expect(verifyProduct.price).toBe(14.99);
  });
});

test.describe('Integration - End-to-End Purchase Flow', () => {
  test('complete customer journey', async ({ browser }) => {
    // 1. Master: Create and publish album
    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();
    await masterPage.goto('http://localhost:8090');
    await masterPage.fill('[data-testid="email-input"]', 'admin@test.com');
    await masterPage.fill('[data-testid="password-input"]', 'TestPassword123!');
    await masterPage.click('[data-testid="login-button"]');
    await masterPage.waitForURL('/dashboard');
    
    await masterPage.click('[data-testid="new-album-button"]');
    await masterPage.fill('[data-testid="album-name-input"]', 'Customer Journey Album');
    await masterPage.click('[data-testid="create-album-button"]');
    
    // Upload photos
    const fileInput = await masterPage.locator('[data-testid="photo-upload-input"]');
    await fileInput.setInputFiles(['./test-data/photos/test-photo-1.jpg']);
    await masterPage.waitForSelector('[data-testid="photo-grid"]', { timeout: 30000 });
    
    // Publish to gallery
    await masterPage.click('[data-testid="publish-button"]');
    await masterPage.selectOption('[data-testid="visibility-select"]', 'public');
    await masterPage.click('[data-testid="generate-link-button"]');
    const galleryUrl = await masterPage.locator('[data-testid="gallery-link"]').inputValue();
    
    // 2. Customer: View gallery and select photos
    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    await customerPage.goto(galleryUrl);
    
    await customerPage.waitForSelector('[data-testid="gallery-photo"]');
    await customerPage.click('[data-testid="gallery-photo"]:first-child');
    await customerPage.click('[data-testid="select-mode-button"]');
    await customerPage.click('[data-testid="add-to-cart-button"]');
    
    // 3. Customer: Checkout
    await customerPage.click('[data-testid="checkout-button"]');
    await customerPage.fill('[data-testid="customer-name-input"]', 'Journey Customer');
    await customerPage.fill('[data-testid="customer-email-input"]', 'journey@test.com');
    
    const stripeFrame = customerPage.frameLocator('[data-testid="stripe-card-element"] iframe');
    await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
    await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/30');
    await stripeFrame.locator('[placeholder="CVC"]').fill('123');
    
    await customerPage.click('[data-testid="confirm-payment-button"]');
    await customerPage.waitForSelector('[data-testid="payment-success"]');
    
    // 4. Master: Verify order received
    await masterPage.click('[data-testid="orders-nav"]');
    await masterPage.waitForSelector('[data-testid="order-item"]');
    
    const orderText = await masterPage.locator('[data-testid="order-item"]:first-child').textContent();
    expect(orderText).toContain('Journey Customer');
    
    // 5. Management: Verify analytics updated
    const mgmtContext = await browser.newContext();
    const mgmtPage = await mgmtContext.newPage();
    await mgmtPage.goto('https://management-hub.clickflash-office.workers.dev');
    await mgmtPage.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await mgmtPage.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await mgmtPage.click('[data-testid="login-button"]');
    await mgmtPage.waitForURL('/dashboard');
    
    await mgmtPage.click('[data-testid="analytics-nav"]');
    await mgmtPage.waitForSelector('[data-testid="revenue-chart"]');
    
    const revenue = await mgmtPage.locator('[data-testid="kpi-revenue"]').textContent();
    expect(revenue).toContain('$');
    
    await masterContext.close();
    await customerContext.close();
    await mgmtContext.close();
  });
});
