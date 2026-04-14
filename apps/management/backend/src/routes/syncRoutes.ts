const express = require('express');
const router = express.Router();
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db');
const Logger = require('../logger');

// Configuration (passed via server.js usually, but we'll use a getter for consistency)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../pb_data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required. Cannot start without secure JWT secret.');
} 

const logger = new Logger(path.join(DATA_DIR, 'logs'));

/**
 * Middleware to verify Sync Token
 */
const verifySyncToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // We can attach desk info if needed
        req.desk = decoded;
        next();
    } catch (err) {
        logger.error('[Sync] Token verification failed', err);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// --- Routes ---

/**
 * Route: POST /api/cloud/sync-order OR /api/cloud/sync/order
 */
const syncOrderHandler = async (req, res) => {
    try {
        const body = req.body;
        // Support both direct order payload and wrapped { desk_id, order } payload from Master
        const orderData = body.order || body;
        const deskIdFromPayload = body.desk_id || orderData.deskId;
        const deskId = deskIdFromPayload || (req.desk && req.desk.desk_id) || 'UNKNOWN';

        logger.info(`[Sync] Received order ${orderData.orderNumber || orderData.id} from ${deskId}`);

        const db = getDatabase();

        // Save to DB
        // items is usually JSON
        const itemsJson = typeof orderData.items === 'string' ? orderData.items : JSON.stringify(orderData.items || []);

        db.prepare(`
            INSERT OR REPLACE INTO orders (
                id, date, clientName, email, status, total, photographerId, destinationId, paymentMethod, appliedDiscount, items, desk_id, original_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            orderData.id,
            orderData.date,
            orderData.clientName,
            orderData.email,
            orderData.status,
            orderData.total || orderData.totalAmount || 0,
            orderData.photographerId,
            orderData.destinationId || deskId,
            orderData.paymentMethod || 'UNKNOWN',
            orderData.appliedDiscount || 0,
            itemsJson,
            deskId,
            orderData.id
        );

        res.json({ success: true, id: orderData.id });
    } catch (e) {
        logger.error('[Sync] Failed to process order', e);
        res.status(500).json({ error: e.message });
    }
};

router.post('/cloud/sync-order', verifySyncToken, syncOrderHandler);
router.post('/cloud/sync/order', verifySyncToken, syncOrderHandler);

/**
 * Route: POST /api/cloud/sync/batch
 * Handles high-speed batch synchronization of metadata (albums, users, products)
 */
router.post('/cloud/sync/batch', verifySyncToken, async (req, res) => {
    try {
        const { table, items } = req.body;
        const deskId = req.desk.desk_id || 'UNKNOWN';

        if (!table || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid batch format. Expected { table: string, items: Array }' });
        }

        const db = getDatabase();
        const results = { synced: 0, errors: [] };

        // Whitelist of tables allowed for batch sync
        const allowedTables = ['albums', 'users', 'products', 'packs'];
        if (!allowedTables.includes(table)) {
            return res.status(400).json({ error: `Table '${table}' is not supported for batch sync` });
        }

        db.transaction(() => {
            const conflictCheck = db.prepare(`SELECT desk_id FROM ${table} WHERE id = ? OR original_id = ?`);
            const logConflict = db.prepare(`
                INSERT INTO sync_conflicts (table_name, record_id, existing_desk_id, incoming_desk_id)
                VALUES (?, ?, ?, ?)
            `);

            for (const item of items) {
                try {
                    const recordId = item.id || item.original_id;

                    // Conflict Detection: Look for existing record with different desk_id
                    const existing = conflictCheck.get(recordId, recordId);
                    if (existing && existing.desk_id && existing.desk_id !== deskId) {
                        logger.warn(`[Sync] Conflict detected for ${table}:${recordId}. Existing: ${existing.desk_id}, Incoming: ${deskId}`);
                        logConflict.run(table, recordId, existing.desk_id, deskId);
                    }

                    // Ensure desk_id is bound for MultiMaster
                    item.desk_id = deskId;

                    const keys = Object.keys(item);
                    const cols = keys.join(', ');
                    const vals = keys.map(k => `@${k}`).join(', ');

                    db.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${vals})`).run(item);
                    results.synced++;
                } catch (itemErr) {
                    results.errors.push({ id: item.id || item.original_id, error: itemErr.message });
                }
            }
        })();

        logger.info(`[Sync] Batch synced ${results.synced} ${table} for ${deskId}`);
        res.json({ success: true, ...results });
    } catch (e) {
        logger.error('[Sync] Batch sync failed', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Route: GET /api/cloud/poll-orders
 * Polling for orders that need fulfillment
 */
router.get('/cloud/poll-orders', verifySyncToken, async (req, res) => {
    try {
        const deskId = req.desk.desk_id || 'UNKNOWN';
        const db = getDatabase();

        // Optimized polling for paid but unfulfilled orders
        const orders = db.prepare(`
            SELECT * FROM orders 
            WHERE status = 'paid' 
            AND fulfillment_status = 'pending' 
            AND desk_id = ?
            ORDER BY created_at ASC
        `).all(deskId);

        res.json({ success: true, items: orders });
    } catch (e) {
        logger.error('[Sync] Order polling failed', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Route: PATCH /api/cloud/update-order/:id
 * Updates fulfillment status of an order
 */
router.patch('/cloud/update-order/:id', verifySyncToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { fulfillment_status } = req.body;
        const deskId = req.desk.desk_id || 'UNKNOWN';

        if (!fulfillment_status) {
            return res.status(400).json({ error: 'Missing fulfillment_status' });
        }

        const db = getDatabase();
        const result = db.prepare(`
            UPDATE orders 
            SET fulfillment_status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND desk_id = ?
        `).run(fulfillment_status, id, deskId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Order not found or unauthorized' });
        }

        logger.info(`[Sync] Updated order ${id} fulfillment_status to ${fulfillment_status} for ${deskId}`);
        res.json({ success: true });
    } catch (e) {
        logger.error('[Sync] Order status update failed', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Route: POST /api/cloud/upload-photo/chunk
 */
router.post('/cloud/upload-photo/chunk', verifySyncToken, (req, res) => {
    const tempDir = path.join(UPLOAD_DIR, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const form = new formidable.IncomingForm({
        uploadDir: tempDir,
        keepExtensions: true,
        maxFileSize: 100 * 1024 * 1024,
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            logger.error('[Sync] Chunk upload error', err);
            return res.status(500).json({ error: 'Chunk upload failed' });
        }

        const getField = (f) => Array.isArray(f) ? f[0] : f;
        const getFile = (f) => Array.isArray(f) ? f[0] : f;

        const file = getFile(files.file);
        const photoId = getField(fields.photoId);
        const orderId = getField(fields.orderId);
        const chunkIndex = parseInt(getField(fields.chunkIndex), 10);
        const totalChunks = parseInt(getField(fields.totalChunks), 10);
        const originalName = getField(fields.originalName);

        if (!photoId || isNaN(chunkIndex) || isNaN(totalChunks)) {
            return res.status(400).json({ error: 'Missing metadata' });
        }

        const chunkDir = path.join(tempDir, photoId);
        if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });

        const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);

        try {
            fs.copyFileSync(file.filepath, chunkPath);
            fs.unlinkSync(file.filepath);

            const receivedChunks = fs.readdirSync(chunkDir).filter(f => f.startsWith('chunk_'));

            if (receivedChunks.length === totalChunks) {
                logger.info(`[Sync] All chunks received for ${photoId}. Assembling...`);

                const targetDir = path.join(UPLOAD_DIR, 'photos', orderId);
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                const finalPath = path.join(targetDir, originalName || `${photoId}.jpg`);

                const writeStream = fs.createWriteStream(finalPath);

                for (let i = 0; i < totalChunks; i++) {
                    const partPath = path.join(chunkDir, `chunk_${i}`);
                    const buffer = fs.readFileSync(partPath);
                    writeStream.write(buffer);
                    fs.unlinkSync(partPath);
                }
                writeStream.end();

                writeStream.on('finish', () => {
                    fs.rmdirSync(chunkDir);

                    // Store metadata in DB
                    try {
                        const db = getDatabase();
                        db.prepare(`
                            INSERT OR REPLACE INTO photos (id, albumId, url, desk_id, original_id, created_at)
                            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        `).run(photoId, orderId, finalPath, req.desk.desk_id, photoId);

                        logger.info(`[Sync] Successfully assembled and registered photo ${photoId} for order ${orderId}`);
                        res.json({ success: true, assembled: true, path: finalPath });
                    } catch (dbErr) {
                        logger.error('[Sync] Failed to register assembled photo in DB', dbErr);
                        res.status(500).json({ error: 'DB registration failed' });
                    }
                });
            } else {
                res.json({ success: true, chunkReceived: chunkIndex, total: totalChunks });
            }
        } catch (moveErr) {
            logger.error('[Sync] Failed to process chunk', moveErr);
            res.status(500).json({ error: 'Chunk processing failed' });
        }
    });
});

/**
 * Route: POST /api/cloud/upload-photo
 */
router.post('/cloud/upload-photo', verifySyncToken, (req, res) => {
    const form = new formidable.IncomingForm({
        uploadDir: UPLOAD_DIR,
        keepExtensions: true,
        maxFileSize: 500 * 1024 * 1024,
        filter: ({ name, originalFilename, mimetype }) => mimetype && mimetype.includes("image")
    });

    form.parse(req, (err, fields, files) => {
        if (err) {
            logger.error('[Sync] Photo upload error', err);
            return res.status(500).json({ error: 'Upload failed' });
        }

        const getField = (f) => Array.isArray(f) ? f[0] : f;
        const getFile = (f) => Array.isArray(f) ? f[0] : f;

        const file = getFile(files.file);
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const orderId = getField(fields.orderId);
        const photoId = getField(fields.photoId);
        const deskId = req.desk.desk_id || 'UNKNOWN';

        if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

        const targetDir = path.join(UPLOAD_DIR, 'photos', orderId);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const originalName = file.originalFilename || path.basename(file.filepath);
        const targetPath = path.join(targetDir, originalName);

        try {
            fs.copyFileSync(file.filepath, targetPath);
            fs.unlinkSync(file.filepath);

            // Store metadata in DB
            const db = getDatabase();
            db.prepare(`
                INSERT OR REPLACE INTO photos (id, albumId, url, desk_id, original_id, created_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(photoId || path.basename(targetPath, path.extname(targetPath)), orderId, targetPath, deskId, photoId);

            logger.info(`[Sync] Stored photo ${photoId} for order ${orderId} from ${deskId}`);
            res.json({ success: true, path: targetPath });
        } catch (moveErr) {
            logger.error('[Sync] Failed to move uploaded file or register in DB', moveErr);
            res.status(500).json({ error: 'File save failed' });
        }
    });
});

/**
 * Route: POST /api/cloud/sync/yield
 */
router.post('/cloud/sync/yield', verifySyncToken, async (req, res) => {
    try {
        const { stats } = req.body;
        const deskId = req.desk.desk_id || 'UNKNOWN';
        const db = getDatabase();

        db.prepare(`
            CREATE TABLE IF NOT EXISTS system_yield_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                desk_id TEXT,
                date TEXT,
                total_orders INTEGER,
                paid_orders INTEGER,
                avg_order_value REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        const insertStmt = db.prepare(`
            INSERT INTO system_yield_stats (desk_id, date, total_orders, paid_orders, avg_order_value)
            VALUES (?, ?, ?, ?, ?)
        `);

        db.transaction(() => {
            for (const s of stats) {
                insertStmt.run(deskId, s.date, s.total_orders, s.paid_orders, s.avg_order_value);
            }
        });

        res.json({ success: true });
    } catch (e) {
        logger.error('[Sync] Yield sync failed', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Route: POST /api/cloud/sync/crm
 */
router.post('/cloud/sync/crm', verifySyncToken, async (req, res) => {
    try {
        const { leads } = req.body;
        const deskId = req.desk.desk_id || 'UNKNOWN';
        const db = getDatabase();

        db.prepare(`
            CREATE TABLE IF NOT EXISTS crm_leads (
                id TEXT PRIMARY KEY,
                desk_id TEXT,
                name TEXT,
                email TEXT,
                phone TEXT,
                company TEXT,
                status TEXT,
                notes TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        `).run();

        const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO crm_leads (id, desk_id, name, email, phone, company, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        db.transaction(() => {
            for (const lead of leads) {
                insertStmt.run(lead.id, deskId, lead.name, lead.email, lead.phone, lead.company, lead.status, lead.notes, lead.created_at, lead.updated_at);
            }
        });

        res.json({ success: true });
    } catch (e) {
        logger.error('[Sync] CRM sync failed', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Route: POST /api/cloud/sync/triage
 */
router.post('/cloud/sync/triage', verifySyncToken, async (req, res) => {
    try {
        const { metrics, timestamp } = req.body;
        const deskId = req.desk.desk_id || 'UNKNOWN';
        const db = getDatabase();

        db.prepare(`
            CREATE TABLE IF NOT EXISTS fleet_triage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                desk_id TEXT,
                timestamp TEXT,
                cpu_temp REAL,
                disk_io TEXT,
                latency REAL,
                memory_pressure REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        db.prepare(`
            INSERT INTO fleet_triage (desk_id, timestamp, cpu_temp, disk_io, latency, memory_pressure)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(deskId, timestamp, metrics.cpu_temp, metrics.disk_io, metrics.latency, metrics.memory_pressure);

        res.json({ success: true });
    } catch (e) {
        logger.error('[Sync] Triage sync failed', e);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Route: GET /api/cloud/sync/yield
 */
router.get('/cloud/sync/yield', verifySyncToken, async (req, res) => {
    try {
        const db = getDatabase();
        const stats = db.prepare(`
            SELECT * FROM system_yield_stats 
            ORDER BY date DESC LIMIT 30
        `).all();
        res.json({ success: true, stats });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * Route: GET /api/cloud/sync/crm
 */
router.get('/cloud/sync/crm', verifySyncToken, async (req, res) => {
    try {
        const db = getDatabase();
        const leads = db.prepare(`SELECT * FROM crm_leads`).all();
        res.json({ success: true, leads });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * Route: GET /api/cloud/sync/triage
 */
router.get('/cloud/sync/triage', verifySyncToken, async (req, res) => {
    try {
        const { desk_id } = req.query;
        const db = getDatabase();
        let query = 'SELECT * FROM fleet_triage';
        const params = [];

        if (desk_id) {
            query += ' WHERE desk_id = ?';
            params.push(desk_id);
        }

        query += ' ORDER BY timestamp DESC LIMIT 50';
        
        const metrics = db.prepare(query).all(params);
        res.json({ success: true, metrics });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
