import { test, expect } from '@playwright/test';
import { APIClient } from '../../utils/api-client';

/**
 * Security E2E Tests
 * 
 * Comprehensive security testing for all ClickFlash apps
 */

const api = new APIClient(process.env.BASE_URL || 'https://moneytrash-api.clickflash-office.workers.dev');

test.describe('Security - XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '<svg onload=alert(1)>',
    '\x3cscript\x3ealert(1)\x3c/script\x3e',
    '<iframe src="javascript:alert(1)">',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<a href="javascript:alert(1)">click</a>',
    '<object data="javascript:alert(1)">'
  ];

  test.each(xssPayloads)('rejects XSS payload in album name: %s', async (payload) => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/albums', {
      name: payload,
      description: 'Test'
    });
    
    expect(response.status).toBe(400);
    if (response.body) {
      expect(response.body.name).not.toContain('<script>');
    }
  });

  test.each(xssPayloads)('rejects XSS payload in product name: %s', async (payload) => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/products', {
      name: payload,
      price: 10.99,
      category: 'prints',
      sku: 'XSS-001'
    });
    
    expect(response.status).toBe(400);
  });

  test.each(xssPayloads)('rejects XSS payload in customer name: %s', async (payload) => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/orders', {
      customerName: payload,
      customerEmail: 'test@test.com',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00
    });
    
    expect(response.status).toBe(400);
  });
});

test.describe('Security - SQL Injection Prevention', () => {
  const sqliPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE albums; --",
    "1 UNION SELECT * FROM users",
    "' AND 1=1 --",
    "\" OR \"1\"=\"1",
    "1; SELECT * FROM passwords",
    "' UNION SELECT null, username, password FROM users --",
    "1 AND 1=1",
    "1 AND 1=2",
    "1' AND '1'='1"
  ];

  test.each(sqliPayloads)('rejects SQLi in album ID: %s', async (payload) => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.get(`/albums/${encodeURIComponent(payload)}`);
    expect(response.status).toBe(400);
  });

  test.each(sqliPayloads)('rejects SQLi in product ID: %s', async (payload) => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.get(`/products/${encodeURIComponent(payload)}`);
    expect(response.status).toBe(400);
  });

  test.each(sqliPayloads)('rejects SQLi in order ID: %s', async (payload) => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.get(`/orders/${encodeURIComponent(payload)}`);
    expect(response.status).toBe(400);
  });

  test.each(sqliPayloads)('rejects SQLi in search query: %s', async (payload) => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.get(`/products?search=${encodeURIComponent(payload)}`);
    expect(response.status).toBe(400);
  });
});

test.describe('Security - Authentication', () => {
  test('rejects missing auth token', async () => {
    const response = await api.get('/products');
    expect(response.status).toBe(401);
  });

  test('rejects invalid auth token', async () => {
    const response = await api.get('/products', {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    expect(response.status).toBe(401);
  });

  test('rejects malformed auth header', async () => {
    const response = await api.get('/products', {
      headers: { 'Authorization': 'invalid-format' }
    });
    expect(response.status).toBe(401);
  });

  test('rejects expired token', async () => {
    const expiredToken = api.getExpiredToken();
    const response = await api.get('/products', {
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    expect(response.status).toBe(401);
  });

  test('rejects tampered token', async () => {
    const tamperedToken = api.getTestToken() + 'tampered';
    const response = await api.get('/products', {
      headers: { 'Authorization': `Bearer ${tamperedToken}` }
    });
    expect(response.status).toBe(401);
  });

  test('brute force protection', async () => {
    const attempts = [];
    for (let i = 0; i < 10; i++) {
      attempts.push(api.post('/auth/login', {
        email: 'admin@test.com',
        password: `wrong${i}`
      }));
    }
    
    const responses = await Promise.all(attempts);
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});

test.describe('Security - Authorization', () => {
  test('user cannot access admin endpoints', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.get('/admin/stats');
    expect(response.status).toBe(403);
  });

  test('user cannot access other user data', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.get('/users/other-user-id/orders');
    expect(response.status).toBe(403);
  });

  test('user cannot modify other user data', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.patch('/users/other-user-id', {
      name: 'Hacked'
    });
    expect(response.status).toBe(403);
  });

  test('photographer cannot access admin functions', async () => {
    api.setAuthToken('photographer-token');
    
    const response = await api.delete('/studios/studio-1');
    expect(response.status).toBe(403);
  });
});

test.describe('Security - Input Validation', () => {
  test('rejects oversized payload', async () => {
    api.setAuthToken(api.getTestToken());
    
    const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB
    const response = await api.post('/products', {
      name: largePayload,
      price: 10.99
    });
    
    expect(response.status).toBe(413);
  });

  test('rejects invalid email format', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/orders', {
      customerName: 'Test',
      customerEmail: 'invalid-email',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00
    });
    
    expect(response.status).toBe(400);
  });

  test('rejects negative price', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/products', {
      name: 'Test',
      price: -10.99,
      category: 'prints',
      sku: 'NEG-001'
    });
    
    expect(response.status).toBe(400);
  });

  test('rejects invalid date format', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/orders', {
      customerName: 'Test',
      customerEmail: 'test@test.com',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00,
      createdAt: 'invalid-date'
    });
    
    expect(response.status).toBe(400);
  });

  test('rejects path traversal in filename', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/upload', {
      filename: '../../../etc/passwd',
      content: 'test'
    });
    
    expect(response.status).toBe(400);
  });
});

test.describe('Security - Headers', () => {
  test('security headers present', async () => {
    const response = await api.get('/health');
    
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    
    expect(response.headers).toHaveProperty('x-frame-options');
    expect(response.headers['x-frame-options']).toBe('DENY');
    
    expect(response.headers).toHaveProperty('x-xss-protection');
    expect(response.headers).toHaveProperty('referrer-policy');
  });

  test('CSP header present', async () => {
    const response = await api.get('/health');
    
    expect(response.headers).toHaveProperty('content-security-policy');
    expect(response.headers['content-security-policy']).toBeTruthy();
  });

  test('HSTS header present', async () => {
    const response = await api.get('/health');
    
    expect(response.headers).toHaveProperty('strict-transport-security');
  });

  test('no server version disclosure', async () => {
    const response = await api.get('/health');
    
    expect(response.headers).not.toHaveProperty('x-powered-by');
    expect(response.headers).not.toHaveProperty('server');
  });
});

test.describe('Security - CORS', () => {
  test('CORS preflight for allowed origin', async () => {
    const response = await api.options('/products', {
      headers: {
        'Origin': 'https://clickflash.com',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://clickflash.com');
  });

  test('CORS rejects unauthorized origin', async () => {
    const response = await api.options('/products', {
      headers: {
        'Origin': 'https://evil.com',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    expect(response.headers['access-control-allow-origin']).not.toBe('https://evil.com');
  });

  test('CORS allows specific methods', async () => {
    const response = await api.options('/products', {
      headers: {
        'Origin': 'https://clickflash.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });
});

test.describe('Security - Rate Limiting', () => {
  test('rate limit headers present', async () => {
    const response = await api.get('/health');
    
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    expect(response.headers).toHaveProperty('x-ratelimit-reset');
  });

  test('exceeding rate limit returns 429', async () => {
    const requests = Array(150).fill(null).map(() => api.get('/health'));
    const responses = await Promise.all(requests);
    
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });

  test('rate limit resets after window', async () => {
    // Make requests up to limit
    for (let i = 0; i < 100; i++) {
      await api.get('/health');
    }
    
    // Wait for rate limit window to reset
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    const response = await api.get('/health');
    expect(response.status).toBe(200);
  });
});

test.describe('Security - File Upload', () => {
  test('rejects executable files', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/upload', {
      filename: 'malicious.exe',
      content: 'MZ' // Windows executable header
    });
    
    expect(response.status).toBe(400);
  });

  test('rejects oversized files', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/upload', {
      filename: 'large.jpg',
      content: 'x'.repeat(50 * 1024 * 1024) // 50MB
    });
    
    expect(response.status).toBe(413);
  });

  test('rejects double extensions', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/upload', {
      filename: 'photo.jpg.exe',
      content: 'test'
    });
    
    expect(response.status).toBe(400);
  });

  test('validates image content type', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/upload', {
      filename: 'photo.jpg',
      content: 'not-an-image',
      contentType: 'image/jpeg'
    });
    
    // Should validate actual content, not just extension
    expect(response.status).toBe(400);
  });
});

test.describe('Security - Session Management', () => {
  test('session expires after inactivity', async ({ page }) => {
    await page.goto('http://localhost:8090/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Wait for session to expire (mock)
    await page.waitForTimeout(3600000); // 1 hour
    
    await page.reload();
    await expect(page).toHaveURL('/login');
  });

  test('session invalidates on logout', async ({ page }) => {
    await page.goto('http://localhost:8090/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    await page.click('[data-testid="logout-button"]');
    
    // Try to access protected page
    await page.goto('http://localhost:8090/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('concurrent session handling', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    // Login on both
    await page1.goto('http://localhost:8090/login');
    await page1.fill('[data-testid="email-input"]', 'admin@test.com');
    await page1.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page1.click('[data-testid="login-button"]');
    
    await page2.goto('http://localhost:8090/login');
    await page2.fill('[data-testid="email-input"]', 'admin@test.com');
    await page2.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page2.click('[data-testid="login-button"]');
    
    // Both should be logged in
    await page1.waitForURL('/dashboard');
    await page2.waitForURL('/dashboard');
    
    await context1.close();
    await context2.close();
  });
});

test.describe('Security - Information Disclosure', () => {
  test('no stack traces in production', async () => {
    const response = await api.get('/nonexistent-endpoint');
    
    expect(response.status).toBe(404);
    if (response.body) {
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('trace');
    }
  });

  test('no database errors exposed', async () => {
    // Trigger a database error with invalid data
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/products', {
      // Missing required fields
    });
    
    expect(response.status).toBe(400);
    if (response.body) {
      const bodyStr = JSON.stringify(response.body);
      expect(bodyStr).not.toContain('SQL');
      expect(bodyStr).not.toContain('database');
      expect(bodyStr).not.toContain('table');
    }
  });

  test('no internal paths exposed', async () => {
    const response = await api.get('/nonexistent-endpoint');
    
    if (response.body) {
      const bodyStr = JSON.stringify(response.body);
      expect(bodyStr).not.toContain('/usr/');
      expect(bodyStr).not.toContain('/home/');
      expect(bodyStr).not.toContain('C:\\\\');
    }
  });
});

test.describe('Security - CSRF Protection', () => {
  test('requires CSRF token for state changes', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/orders', {
      customerName: 'CSRF Test',
      customerEmail: 'csrf@test.com',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00
    }, {
      headers: {
        'X-CSRF-Token': 'invalid'
      }
    });
    
    expect(response.status).toBe(403);
  });

  test('validates origin header', async () => {
    api.setAuthToken(api.getTestToken());
    
    const response = await api.post('/orders', {
      customerName: 'Origin Test',
      customerEmail: 'origin@test.com',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00
    }, {
      headers: {
        'Origin': 'https://evil.com'
      }
    });
    
    expect(response.status).toBe(403);
  });
});

test.describe('Security - API Key Management', () => {
  test('rejects invalid API key', async () => {
    const response = await api.get('/products', {
      headers: {
        'X-API-Key': 'invalid-key'
      }
    });
    
    expect(response.status).toBe(401);
  });

  test('rejects expired API key', async () => {
    const response = await api.get('/products', {
      headers: {
        'X-API-Key': 'expired-key'
      }
    });
    
    expect(response.status).toBe(401);
  });

  test('validates API key scope', async () => {
    // Read-only key trying to write
    const response = await api.post('/products', {
      name: 'Scope Test',
      price: 10.99
    }, {
      headers: {
        'X-API-Key': 'readonly-key'
      }
    });
    
    expect(response.status).toBe(403);
  });
});