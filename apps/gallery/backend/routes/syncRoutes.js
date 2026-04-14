const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Handle Cloud Sync requests (Native HTTP)
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse} res 
 * @param {string} pathName 
 * @param {Object} context { logger, dbManager, uploadDir }
 * @returns {Promise<boolean>} true if handled, false if not
 */
const handleSyncRequest = async (req, res, pathName, context) => {
    const { logger, uploadDir, dbManager, photoProcessor } = context;

    // Helper for JSON response
    const sendJson = (data, code = 200) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    // Check if this is a sync route
    if (!pathName.startsWith('/api/cloud/')) return false;

    // Verify Token (Strict implementation)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendJson({ error: 'Unauthorized: Missing token' }, 401);
    }

    let deskData;
    try {
        const token = authHeader.substring(7);
        if (!process.env.JWT_SECRET) {
            logger.error('[Sync] JWT_SECRET environment variable not set');
            return sendJson({ error: 'Server configuration error' }, 500);
        }
        deskData = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        logger.error('[Sync] Token verification failed', err);
        return sendJson({ error: 'Unauthorized: Invalid token' }, 401);
    }
    const deskId = deskData.desk_id || 'UNKNOWN';

    // Route: POST /api/cloud/sync-order
    if (pathName === '/api/cloud/sync-order' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const orderData = JSON.parse(body);
                logger.info(`[Sync] Received order ${orderData.orderNumber} from ${orderData.deskId}`);

                // Save to DB (Strictly bound to desk_id)
                const existing = dbManager.get('SELECT id FROM orders WHERE id = ? AND desk_id = ?', [orderData.id, deskId]);

                if (!existing) {
                    dbManager.run(
                        'INSERT OR REPLACE INTO orders (id, date, status, clientName, albumId, totalAmount, items, email, photographerId, desk_id, original_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            orderData.id,
                            orderData.date,
                            orderData.status,
                            orderData.clientName,
                            orderData.albumId,
                            orderData.totalAmount || 0,
                            typeof orderData.items === 'string' ? orderData.items : JSON.stringify(orderData.items),
                            orderData.email || '',
                            orderData.photographerId || 0,
                            deskId,
                            orderData.id
                        ]
                    );
                }

                sendJson({ success: true, id: orderData.id, message: "Order received" });
            } catch (e) {
                logger.error('[Sync] Failed to process order', e);
                sendJson({ error: e.message }, 500);
            }
        });
        return true;
    }

    // Route: POST /api/cloud/sync-album
    if (pathName === '/api/cloud/sync-album' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const albumData = JSON.parse(body);
                logger.info(`[Sync] Received album sync for ${albumData.id} (${albumData.title})`);

                const existing = dbManager.get('SELECT id FROM albums WHERE id = ? AND desk_id = ?', [albumData.id, deskId]);

                if (existing) {
                    dbManager.run(
                        'UPDATE albums SET title = ?, date = ?, price_single = ?, price_full = ?, customer_email = ?, status = ?, desk_id = ?, original_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND desk_id = ?',
                        [albumData.title, albumData.date || new Date().toISOString(), albumData.price_single || 0, albumData.price_full || 0, albumData.customer_email || '', 'Published', deskId, albumData.id, albumData.id, deskId]
                    );
                } else {
                    dbManager.run(
                        'INSERT INTO albums (id, title, date, price_single, price_full, customer_email, status, desk_id, original_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [albumData.id, albumData.title, albumData.date || new Date().toISOString(), albumData.price_single || 0, albumData.price_full || 0, albumData.customer_email || '', 'Published', deskId, albumData.id]
                    );
                }

                sendJson({ success: true, id: albumData.id, message: "Album synced" });
            } catch (e) {
                logger.error('[Sync] Failed to process album sync', e);
                sendJson({ error: e.message }, 500);
            }
        });
        return true;
    }

    // Route: POST /api/cloud/upload-photo
    if (pathName === '/api/cloud/upload-photo' && req.method === 'POST') {
        const form = new formidable.IncomingForm({
            uploadDir: uploadDir,
            keepExtensions: true,
            maxFileSize: 500 * 1024 * 1024, // 500MB
            filter: function ({ name, originalFilename, mimetype }) {
                return mimetype && mimetype.includes("image");
            }
        });

        // Parse form
        form.parse(req, async (err, fields, files) => {
            if (err) {
                logger.error('[Sync] Photo upload error', err);
                return sendJson({ error: 'Upload failed' }, 500);
            }

            const getField = (f) => Array.isArray(f) ? f[0] : f;
            const getFile = (f) => Array.isArray(f) ? f[0] : f;

            const file = getFile(files.file);
            if (!file) {
                return sendJson({ error: 'No file uploaded' }, 400);
            }

            const orderId = getField(fields.orderId) || getField(fields.albumId);
            const photoId = getField(fields.photoId);
            const albumId = getField(fields.albumId) || orderId;
            const deskId = getField(fields.desk_id) || getField(fields.deskId) || 'UNKNOWN';
            const manualEdits = getField(fields.manualEdits);

            if (!orderId) {
                return sendJson({ error: 'Missing orderId or albumId' }, 400);
            }

            try {
                // Law 15/13: Optimized Asynchronous Photo Ingestion
                const processed = await photoProcessor.processPhoto(file, albumId, photoId || crypto.randomUUID());

                const photoRecord = {
                    id: photoId || processed.id || crypto.randomUUID(),
                    albumId: albumId,
                    url: processed.url,
                    manualEdits: manualEdits || null,
                    fileHash: processed.fileHash,
                    fileSize: processed.fileSize,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                try {
                    dbManager.run(
                        'INSERT OR REPLACE INTO photos (id, albumId, url, manualEdits, fileHash, created_at, updated_at, desk_id, original_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [photoRecord.id, photoRecord.albumId, photoRecord.url, photoRecord.manualEdits, photoRecord.fileHash, photoRecord.created_at, photoRecord.updated_at, deskId, photoRecord.id]
                    );
                    logger.info(`[Sync] Registered photo ${photoRecord.id} from ${deskId} in database`);
                } catch (dbErr) {
                    logger.error('[Sync] Database registration failed', dbErr);
                }

                sendJson({ success: true, path: processed.storagePath, photoId: photoRecord.id });
            } catch (processErr) {
                logger.error('[Sync] Failed to process uploaded file', processErr);
                sendJson({ error: `File processing failed: ${processErr.message}` }, 500);
            }
        });
        return true;
    }

    return false; // Route not matched
};

module.exports = { handleSyncRequest };
