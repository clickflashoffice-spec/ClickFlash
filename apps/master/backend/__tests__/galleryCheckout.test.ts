// Polyfill TextEncoder/TextDecoder for Node.js environment (needed for supertest/cuid2)
if (typeof TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3-multiple-ciphers';
import { DatabaseManager } from '../database/db';
import galleryCheckoutRoutes from '../routes/galleryCheckout';
import stripeService from '../services/stripeService';
import { logger } from '../utils/logger';

// Mock Stripe Service
jest.mock('../services/stripeService', () => ({
    constructWebhookEvent: jest.fn(),
    createCheckoutSession: jest.fn()
}));

const mockSyncManager = {
    broadcastOrderStatus: jest.fn()
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
};

describe('Gallery Checkout Webhook & Sync', () => {
    let app: express.Application;
    let dbManager: DatabaseManager;
    let db: Database.Database;

    beforeAll(() => {
        // Setup In-Memory DB for testing
        db = new Database(':memory:');

        // Initialize Schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS gallery_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT UNIQUE,
                albumId TEXT,
                customerEmail TEXT
            );

            CREATE TABLE IF NOT EXISTS gallery_orders (
                id TEXT PRIMARY KEY,
                tokenId INTEGER,
                customerEmail TEXT,
                items TEXT,
                total DECIMAL(10, 2),
                stripeSessionId TEXT,
                stripePaymentId TEXT,
                status TEXT DEFAULT 'pending',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME
            );
            
            CREATE TABLE IF NOT EXISTS processed_stripe_events (
                id TEXT PRIMARY KEY,
                type TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                date TEXT,
                clientName TEXT,
                email TEXT,
                status TEXT,
                total REAL,
                source TEXT,
                albumId TEXT,
                customerEmail TEXT,
                items JSON,
                paymentIntentId TEXT,
                created_at DATETIME
            );
            
            CREATE TABLE IF NOT EXISTS albums (
                id TEXT PRIMARY KEY,
                photographerId TEXT
            );
            
            CREATE TABLE IF NOT EXISTS photographer_ledger (
                id TEXT PRIMARY KEY,
                photographer_id TEXT,
                order_id TEXT,
                type TEXT,
                amount REAL,
                description TEXT,
                date TEXT
            );
        `);

        // Mock DatabaseManager to use our in-memory DB
        dbManager = {
            get: (sql: string, params: any[]) => db.prepare(sql).get(...params),
            run: (sql: string, params: any[]) => db.prepare(sql).run(...params),
            transaction: (fn: () => void) => db.transaction(fn)()
        } as any;

        // Setup App
        app = express();
        app.use('/api/gallery-checkout', galleryCheckoutRoutes({
            dbManager,
            logger: mockLogger as any,
            JWT_SECRET: 'test-secret',
            syncManager: mockSyncManager
        }));
    });

    afterAll(() => {
        db.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        db.prepare('DELETE FROM gallery_tokens').run();
        db.prepare('DELETE FROM gallery_orders').run();
        db.prepare('DELETE FROM orders').run();
        db.prepare('DELETE FROM albums').run();
    });

    test('should process paid order and sync to master (Law 08)', async () => {
        // 1. Setup Data
        const albumId = 'album_123';
        const tokenId = 1;
        const token = 'magic-token';
        const orderId = 'GLY_TEST_123';
        const sessionId = 'cs_test_123';
        const paymentIntentId = 'pi_test_123';

        db.prepare(`INSERT INTO albums (id, photographerId) VALUES (?, ?)`).run(albumId, 'photo_123');
        db.prepare(`INSERT INTO gallery_tokens (id, token, albumId, customerEmail) VALUES (?, ?, ?, ?)`).run(tokenId, token, albumId, 'customer@example.com');

        db.prepare(`INSERT INTO gallery_orders (id, tokenId, customerEmail, total, stripeSessionId, status, items) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
            orderId, tokenId, 'customer@example.com', 50.00, sessionId, 'pending', JSON.stringify([{ id: 'p1', price: 50 }])
        );

        // 2. Mock Stripe Event
        (stripeService.constructWebhookEvent as jest.Mock).mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    metadata: { orderId: orderId },
                    payment_intent: paymentIntentId
                }
            }
        });

        // 3. Trigger Webhook
        const res = await request(app)
            .post('/api/gallery-checkout/webhook')
            .set('stripe-signature', 'valid_signature')
            .send({}); // Body doesn't matter as we mock constructWebhookEvent

        if (res.status !== 200) logger.error("Webhook error response:", res.body);
        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);

        // 4. Verify Gallery Order Updated
        const galleryOrder = db.prepare('SELECT status, stripePaymentId FROM gallery_orders WHERE id = ?').get(orderId) as any;
        expect(galleryOrder.status).toBe('paid');
        expect(galleryOrder.stripePaymentId).toBe(paymentIntentId);

        // 5. Verify Master Order Created (Sync)
        const masterOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(`EXT_${orderId}`) as any;
        expect(masterOrder).toBeDefined();
        expect(masterOrder.source).toBe('gallery');
        expect(masterOrder.total).toBe(50);
        expect(masterOrder.paymentIntentId).toBe(paymentIntentId);
        expect(masterOrder.albumId).toBe(albumId);

        // 6. Verify Lab Notification Broadcast
        expect(mockSyncManager.broadcastOrderStatus).toHaveBeenCalledWith(`EXT_${orderId}`, 'Processing');
    });

    test('should be idempotent (not duplicate orders)', async () => {
        // 1. Setup Data (Already paid)
        const albumId = 'album_123';
        const tokenId = 1;
        const orderId = 'GLY_TEST_IDEMPOTENT';
        const sessionId = 'cs_test_idempotent';

        db.prepare(`INSERT INTO albums (id, photographerId) VALUES (?, ?)`).run(albumId, 'photo_123');
        db.prepare(`INSERT INTO gallery_tokens (id, token, albumId, customerEmail) VALUES (?, ?, ?, ?)`).run(tokenId, 'token', albumId, 'test@example.com');

        // Order is ALREADY PAID
        db.prepare(`INSERT INTO gallery_orders (id, tokenId, customerEmail, total, stripeSessionId, status, items) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
            orderId, tokenId, 'test@example.com', 50.00, sessionId, 'paid', '[]'
        );

        // 2. Mock Stripe Event
        (stripeService.constructWebhookEvent as jest.Mock).mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    metadata: { orderId: orderId },
                    payment_intent: 'pi_retry'
                }
            }
        });

        // 3. Trigger Webhook
        const res = await request(app)
            .post('/api/gallery-checkout/webhook')
            .set('stripe-signature', 'valid')
            .send({});

        // 4. Expect "already_processed" status
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('already_processed');

        // 5. Verify NO new insert into Orders for this ID
        // (We didn't seed orders, so it should be empty or definitely not have a new one)
        const masterOrders = db.prepare('SELECT * FROM orders').all();
        expect(masterOrders.length).toBe(0); // Should not sync again if already paid
    });
});
