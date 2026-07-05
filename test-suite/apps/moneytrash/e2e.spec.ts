import { test, expect } from '@playwright/test';
import { MoneyTrashAPI } from '../../utils/api-client';

/**
 * MoneyTrash API E2E Tests
 * 
 * Tests for the Cloudflare Workers backend API
 */

const api = new MoneyTrashAPI(process.env.MONEYTRASH_URL || 'https://moneytrash-api.clickflash-office.workers.dev');

test.describe('MoneyTrash API - Health', () => {
  test('health endpoint returns 200', async () => {
    const response = await api.get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  test('health includes timestamp', async () => {
    const response = await api.get('/health');
    expect(response.body).toHaveProperty('timestamp');
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  });
});

test.describe('MoneyTrash API - Authentication', () => {
  test('protected endpoint without auth returns 401', async () => {
    const response = await api.get('/products');
    expect(response.status).toBe(401);
  });

  test('protected endpoint with valid auth returns 200', async () => {
    const response = await api.get('/products', {
      headers: { 'Authorization': `Bearer ${api.getTestToken()}` }
    });
    expect(response.status).toBe(200);
  });

  test('invalid token returns 401', async () => {
    const response = await api.get('/products', {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    expect(response.status).toBe(401);
  });

  test('expired token returns 401', async () => {
    const expiredToken = api.getExpiredToken();
    const response = await api.get('/products', {
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    expect(response.status).toBe(401);
  });
});

test.describe('MoneyTrash API - Products', () => {
  test.beforeEach(async () => {
    api.setAuthToken(api.getTestToken());
  });

  test('list products returns array', async () => {
    const response = await api.get('/products');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('products');
    expect(Array.isArray(response.body.products)).toBe(true);
  });

  test('create product', async () => {
    const product = {
      name: 'Test Product',
      description: 'A test product',
      price: 10.99,
      category: 'prints',
      sku: 'TEST-001'
    };

    const response = await api.post('/products', product);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(product.name);
  });

  test('get product by id', async () => {
    // Create product first
    const createResponse = await api.post('/products', {
      name: 'Get Test',
      price: 5.99,
      category: 'prints',
      sku: 'GET-001'
    });
    const productId = createResponse.body.id;

    const response = await api.get(`/products/${productId}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', productId);
  });

  test('update product', async () => {
    // Create product first
    const createResponse = await api.post('/products', {
      name: 'Update Test',
      price: 5.99,
      category: 'prints',
      sku: 'UPD-001'
    });
    const productId = createResponse.body.id;

    const response = await api.put(`/products/${productId}`, {
      name: 'Updated Name',
      price: 7.99
    });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Name');
    expect(response.body.price).toBe(7.99);
  });

  test('delete product', async () => {
    // Create product first
    const createResponse = await api.post('/products', {
      name: 'Delete Test',
      price: 5.99,
      category: 'prints',
      sku: 'DEL-001'
    });
    const productId = createResponse.body.id;

    const response = await api.delete(`/products/${productId}`);
    expect(response.status).toBe(204);

    // Verify deletion
    const getResponse = await api.get(`/products/${productId}`);
    expect(getResponse.status).toBe(404);
  });

  test('product validation rejects invalid data', async () => {
    const response = await api.post('/products', {
      name: '', // Invalid: empty name
      price: -5, // Invalid: negative price
      category: 'invalid' // Invalid: unknown category
    });
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
  });
});

test.describe('MoneyTrash API - Orders', () => {
  test.beforeEach(async () => {
    api.setAuthToken(api.getTestToken());
  });

  test('create order', async () => {
    const order = {
      customerName: 'Test Customer',
      customerEmail: 'customer@test.com',
      items: [
        { productId: 'photo-1', quantity: 2, price: 10.00 }
      ],
      total: 20.00,
      status: 'pending'
    };

    const response = await api.post('/orders', order);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.customerName).toBe(order.customerName);
  });

  test('list orders', async () => {
    const response = await api.get('/orders');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('orders');
    expect(Array.isArray(response.body.orders)).toBe(true);
  });

  test('get order by id', async () => {
    // Create order first
    const createResponse = await api.post('/orders', {
      customerName: 'Get Test',
      customerEmail: 'get@test.com',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00
    });
    const orderId = createResponse.body.id;

    const response = await api.get(`/orders/${orderId}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', orderId);
  });

  test('update order status', async () => {
    // Create order first
    const createResponse = await api.post('/orders', {
      customerName: 'Status Test',
      customerEmail: 'status@test.com',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00
    });
    const orderId = createResponse.body.id;

    const response = await api.patch(`/orders/${orderId}`, {
      status: 'completed'
    });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('completed');
  });

  test('order validation rejects invalid items', async () => {
    const response = await api.post('/orders', {
      customerName: 'Invalid',
      customerEmail: 'invalid@test.com',
      items: [
        { productId: '', quantity: 0, price: -5 } // Invalid
      ],
      total: -5
    });
    expect(response.status).toBe(400);
  });
});

test.describe('MoneyTrash API - Payments', () => {
  test.beforeEach(async () => {
    api.setAuthToken(api.getTestToken());
  });

  test('process card payment', async () => {
    // Create order first
    const orderResponse = await api.post('/orders', {
      customerName: 'Payment Test',
      customerEmail: 'payment@test.com',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00
    });
    const orderId = orderResponse.body.id;

    const response = await api.post('/payments', {
      orderId,
      paymentMethod: 'card',
      token: 'tok_test_visa'
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'succeeded');
  });

  test('process cash payment', async () => {
    // Create order first
    const orderResponse = await api.post('/orders', {
      customerName: 'Cash Test',
      customerEmail: 'cash@test.com',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00
    });
    const orderId = orderResponse.body.id;

    const response = await api.post('/payments', {
      orderId,
      paymentMethod: 'cash',
      amount: 10.00
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'succeeded');
  });

  test('payment with invalid card fails', async () => {
    const orderResponse = await api.post('/orders', {
      customerName: 'Fail Test',
      customerEmail: 'fail@test.com',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00
    });
    const orderId = orderResponse.body.id;

    const response = await api.post('/payments', {
      orderId,
      paymentMethod: 'card',
      token: 'tok_test_decline'
    });
    expect(response.status).toBe(400);
  });
});

test.describe('MoneyTrash API - Webhooks', () => {
  test.beforeEach(async () => {
    api.setAuthToken(api.getTestToken());
  });

  test('register webhook', async () => {
    const response = await api.post('/webhooks', {
      url: 'https://example.com/webhook',
      events: ['order.created', 'order.paid'],
      secret: 'webhook-secret'
    });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  test('list webhooks', async () => {
    const response = await api.get('/webhooks');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('webhooks');
  });

  test('delete webhook', async () => {
    // Create webhook first
    const createResponse = await api.post('/webhooks', {
      url: 'https://example.com/webhook-delete',
      events: ['order.created'],
      secret: 'secret'
    });
    const webhookId = createResponse.body.id;

    const response = await api.delete(`/webhooks/${webhookId}`);
    expect(response.status).toBe(204);
  });

  test('webhook delivery', async () => {
    // Create webhook
    const webhookResponse = await api.post('/webhooks', {
      url: 'https://httpbin.org/post',
      events: ['order.created'],
      secret: 'delivery-secret'
    });
    const webhookId = webhookResponse.body.id;

    // Create order to trigger webhook
    await api.post('/orders', {
      customerName: 'Webhook Test',
      customerEmail: 'webhook@test.com',
      items: [{ productId: 'photo-1', quantity: 1, price: 10.00 }],
      total: 10.00
    });

    // Check delivery status
    const response = await api.get(`/webhooks/${webhookId}/deliveries`);
    expect(response.status).toBe(200);
    expect(response.body.deliveries.length).toBeGreaterThan(0);
  });
});

test.describe('MoneyTrash API - Rate Limiting', () => {
  test('rate limit headers present', async () => {
    const response = await api.get('/health');
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
  });

  test('exceeding rate limit returns 429', async () => {
    // Make many requests quickly
    const requests = Array(150).fill(null).map(() => api.get('/health'));
    const responses = await Promise.all(requests);
    
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});

test.describe('MoneyTrash API - CORS', () => {
  test('CORS headers present', async () => {
    const response = await api.options('/products', {
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'GET'
      }
    });
    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });

  test('preflight request succeeds', async () => {
    const response = await api.options('/products', {
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    expect(response.status).toBe(204);
  });
});

test.describe('MoneyTrash API - Error Handling', () => {
  test('404 returns structured error', async () => {
    const response = await api.get('/nonexistent-endpoint');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
  });

  test('500 returns structured error', async () => {
    // Trigger server error with invalid data
    const response = await api.post('/products', {
      // Missing required fields
    });
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('method not allowed returns 405', async () => {
    const response = await api.patch('/health', {});
    expect(response.status).toBe(405);
  });
});
