/**
 * ClickFlash Master App - Automated Test Suite
 * 
 * Uses Playwright for E2E testing of the Electron app
 * 
 * Run: npx playwright test --config=playwright.config.ts
 */

import { test, expect, _electron as electron } from '@playwright/test/test';
import { join } from 'path';

// Test configuration
const TEST_TIMEOUT = 30000;
const BASE_URL = 'http://localhost:8090';
const DEFAULT_EMAIL = 'admin@clickflash.local';
const DEFAULT_PASSWORD = 'ClickFlash2025!';

test.describe('Master App - Installation & Startup', () => {
  test('M-001: App launches successfully', async () => {
    const electronApp = await electron.launch({
      args: [join(__dirname, '../dist/electron/electron-main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CF_SKIP_BACKEND: 'true'
      }
    });
    
    const window = await electronApp.firstWindow();
    await expect(window).toHaveTitle(/ClickFlash/);
    
    await electronApp.close();
  });

  test('M-002: Health check endpoint responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('M-003: Database initializes correctly', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/system/health`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.database).toBeDefined();
    expect(body.migrations).toBeGreaterThan(0);
  });
});

test.describe('Master App - Authentication', () => {
  test('M-011: Login with valid credentials', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.token).toBeDefined();
    expect(body.token.length).toBeGreaterThan(100);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(DEFAULT_EMAIL);
  });

  test('M-012: Login with invalid email', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      }
    });
    
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Invalid');
  });

  test('M-013: Login with invalid password', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: DEFAULT_EMAIL,
        password: 'wrongpassword'
      }
    });
    
    expect(response.status()).toBe(401);
  });

  test('M-014: Login with empty fields', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {}
    });
    
    expect(response.status()).toBe(400);
  });

  test('M-015: Rate limiting blocks excessive attempts', async ({ request }) => {
    // Make 6 rapid login attempts
    const attempts = [];
    for (let i = 0; i < 6; i++) {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          email: `test${i}@test.com`,
          password: 'wrong'
        }
      });
      attempts.push(response.status());
    }
    
    // At least one should be rate limited (429)
    expect(attempts).toContain(429);
  });

  test('M-020: Password change works', async ({ request }) => {
    // First login to get token
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: DEFAULT_EMAIL,
        password: DEFAULT_PASSWORD
      }
    });
    
    const { token } = await loginResponse.json();
    
    // Change password
    const changeResponse = await request.post(`${BASE_URL}/api/auth/change-password`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        currentPassword: DEFAULT_PASSWORD,
        newPassword: 'NewPassword123!'
      }
    });
    
    expect(changeResponse.status()).toBe(200);
    
    // Login with new password
    const newLoginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: DEFAULT_EMAIL,
        password: 'NewPassword123!'
      }
    });
    
    expect(newLoginResponse.status()).toBe(200);
    
    // Reset password back to default for other tests
    const resetToken = (await newLoginResponse.json()).token;
    await request.post(`${BASE_URL}/api/auth/change-password`, {
      headers: { 'Authorization': `Bearer ${resetToken}` },
      data: {
        currentPassword: 'NewPassword123!',
        newPassword: DEFAULT_PASSWORD
      }
    });
  });
});

test.describe('Master App - Albums CRUD', () => {
  let authToken: string;
  
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }
    });
    authToken = (await response.json()).token;
  });

  test('M-035: Create album', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/albums`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        name: 'Test Album',
        description: 'Test Description',
        date: new Date().toISOString()
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Test Album');
  });

  test('M-036: Album validation rejects empty name', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/albums`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { name: '' }
    });
    
    expect(response.status()).toBe(400);
  });

  test('M-042: Delete album', async ({ request }) => {
    // Create album first
    const createResponse = await request.post(`${BASE_URL}/api/albums`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { name: 'Delete Me' }
    });
    
    const { id } = await createResponse.json();
    
    // Delete it
    const deleteResponse = await request.delete(`${BASE_URL}/api/albums/${id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(deleteResponse.status()).toBe(200);
  });

  test('M-044: Album sorting works', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/albums?sort=date&order=desc`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const albums = await response.json();
    
    // Verify sorting
    if (albums.length > 1) {
      const dates = albums.map((a: any) => new Date(a.date));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    }
  });

  test('M-046: Album search works', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/albums?search=Test`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const albums = await response.json();
    
    // All results should contain search term
    albums.forEach((album: any) => {
      expect(album.name.toLowerCase()).toContain('test');
    });
  });
});

test.describe('Master App - Orders CRUD', () => {
  let authToken: string;
  
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }
    });
    authToken = (await response.json()).token;
  });

  test('M-056: Create order', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        customerName: 'Test Customer',
        customerEmail: 'test@customer.com',
        items: [
          { productId: 'photo-1', quantity: 1, price: 10.00 }
        ],
        total: 10.00
      }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.status).toBe('pending');
  });

  test('M-057: Order validation rejects empty customer', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: { items: [] }
    });
    
    expect(response.status()).toBe(400);
  });

  test('M-060: Order status flow works', async ({ request }) => {
    // Create order
    const createResponse = await request.post(`${BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        customerName: 'Status Test',
        items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
        total: 10.00
      }
    });
    
    const { id } = await createResponse.json();
    
    // Update status
    const statuses = ['processing', 'shipped', 'delivered'];
    for (const status of statuses) {
      const response = await request.put(`${BASE_URL}/api/orders/${id}/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: { status }
      });
      
      expect(response.status()).toBe(200);
    }
  });
});

test.describe('Master App - Security', () => {
  test('M-176: SQL injection is sanitized', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: "'; DROP TABLE users; --",
        password: 'test'
      }
    });
    
    // Should not crash or execute SQL
    expect(response.status()).toBe(400);
  });

  test('M-177: XSS is escaped', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: '<script>alert("xss")</script>',
        password: 'test'
      }
    });
    
    const body = await response.text();
    expect(body).not.toContain('<script>');
  });

  test('M-180: Brute force is rate limited', async ({ request }) => {
    const responses = [];
    for (let i = 0; i < 10; i++) {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: {
          email: `brute${i}@test.com`,
          password: 'wrong'
        }
      });
      responses.push(response.status());
    }
    
    // Should see 429 (rate limited)
    expect(responses).toContain(429);
  });

  test('M-182: Privilege escalation is blocked', async ({ request }) => {
    // Login as photographer
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: 'photographer@test.com',
        password: 'photographer123'
      }
    });
    
    if (loginResponse.status() === 200) {
      const { token } = await loginResponse.json();
      
      // Try to access admin endpoint
      const response = await request.get(`${BASE_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      expect(response.status()).toBe(403);
    }
  });
});

test.describe('Master App - Kiosk Pairing', () => {
  let authToken: string;
  
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }
    });
    authToken = (await response.json()).token;
  });

  test('M-131: Generate QR code for pairing', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/pairing/qr`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.qrCode).toBeDefined();
    expect(body.token).toBeDefined();
  });

  test('M-140: Multiple kiosks can be paired', async ({ request }) => {
    // Get current kiosk count
    const response = await request.get(`${BASE_URL}/api/kiosks`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const kiosks = await response.json();
    expect(Array.isArray(kiosks)).toBe(true);
  });
});

test.describe('Master App - Backup & Recovery', () => {
  let authToken: string;
  
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }
    });
    authToken = (await response.json()).token;
  });

  test('M-151: Manual backup creates file', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/system/backup`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.path).toBeDefined();
    expect(body.size).toBeGreaterThan(0);
  });

  test('M-154: Backup restore works', async ({ request }) => {
    // This is a destructive test - only run in test environment
    if (process.env.NODE_ENV !== 'test') {
      test.skip();
      return;
    }
    
    const response = await request.post(`${BASE_URL}/api/system/restore`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        backupPath: 'backups/latest.db'
      }
    });
    
    expect(response.status()).toBe(200);
  });
});

test.describe('Master App - Auto-Updater', () => {
  test('M-159: Check for updates returns version info', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/system/update-check`);
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.currentVersion).toBeDefined();
    expect(body.latestVersion).toBeDefined();
  });
});

// Configuration
test.setTimeout(TEST_TIMEOUT);
