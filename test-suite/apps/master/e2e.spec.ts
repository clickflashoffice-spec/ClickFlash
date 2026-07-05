import { test, expect } from '@playwright/test';
import { TestData } from '../../utils/test-data';
import { MasterAPI } from '../../utils/api-client';

/**
 * Master App E2E Tests
 * 
 * Critical user journeys for the Master desktop application
 */

test.describe('Master App - Authentication', () => {
  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-name"]')).toHaveText(TestData.users.admin.name);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  test('session timeout redirects to login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    
    // Simulate session expiration
    await page.evaluate(() => {
      localStorage.removeItem('token');
    });
    
    await page.reload();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Master App - Album Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('create new album', async ({ page }) => {
    await page.click('[data-testid="new-album-button"]');
    
    await page.fill('[data-testid="album-name-input"]', 'Test Album');
    await page.fill('[data-testid="album-description-input"]', 'A test album description');
    await page.click('[data-testid="create-album-button"]');
    
    await expect(page.locator('[data-testid="album-title"]')).toHaveText('Test Album');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('upload photos to album', async ({ page }) => {
    // Navigate to existing album
    await page.click('[data-testid="album-card"]:first-child');
    
    // Upload test photos
    const fileInput = await page.locator('[data-testid="photo-upload-input"]');
    await fileInput.setInputFiles([
      './test-data/photos/test-photo-1.jpg',
      './test-data/photos/test-photo-2.jpg',
      './test-data/photos/test-photo-3.jpg'
    ]);
    
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="photo-grid"]')).toHaveCount(3, { timeout: 30000 });
  });

  test('edit album details', async ({ page }) => {
    await page.click('[data-testid="album-card"]:first-child');
    await page.click('[data-testid="edit-album-button"]');
    
    await page.fill('[data-testid="album-name-input"]', 'Updated Album Name');
    await page.click('[data-testid="save-album-button"]');
    
    await expect(page.locator('[data-testid="album-title"]')).toHaveText('Updated Album Name');
  });

  test('delete album', async ({ page }) => {
    await page.click('[data-testid="album-card"]:first-child');
    await page.click('[data-testid="delete-album-button"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Album deleted');
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Master App - Order Processing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('create order from album', async ({ page }) => {
    // Navigate to album with photos
    await page.click('[data-testid="album-card"]:first-child');
    
    // Select photos for order
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="photo-item"]:nth-child(2)');
    
    // Create order
    await page.click('[data-testid="create-order-button"]');
    
    // Fill customer details
    await page.fill('[data-testid="customer-name-input"]', 'Test Customer');
    await page.fill('[data-testid="customer-email-input"]', 'customer@test.com');
    
    // Select products
    await page.click('[data-testid="product-4x6-print"]');
    await page.fill('[data-testid="quantity-input"]', '2');
    
    await page.click('[data-testid="add-to-order-button"]');
    await page.click('[data-testid="checkout-button"]');
    
    await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-total"]')).toContainText('$');
  });

  test('process payment with Stripe', async ({ page }) => {
    // Navigate to pending order
    await page.click('[data-testid="orders-nav"]');
    await page.click('[data-testid="pending-order"]:first-child');
    
    // Process payment
    await page.click('[data-testid="process-payment-button"]');
    
    // Fill Stripe test card
    const stripeFrame = page.frameLocator('[data-testid="stripe-card-element"] iframe');
    await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
    await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/30');
    await stripeFrame.locator('[placeholder="CVC"]').fill('123');
    
    await page.click('[data-testid="confirm-payment-button"]');
    
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-status"]')).toHaveText('paid');
  });

  test('generate print receipt', async ({ page }) => {
    await page.click('[data-testid="orders-nav"]');
    await page.click('[data-testid="completed-order"]:first-child');
    
    await page.click('[data-testid="print-receipt-button"]');
    
    await expect(page.locator('[data-testid="receipt-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="receipt-content"]')).toContainText('Order #');
  });
});

test.describe('Master App - Kiosk Pairing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('generate kiosk pairing QR code', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="kiosks-tab"]');
    await page.click('[data-testid="pair-new-kiosk-button"]');
    
    await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
    await expect(page.locator('[data-testid="pairing-token"]')).toBeVisible();
  });

  test('verify kiosk connection status', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="kiosks-tab"]');
    
    const kioskStatus = await page.locator('[data-testid="kiosk-status"]:first-child').textContent();
    expect(['online', 'offline', 'busy']).toContain(kioskStatus);
  });

  test('send album to kiosk', async ({ page }) => {
    // Navigate to album
    await page.click('[data-testid="album-card"]:first-child');
    
    // Send to kiosk
    await page.click('[data-testid="send-to-kiosk-button"]');
    await page.selectOption('[data-testid="kiosk-select"]', { index: 0 });
    await page.click('[data-testid="confirm-send-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Sent to kiosk');
  });
});

test.describe('Master App - Photo Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('apply filters to photo', async ({ page }) => {
    await page.click('[data-testid="album-card"]:first-child');
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="edit-photo-button"]');
    
    // Apply filter
    await page.click('[data-testid="filter-vintage"]');
    await page.click('[data-testid="apply-filter-button"]');
    
    await expect(page.locator('[data-testid="filter-applied-indicator"]')).toBeVisible();
  });

  test('crop and rotate photo', async ({ page }) => {
    await page.click('[data-testid="album-card"]:first-child');
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="edit-photo-button"]');
    
    // Rotate
    await page.click('[data-testid="rotate-right-button"]');
    
    // Crop (simulate drag)
    const cropArea = await page.locator('[data-testid="crop-area"]');
    const box = await cropArea.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 50, box.y + box.height / 2 - 50);
    await page.mouse.up();
    
    await page.click('[data-testid="apply-crop-button"]');
    
    await expect(page.locator('[data-testid="crop-applied-indicator"]')).toBeVisible();
  });

  test('export photo in different formats', async ({ page }) => {
    await page.click('[data-testid="album-card"]:first-child');
    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="export-photo-button"]');
    
    // Select format
    await page.selectOption('[data-testid="export-format-select"]', 'jpeg');
    await page.selectOption('[data-testid="export-quality-select"]', 'high');
    
    await page.click('[data-testid="confirm-export-button"]');
    
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-complete"]')).toBeVisible({ timeout: 30000 });
  });
});

test.describe('Master App - Backup and Restore', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('create database backup', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="backup-tab"]');
    await page.click('[data-testid="create-backup-button"]');
    
    await expect(page.locator('[data-testid="backup-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="backup-complete"]')).toBeVisible({ timeout: 60000 });
    
    const backupFile = await page.locator('[data-testid="backup-file-name"]').textContent();
    expect(backupFile).toMatch(/backup_.*\.db/);
  });

  test('restore from backup', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="backup-tab"]');
    
    // Select backup to restore
    await page.click('[data-testid="backup-item"]:first-child');
    await page.click('[data-testid="restore-backup-button"]');
    
    // Confirm restore
    await page.click('[data-testid="confirm-restore-button"]');
    
    await expect(page.locator('[data-testid="restore-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="restore-complete"]')).toBeVisible({ timeout: 60000 });
    
    // Verify app restarts
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Master App - Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('view revenue dashboard', async ({ page }) => {
    await page.click('[data-testid="analytics-nav"]');
    
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-orders"]')).toBeVisible();
  });

  test('export analytics report', async ({ page }) => {
    await page.click('[data-testid="analytics-nav"]');
    await page.selectOption('[data-testid="date-range-select"]', '30d');
    await page.click('[data-testid="export-report-button"]');
    
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    
    // Verify download
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toMatch(/report_.*\.csv/);
  });
});

test.describe('Master App - Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('update studio profile', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="profile-tab"]');
    
    await page.fill('[data-testid="studio-name-input"]', 'Updated Studio Name');
    await page.fill('[data-testid="studio-email-input"]', 'updated@example.com');
    
    await page.click('[data-testid="save-profile-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Profile updated');
  });

  test('configure payment settings', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="payments-tab"]');
    
    await page.fill('[data-testid="stripe-key-input"]', 'sk_test_newkey');
    await page.click('[data-testid="save-payments-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Payment settings saved');
  });

  test('manage user roles', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="users-tab"]');
    
    // Add new user
    await page.click('[data-testid="add-user-button"]');
    await page.fill('[data-testid="user-email-input"]', 'newuser@example.com');
    await page.selectOption('[data-testid="user-role-select"]', 'photographer');
    await page.click('[data-testid="send-invite-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Invitation sent');
  });
});

test.describe('Master App - Error Handling', () => {
  test('handles network errors gracefully', async ({ page }) => {
    await page.goto('/login');
    
    // Simulate offline
    await page.context().setOffline(true);
    
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network');
    
    // Restore network
    await page.context().setOffline(false);
  });

  test('handles server errors gracefully', async ({ page }) => {
    // Mock server error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TestData.users.admin.email);
    await page.fill('[data-testid="password-input"]', TestData.users.admin.password);
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
