if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3-multiple-ciphers';
import { DatabaseManager } from '../database/db';
import mobileShareRoutes from './mobileShareRoutes';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('Mobile Share Routes (QR Code Instant Send to Phone)', () => {
  let app: express.Application;
  let dbManager: DatabaseManager;
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(':memory:');

    dbManager = {
      get: (sql: string, params: any[]) => db.prepare(sql).get(...(params || [])),
      run: (sql: string, params: any[]) => db.prepare(sql).run(...(params || [])),
      query: (sql: string, params: any[]) => db.prepare(sql).all(...(params || [])),
      transaction: (fn: () => void) => db.transaction(fn)(),
    } as any;

    app = express();
    app.use(express.json());
    app.use('/api/mobile-share', mobileShareRoutes({
      dbManager,
      logger: mockLogger as any,
    }));
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    db.exec('DELETE FROM mobile_share_sessions');
  });

  it('POST /api/mobile-share/create-session creates a share session and returns QR data URL', async () => {
    const res = await request(app)
      .post('/api/mobile-share/create-session')
      .send({
        photoIds: ['photo_1', 'photo_2'],
        albumId: 'album_123',
        expiresMinutes: 30,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.shareUrl).toContain(res.body.token);
    expect(res.body.qrCodeDataUrl).toBe("");
    expect(res.body.expiresAt).toBeGreaterThan(Date.now());
  });

  it('POST /api/mobile-share/create-session fails with 400 when missing photoIds and albumId and galleryUrl', async () => {
    const res = await request(app)
      .post('/api/mobile-share/create-session')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/mobile-share/session/:token retrieves valid session details', async () => {
    const createRes = await request(app)
      .post('/api/mobile-share/create-session')
      .send({
        photoIds: ['photo_abc'],
        albumId: 'album_xyz',
      });

    const token = createRes.body.token;

    const getRes = await request(app).get(`/api/mobile-share/session/${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.valid).toBe(true);
    expect(getRes.body.token).toBe(token);
    expect(getRes.body.photoIds).toEqual(['photo_abc']);
    expect(getRes.body.albumId).toBe('album_xyz');
  });

  it('GET /api/mobile-share/session/:token returns 404 for non-existent token', async () => {
    const res = await request(app).get('/api/mobile-share/session/invalid_token_999');
    expect(res.status).toBe(404);
    expect(res.body.valid).toBe(false);
  });

  it('GET /api/mobile-share/session/:token returns 404 and cleans up expired token', async () => {
    // Manually insert expired token
    db.prepare(`
      INSERT INTO mobile_share_sessions (token, photoIds, albumId, expiresAt, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run('expired_tok', '["p1"]', 'a1', Date.now() - 10000, Date.now() - 20000);

    const res = await request(app).get('/api/mobile-share/session/expired_tok');
    expect(res.status).toBe(404);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toContain('expired');

    // Ensure deleted from db
    const row = db.prepare('SELECT * FROM mobile_share_sessions WHERE token = ?').get('expired_tok');
    expect(row).toBeUndefined();
  });

  it('POST /api/mobile-share/send-sms sends link to phone number when token is valid', async () => {
    const createRes = await request(app)
      .post('/api/mobile-share/create-session')
      .send({ photoIds: ['p_sms'] });

    const token = createRes.body.token;

    const smsRes = await request(app)
      .post('/api/mobile-share/send-sms')
      .send({ token, phoneNumber: '555-123-4567' });

    expect(smsRes.status).toBe(200);
    expect(smsRes.body.success).toBe(true);
    expect(smsRes.body.message).toContain('SMS sent to');
  });

  it('DELETE /api/mobile-share/session/:token revokes token', async () => {
    const createRes = await request(app)
      .post('/api/mobile-share/create-session')
      .send({ photoIds: ['p_del'] });

    const token = createRes.body.token;

    const delRes = await request(app).delete(`/api/mobile-share/session/${token}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const getRes = await request(app).get(`/api/mobile-share/session/${token}`);
    expect(getRes.status).toBe(404);
  });
});
