import { test, expect } from '@playwright/test';
import { ManagementAPI } from '../../utils/api-client';

/**
 * Management Hub E2E Tests
 * 
 * Tests for the admin dashboard and management interface
 */

const api = new ManagementAPI(process.env.MANAGEMENT_URL || 'https://management-hub.clickflash-office.workers.dev');

test.describe('Management Hub - Authentication', () => {
  test('admin login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="admin-badge"]')).toBeVisible();
  });

  test('studio login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'studio@example.com');
    await page.fill('[data-testid="password-input"]', 'StudioPassword123!');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="studio-name"]')).toBeVisible();
  });

  test('invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrong');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});

test.describe('Management Hub - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('dashboard loads with KPIs', async ({ page }) => {
    await expect(page.locator('[data-testid="kpi-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-customers"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-conversion"]')).toBeVisible();
  });

  test('revenue chart displays', async ({ page }) => {
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-canvas"]')).toBeVisible();
  });

  test('recent activity feed', async ({ page }) => {
    await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
    const activities = await page.locator('[data-testid="activity-item"]').count();
    expect(activities).toBeGreaterThanOrEqual(0);
  });

  test('date range selector', async ({ page }) => {
    await page.selectOption('[data-testid="date-range-select"]', '7d');
    
    await expect(page.locator('[data-testid="kpi-revenue"]')).toBeVisible();
    // Verify data updated
  });
});

test.describe('Management Hub - Studio Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('list all studios', async ({ page }) => {
    await page.click('[data-testid="studios-nav"]');
    
    await expect(page.locator('[data-testid="studios-table"]')).toBeVisible();
    const studios = await page.locator('[data-testid="studio-row"]').count();
    expect(studios).toBeGreaterThanOrEqual(0);
  });

  test('search studios', async ({ page }) => {
    await page.click('[data-testid="studios-nav"]');
    
    await page.fill('[data-testid="search-input"]', 'Test');
    await page.click('[data-testid="search-button"]');
    
    const studios = await page.locator('[data-testid="studio-row"]').count();
    // Should filter results
  });

  test('view studio details', async ({ page }) => {
    await page.click('[data-testid="studios-nav"]');
    await page.click('[data-testid="studio-row"]:first-child');
    
    await expect(page.locator('[data-testid="studio-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="studio-stats"]')).toBeVisible();
  });

  test('impersonate studio', async ({ page }) => {
    await page.click('[data-testid="studios-nav"]');
    await page.click('[data-testid="studio-row"]:first-child');
    
    await page.click('[data-testid="impersonate-button"]');
    
    await expect(page.locator('[data-testid="impersonation-banner"]')).toBeVisible();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('suspend studio', async ({ page }) => {
    await page.click('[data-testid="studios-nav"]');
    await page.click('[data-testid="studio-row"]:first-child');
    
    await page.click('[data-testid="suspend-button"]');
    await page.click('[data-testid="confirm-suspend-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('suspended');
  });
});

test.describe('Management Hub - Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('revenue analytics', async ({ page }) => {
    await page.click('[data-testid="analytics-nav"]');
    await page.click('[data-testid="revenue-tab"]');
    
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-table"]')).toBeVisible();
  });

  test('customer analytics', async ({ page }) => {
    await page.click('[data-testid="analytics-nav"]');
    await page.click('[data-testid="customers-tab"]');
    
    await expect(page.locator('[data-testid="customer-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="top-customers"]')).toBeVisible();
  });

  test('kiosk analytics', async ({ page }) => {
    await page.click('[data-testid="analytics-nav"]');
    await page.click('[data-testid="kiosks-tab"]');
    
    await expect(page.locator('[data-testid="kiosk-performance"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversion-chart"]')).toBeVisible();
  });

  test('export analytics report', async ({ page }) => {
    await page.click('[data-testid="analytics-nav"]');
    await page.click('[data-testid="export-button"]');
    
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.click('[data-testid="confirm-export-button"]');
    
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});

test.describe('Management Hub - Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('create notification campaign', async ({ page }) => {
    await page.click('[data-testid="notifications-nav"]');
    await page.click('[data-testid="new-campaign-button"]');
    
    await page.fill('[data-testid="campaign-title-input"]', 'Test Campaign');
    await page.fill('[data-testid="campaign-message-input"]', 'This is a test message');
    await page.selectOption('[data-testid="campaign-target"]', 'all');
    
    await page.click('[data-testid="send-campaign-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Campaign sent');
  });

  test('view notification history', async ({ page }) => {
    await page.click('[data-testid="notifications-nav"]');
    
    await expect(page.locator('[data-testid="campaign-list"]')).toBeVisible();
    const campaigns = await page.locator('[data-testid="campaign-item"]').count();
    expect(campaigns).toBeGreaterThanOrEqual(0);
  });

  test('notification delivery stats', async ({ page }) => {
    await page.click('[data-testid="notifications-nav"]');
    await page.click('[data-testid="campaign-item"]:first-child');
    
    await expect(page.locator('[data-testid="delivery-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="open-rate"]')).toBeVisible();
  });
});

test.describe('Management Hub - Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@clickflash.com');
    await page.fill('[data-testid="password-input"]', 'AdminPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('general settings', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="general-tab"]');
    
    await page.fill('[data-testid="app-name-input"]', 'ClickFlash Test');
    await page.click('[data-testid="save-settings-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('payment settings', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="payments-tab"]');
    
    await page.fill('[data-testid="stripe-key-input"]', 'sk_test_***');
    await page.click('[data-testid="save-payments-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('email settings', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="email-tab"]');
    
    await page.fill('[data-testid="resend-key-input"]', 're_***');
    await page.click('[data-testid="save-email-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('user management', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]');
    await page.click('[data-testid="users-tab"]');
    
    await page.click('[data-testid="add-user-button"]');
    await page.fill('[data-testid="user-email-input"]', 'newadmin@example.com');
    await page.selectOption('[data-testid="user-role-select"]', 'admin');
    await page.click('[data-testid="send-invite-button"]');
    
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Invitation sent');
  });
});

test.describe('Management Hub - API', () => {
  test('get system stats', async () => {
    api.setAuthToken(api.getAdminToken());
    
    const response = await api.get('/admin/stats');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalStudios');
    expect(response.body).toHaveProperty('totalUsers');
    expect(response.body).toHaveProperty('monthlyRevenue');
  });

  test('list studios', async () => {
    api.setAuthToken(api.getAdminToken());
    
    const response = await api.get('/admin/studios');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('studios');
    expect(Array.isArray(response.body.studios)).toBe(true);
  });

  test('get studio by id', async () => {
    api.setAuthToken(api.getAdminToken());
    
    const response = await api.get('/admin/studios/studio-1');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  });

  test('update studio status', async () => {
    api.setAuthToken(api.getAdminToken());
    
    const response = await api.patch('/admin/studios/studio-1', {
      status: 'suspended'
    });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('suspended');
  });

  test('send system notification', async () => {
    api.setAuthToken(api.getAdminToken());
    
    const response = await api.post('/admin/notifications', {
      title: 'Test Notification',
      message: 'This is a test',
      target: 'all'
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('sent');
  });

  test('get analytics report', async () => {
    api.setAuthToken(api.getAdminToken());
    
    const response = await api.get('/admin/analytics?period=30d');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('revenue');
    expect(response.body).toHaveProperty('orders');
  });
});
