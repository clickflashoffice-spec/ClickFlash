import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../backend/app';
import { initializeDatabase, closeDatabase, resetDatabase } from '../mocks/database';
import { syncServer, closeServer } from '../mocks/server';

let app: Express;

beforeAll(async () => {
  initializeDatabase();
  app = await createApp();
  await new Promise(resolve => setTimeout(resolve, 500));
});

afterEach(() => {
  resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
  await closeServer();
  await new Promise(resolve => setTimeout(resolve, 500));
});

describe('Health Endpoints', () => {
  it('GET /api/system/health should return healthy status', async () => {
    const res = await request(app)
      .get('/api/system/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/system/health should include timestamp', async () => {
    const res = await request(app)
      .get('/api/system/health')
      .expect(200);

    expect(res.body).toHaveProperty('timestamp');
    expect(new Date(res.body.timestamp)).toBeInstanceOf(Date);
  });
});

describe('Auth Endpoints', () => {
  it('POST /api/auth/login should authenticate valid user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@localhost',
        password: 'admin123',
      })
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('email');
  });

  it('POST /api/auth/login should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@localhost',
        password: 'wrongpassword',
      })
      .expect(401);

    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/login should validate email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid-email',
        password: 'password',
      })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('GET /api/auth/session should return current session', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@localhost',
        password: 'admin123',
      });

    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/auth/session')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('user');
  });
});

describe('Album Endpoints', () => {
  let authToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@localhost',
        password: 'admin123',
      });
    authToken = loginRes.body.token;
  });

  it('GET /api/collections/albums should return album list', async () => {
    const res = await request(app)
      .get('/api/collections/albums')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/collections/albums should create new album', async () => {
    const res = await request(app)
      .post('/api/collections/albums')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Album',
        description: 'Test Description',
        eventDate: new Date().toISOString(),
      })
      .expect(201);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('name', 'Test Album');
  });

  it('GET /api/collections/albums/:id should return specific album', async () => {
    const createRes = await request(app)
      .post('/api/collections/albums')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Specific Album',
        description: 'Test',
      });

    const albumId = createRes.body.data.id;

    const res = await request(app)
      .get(`/api/collections/albums/${albumId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('id', albumId);
  });

  it('PUT /api/collections/albums/:id should update album', async () => {
    const createRes = await request(app)
      .post('/api/collections/albums')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Original Name',
        description: 'Original',
      });

    const albumId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/collections/albums/${albumId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Name',
        description: 'Updated',
      })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('name', 'Updated Name');
  });

  it('DELETE /api/collections/albums/:id should delete album', async () => {
    const createRes = await request(app)
      .post('/api/collections/albums')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'To Delete',
      });

    const albumId = createRes.body.data.id;

    await request(app)
      .delete(`/api/collections/albums/${albumId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    await request(app)
      .get(`/api/collections/albums/${albumId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});

describe('Order Endpoints', () => {
  let authToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@localhost',
        password: 'admin123',
      });
    authToken = loginRes.body.token;
  });

  it('GET /api/orders should return order list', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/orders should create new order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientName: 'Test Client',
        clientEmail: 'client@test.com',
        items: [
          { type: 'print', quantity: 1, size: '8x10' },
        ],
      })
      .expect(201);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('clientName', 'Test Client');
  });

  it('POST /api/orders should validate required fields', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientName: 'Test Client',
      })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('GET /api/orders/:id should return specific order', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientName: 'Specific Client',
        clientEmail: 'specific@test.com',
        items: [],
      });

    const orderId = createRes.body.data.id;

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('id', orderId);
  });

  it('PUT /api/orders/:id/status should update order status', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientName: 'Status Test',
        clientEmail: 'status@test.com',
        items: [],
      });

    const orderId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'processing' })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
  });
});

describe('Sync Endpoints', () => {
  let authToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@localhost',
        password: 'admin123',
      });
    authToken = loginRes.body.token;
  });

  it('POST /api/sync should accept sync data from kiosk', async () => {
    const res = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        kioskId: 'test-kiosk-001',
        lastSyncTimestamp: new Date(Date.now() - 3600000).toISOString(),
        photos: [
          { id: 'photo-1', status: 'approved', rating: 5 },
          { id: 'photo-2', status: 'rejected', rating: 1 },
        ],
      })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('syncedCount');
    expect(res.body).toHaveProperty('conflicts');
  });

  it('POST /api/sync should detect conflicts', async () => {
    const res = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        kioskId: 'test-kiosk-001',
        photos: [
          { id: 'photo-1', status: 'approved', rating: 5, version: 1 },
        ],
      })
      .expect(200);

    expect(res.body).toHaveProperty('conflicts');
    expect(Array.isArray(res.body.conflicts)).toBe(true);
  });

  it('POST /api/sync should validate kioskId', async () => {
    const res = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        photos: [],
      })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });
});

describe('Face Recognition Endpoints', () => {
  let authToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@localhost',
        password: 'admin123',
      });
    authToken = loginRes.body.token;
  });

  it('GET /api/faces should return face list', async () => {
    const res = await request(app)
      .get('/api/faces')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/faces/search should search faces', async () => {
    const res = await request(app)
      .post('/api/faces/search')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        minConfidence: 0.7,
      })
      .expect(200);

    expect(res.body).toHaveProperty('data');
  });

  it('POST /api/faces/reindex should trigger reindexing', async () => {
    const res = await request(app)
      .post('/api/faces/reindex')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('jobId');
  });
});

describe('Culling Endpoints', () => {
  let authToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@localhost',
        password: 'admin123',
      });
    authToken = loginRes.body.token;
  });

  it('POST /api/culling/analyze should analyze photos', async () => {
    const res = await request(app)
      .post('/api/culling/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        albumId: 'test-album',
        criteria: {
          sharpness: true,
          brightness: true,
          faces: true,
        },
      })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('results');
  });

  it('POST /api/culling/batch should batch cull photos', async () => {
    const res = await request(app)
      .post('/api/culling/batch')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        photoIds: ['photo-1', 'photo-2', 'photo-3'],
        action: 'approve',
      })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('processed');
  });
});

describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app)
      .get('/api/unknown/route')
      .expect(404);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 401 for unauthorized requests', async () => {
    const res = await request(app)
      .get('/api/collections/albums')
      .expect(401);

    expect(res.body).toHaveProperty('error');
  });

  it('should handle malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }')
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should handle missing required fields', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer invalid`)
      .send({})
      .expect(401);
  });
});

describe('Database Transactions', () => {
  let authToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@localhost',
        password: 'admin123',
      });
    authToken = loginRes.body.token;
  });

  it('should rollback on partial failure', async () => {
    const initialCount = await request(app)
      .get('/api/collections/albums')
      .set('Authorization', `Bearer ${authToken}`);

    const initialLength = initialCount.body.data.length;

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientName: 'Rollback Test',
        invalidField: 'this should cause error',
      });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const afterCount = await request(app)
      .get('/api/collections/albums')
      .set('Authorization', `Bearer ${authToken}`);

    expect(afterCount.body.data.length).toBe(initialLength);
  });
});
