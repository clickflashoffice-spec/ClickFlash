import { vi, describe, it, test, expect, beforeEach, beforeAll, afterAll } from 'vitest';
if (typeof TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3-multiple-ciphers';
import { DatabaseManager } from '../database/db';
import pairingRoutes from '../routes/pairing';
import crypto from 'crypto';

const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
};

const mockAuditLogger = {
    logLoginAttempt: vi.fn()
};

describe('Touch pairing flow', () => {
    let app: express.Application;
    let dbManager: DatabaseManager;
    let db: Database.Database;

    beforeAll(() => {
        // Setup In-Memory DB for testing
        db = new Database(':memory:');

        // Initialize Schema (pairings table)
        db.exec(`
            CREATE TABLE IF NOT EXISTS pairings (
                kiosk_id      TEXT PRIMARY KEY,
                mac           TEXT,
                ip            TEXT,
                hmac_secret   TEXT NOT NULL,
                tenant_id     TEXT,
                paired_at     INTEGER NOT NULL,
                last_seen     INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_pairings_last_seen ON pairings(last_seen);
        `);

        // Mock DatabaseManager to use our in-memory DB
        dbManager = {
            get: (sql: string, params: any[]) => db.prepare(sql).get(...params),
            run: (sql: string, params: any[]) => db.prepare(sql).run(...params),
            query: (sql: string, params: any[]) => db.prepare(sql).all(...params),
            transaction: (fn: () => void) => db.transaction(fn)()
        } as any;

        // Setup App
        app = express();
        app.use(express.json());
        app.use('/api', pairingRoutes({
            dbManager,
            logger: mockLogger as any,
            auditLogger: mockAuditLogger as any
        }));
    });

    afterAll(() => {
        db.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear pairings table between tests
        db.exec('DELETE FROM pairings');
    });

    it('issues a challenge with a nonce', async () => {
        const res = await request(app)
            .get('/api/v1/pairing/challenge')
            .set('x-desk-id', 'TEST_DESK_01');

        expect(res.status).toBe(200);
        expect(res.body.nonce).toBeDefined();
        expect(res.body.nonce.length).toBeGreaterThan(40);
        expect(res.body.desk_id).toBe('TEST_DESK_01');
        expect(res.body.expires_at).toBeDefined();
        expect(res.body.algorithm).toBe('HMAC-SHA256');
    });

    it('exchanges a signed challenge for a per-kiosk HMAC secret', async () => {
        // 1. Get challenge
        const challengeRes = await request(app)
            .get('/api/v1/pairing/challenge')
            .set('x-desk-id', 'TEST_DESK_01');

        const { nonce, desk_id } = challengeRes.body;
        const kioskId = 'KIOSK_TEST_01';
        const hardwareFingerprint = 'sha256:' + 'a'.repeat(64);

        // 2. Compute valid HMAC signature
        const signature = crypto
            .createHmac('sha256', `${desk_id}|${hardwareFingerprint}`)
            .update(`${kioskId}|${nonce}`)
            .digest('base64');

        // 3. Exchange
        const exchangeRes = await request(app)
            .post('/api/v1/pairing/exchange')
            .send({
                kiosk_id: kioskId,
                nonce,
                signature,
                hardware_fingerprint: hardwareFingerprint,
                tenant_id: 'test-tenant'
            });

        expect(exchangeRes.status).toBe(200);
        expect(exchangeRes.body.hmac_secret).toBeDefined();
        expect(exchangeRes.body.hmac_secret.length).toBeGreaterThan(40);
        expect(exchangeRes.body.tenant_id).toBe('test-tenant');
        expect(exchangeRes.body.desk_id).toBe('TEST_DESK_01');
        expect(exchangeRes.body.algorithm).toBe('HMAC-SHA256');

        // 4. Verify persisted in DB
        const row = db.prepare('SELECT * FROM pairings WHERE kiosk_id = ?').get(kioskId) as any;
        expect(row).toBeDefined();
        expect(row.hmac_secret).toBe(exchangeRes.body.hmac_secret);
        expect(row.tenant_id).toBe('test-tenant');
    });

    it('rejects an invalid signature', async () => {
        // 1. Get challenge
        const challengeRes = await request(app)
            .get('/api/v1/pairing/challenge')
            .set('x-desk-id', 'TEST_DESK_01');

        const { nonce } = challengeRes.body;
        const hardwareFingerprint = 'sha256:' + 'a'.repeat(64);

        // 2. Send invalid signature
        const exchangeRes = await request(app)
            .post('/api/v1/pairing/exchange')
            .send({
                kiosk_id: 'KIOSK_TEST_01',
                nonce,
                signature: 'invalidsignature',
                hardware_fingerprint: hardwareFingerprint,
            });

        expect(exchangeRes.status).toBe(400); // zod validation fails (signature too short)
    });

    it('rejects an unknown nonce', async () => {
        const exchangeRes = await request(app)
            .post('/api/v1/pairing/exchange')
            .send({
                kiosk_id: 'KIOSK_TEST_01',
                nonce: 'AAAAAAAAAAAAAAAAAAAAAA==',
                signature: 'a'.repeat(44),
                hardware_fingerprint: 'sha256:' + 'a'.repeat(64),
            });

        expect(exchangeRes.status).toBe(401);
        expect(exchangeRes.body.error).toContain('Invalid or expired nonce');
    });

    it('rejects a reused nonce', async () => {
        // 1. Get challenge
        const challengeRes = await request(app)
            .get('/api/v1/pairing/challenge')
            .set('x-desk-id', 'TEST_DESK_01');

        const { nonce, desk_id } = challengeRes.body;
        const kioskId = 'KIOSK_TEST_01';
        const hardwareFingerprint = 'sha256:' + 'a'.repeat(64);

        const signature = crypto
            .createHmac('sha256', `${desk_id}|${hardwareFingerprint}`)
            .update(`${kioskId}|${nonce}`)
            .digest('base64');

        // 2. First exchange succeeds
        const firstRes = await request(app)
            .post('/api/v1/pairing/exchange')
            .send({
                kiosk_id: kioskId,
                nonce,
                signature,
                hardware_fingerprint: hardwareFingerprint,
            });
        expect(firstRes.status).toBe(200);

        // 3. Second exchange with same nonce fails
        const secondRes = await request(app)
            .post('/api/v1/pairing/exchange')
            .send({
                kiosk_id: kioskId,
                nonce,
                signature,
                hardware_fingerprint: hardwareFingerprint,
            });
        expect(secondRes.status).toBe(401);
        expect(secondRes.body.error).toContain('Invalid or expired nonce');
    });

    it('lists paired kiosks', async () => {
        // Pair a kiosk first
        const challengeRes = await request(app)
            .get('/api/v1/pairing/challenge')
            .set('x-desk-id', 'TEST_DESK_01');

        const { nonce, desk_id } = challengeRes.body;
        const kioskId = 'KIOSK_LIST_01';
        const hardwareFingerprint = 'sha256:' + 'a'.repeat(64);

        const signature = crypto
            .createHmac('sha256', `${desk_id}|${hardwareFingerprint}`)
            .update(`${kioskId}|${nonce}`)
            .digest('base64');

        await request(app)
            .post('/api/v1/pairing/exchange')
            .send({
                kiosk_id: kioskId,
                nonce,
                signature,
                hardware_fingerprint: hardwareFingerprint,
            });

        // List
        const listRes = await request(app).get('/api/v1/pairing');
        expect(listRes.status).toBe(200);
        expect(listRes.body.pairings).toBeDefined();
        expect(listRes.body.pairings.length).toBe(1);
        expect(listRes.body.pairings[0].kiosk_id).toBe(kioskId);
    });
});
