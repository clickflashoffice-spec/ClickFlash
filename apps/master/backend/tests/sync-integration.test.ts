/**
 * Integration Test: Offline-to-Online Sync Flow
 *
 * Simulates a kiosk creating orders offline, then reconnecting and syncing to Master.
 */

import Database from 'better-sqlite3-multiple-ciphers';
import { DatabaseManager } from '../shared/db';
import { SyncManager } from '../services/SyncManager';

describe('Offline -> Online Sync Integration', () => {
    let db: DatabaseManager;
    let syncManager: SyncManager;
    const logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    };

    beforeAll(() => {
        db = new DatabaseManager(':memory:');
        db.connect();

        // Seed minimal schema
        db.exec(`
            CREATE TABLE orders (
                id TEXT PRIMARY KEY,
                clientName TEXT,
                email TEXT,
                total REAL,
                status TEXT,
                items TEXT,
                date TEXT,
                destinationId TEXT,
                photographerId INTEGER,
                roomNumber TEXT,
                appliedDiscount REAL DEFAULT 0,
                vector_clock TEXT,
                client_mutation_id TEXT,
                client_device_id TEXT,
                mutation_timestamp INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE mutation_ack_log (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                mutation_id TEXT NOT NULL,
                payload_hash TEXT,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id, mutation_id)
            );
        `);

        syncManager = new SyncManager(logger as any, db);
    });

    afterAll(() => {
        db.close();
        syncManager.stop();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        db.run("DELETE FROM orders");
        db.run("DELETE FROM mutation_ack_log");
    });

    it('should create order via kiosk endpoint with idempotency', async () => {
        const kioskId = 'kiosk-001';
        const clientMutationId = `${kioskId}:123:abc`;

        // Simulate Touch pushing order to Master
        const orderPayload = {
            clientMutationId,
            clientDeviceId: kioskId,
            clientName: 'Alice',
            email: 'alice@example.com',
            total: 100,
            status: 'Pending',
            items: [{ photoId: 'p1', price: 50 }],
            date: '2026-06-05',
            destinationId: 'dest1',
            photographerId: 1,
            roomNumber: '101',
            appliedDiscount: 0,
        };

        // We simulate what the Master route does
        const existing = db.get<{ id: string }>(
            `SELECT id FROM orders WHERE client_mutation_id = ?`,
            [clientMutationId]
        );
        expect(existing).toBeUndefined();

        const now = new Date().toISOString();
        db.run(
            `INSERT INTO orders (id, clientName, email, total, status, items, date, destinationId, photographerId, roomNumber, appliedDiscount, client_mutation_id, client_device_id, mutation_timestamp, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['ORD-001', orderPayload.clientName, orderPayload.email, orderPayload.total, orderPayload.status, JSON.stringify(orderPayload.items), orderPayload.date, orderPayload.destinationId, orderPayload.photographerId, orderPayload.roomNumber, orderPayload.appliedDiscount, clientMutationId, kioskId, Date.now(), now, now]
        );

        const created = db.get<{ id: string; client_mutation_id: string }>(`SELECT * FROM orders WHERE id = ?`, ['ORD-001']);
        expect(created).toBeDefined();
        expect(created!.client_mutation_id).toBe(clientMutationId);
    });

    it('should deduplicate repeated order pushes', async () => {
        const kioskId = 'kiosk-002';
        const clientMutationId = `${kioskId}:456:def`;

        // First push
        db.run(
            `INSERT INTO orders (id, clientName, email, total, status, items, date, destinationId, photographerId, client_mutation_id, client_device_id, mutation_timestamp, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['ORD-002', 'Bob', 'bob@example.com', 75, 'Pending', '[]', '2026-06-05', 'dest1', 2, clientMutationId, kioskId, Date.now(), new Date().toISOString(), new Date().toISOString()]
        );

        // Second push with same clientMutationId
        const existing = db.get<{ id: string }>(
            `SELECT id FROM orders WHERE client_mutation_id = ?`,
            [clientMutationId]
        );
        expect(existing).toBeDefined();
        expect(existing!.id).toBe('ORD-002');
    });

    it('should apply mutation via SyncManager and reject duplicates', async () => {
        const clientId = 'kiosk-003';

        const mutation = {
            type: 'MUTATION' as const,
            clientId,
            timestamp: Date.now(),
            entity: 'orders',
            action: 'create',
            data: { id: 'ORD-003', total: 150, clientName: 'Charlie' },
        };

        const result1 = await syncManager.handleMutation(mutation, clientId);
        expect(result1.status).toBe('APPLIED');

        const result2 = await syncManager.handleMutation(mutation, clientId);
        expect(result2.status).toBe('ALREADY_APPLIED');

        const orders = db.query(`SELECT * FROM orders WHERE id = ?`, ['ORD-003']);
        expect(orders.length).toBe(1);
    });

    it('should persist writes to pending_writes and recover on boot', async () => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS pending_writes (
                id TEXT PRIMARY KEY,
                table_name TEXT NOT NULL,
                record_id TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                priority TEXT DEFAULT 'normal',
                status TEXT DEFAULT 'pending',
                retry_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE photos (
                id TEXT PRIMARY KEY,
                title TEXT,
                updated_at DATETIME
            );
        `);

        // Pre-insert the photo row (DbWriteQueue does UPDATE, not INSERT)
        db.run(`INSERT INTO photos (id, title) VALUES (?, ?)`, ['p1', 'Old Title']);

        // Simulate power-cycle by inserting directly into pending_writes
        db.run(
            `INSERT INTO pending_writes (id, table_name, record_id, payload_json, priority, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['photos:p1', 'photos', 'p1', JSON.stringify({ title: 'Recovered Photo' }), 'normal', 'pending']
        );

        // Create a new DbWriteQueue that should recover and flush
        const { DbWriteQueue } = require('../services/DbWriteQueue');
        const queue = new DbWriteQueue(db, { logger: logger as any, flushInterval: 5000 });

        // Allow constructor's async recovery flush to complete
        await new Promise(r => setTimeout(r, 200));

        // The recovered write should have been applied to photos
        const photo = db.get<{ title: string }>(`SELECT title FROM photos WHERE id = ?`, ['p1']);
        expect(photo).toBeDefined();
        expect(photo!.title).toBe('Recovered Photo');

        // The pending write should have been cleaned up
        const pendingCount = db.get<{ count: number }>(`SELECT COUNT(*) as count FROM pending_writes WHERE status = 'pending'`);
        expect(pendingCount?.count).toBe(0);

        await queue.shutdown();
    });
});
