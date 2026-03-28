const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
const archiver = require('archiver');

/**
 * Handle Download Requests
 * Route: POST /api/download/:photoId (POST allows sending specific options if needed, or GET)
 * For security, we usually use POST/GET with Auth header.
 * 
 * Flow:
 * 1. Validate Auth (user/customer)
 * 2. Get Photo & Edits from DB
 * 3. If no edits -> Serve Original
 * 4. If edits -> Spawn FulfillmentWorker -> Hot-Render -> Serve
 */
async function handleDownloadRequest(req, res, pathName, context) {
    const { logger, dbManager, uploadDir, authMiddleware } = context;

    // Route: GET /api/download/bulk-zip/:orderId
    if (pathName.startsWith('/api/download/bulk-zip/')) {
        const orderId = pathName.split('/').pop();
        if (!orderId) return false;

        if (!authMiddleware(req, res, () => { })) return true;

        try {
            logger.info(`Processing bulk sync/download for order ${orderId}`);
            const order = dbManager.get('SELECT * FROM orders WHERE id = ?', [orderId]);
            if (!order) {
                res.writeHead(404); res.end(JSON.stringify({ error: 'Order not found' }));
                return true;
            }

            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            const archive = archiver('zip', { zlib: { level: 9 } });

            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="Order_${orderId}.zip"`
            });

            archive.pipe(res);

            for (const item of items) {
                const photo = item.photo;
                if (!photo || !photo.url) continue;

                const photoPath = path.join(uploadDir, photo.url);
                if (fs.existsSync(photoPath)) {
                    archive.file(photoPath, { name: path.basename(photoPath) });
                }
            }

            archive.finalize();
            return true;
        } catch (err) {
            logger.error(`Bulk download failed for order ${orderId}`, err);
            res.writeHead(500); res.end(JSON.stringify({ error: 'ZIP generation failed' }));
            return true;
        }
    }

    if (!pathName.startsWith('/api/download/')) return false;

    // Extract Photo ID from path
    // Format: /api/download/:photoId
    const photoId = pathName.split('/').pop();

    if (!photoId) {
        return false; // Not a valid download route match
    }

    if (req.method !== 'GET' && req.method !== 'POST') return false;

    // 1. Auth Check
    // We reuse the authMiddleware passed from server.js
    if (!authMiddleware(req, res, () => { })) {
        return true; // Request handled (error sent)
    }

    try {
        logger.info(`Processing download for ${photoId}`, { userId: req.user.id });

        // 2. Fetch Photo Data
        const photo = dbManager.get(`SELECT * FROM photos WHERE id = ?`, [photoId]);

        if (!photo) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Photo not found' }));
            return true;
        }

        // Parse edits
        let edits = null;
        if (photo.manualEdits) {
            try {
                edits = typeof photo.manualEdits === 'string' ? JSON.parse(photo.manualEdits) : photo.manualEdits;
            } catch (e) {
                logger.warn('Failed to parse manualEdits', { photoId });
            }
        }

        const sourcePath = path.join(uploadDir, photo.url); // Assuming url stores filename relative to uploads

        if (!fs.existsSync(sourcePath)) {
            logger.error('Photo file missing', { photoId, sourcePath });
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File missing on server' }));
            return true;
        }

        // 3. Render Strategy
        // Check if edits exist (and are not empty/default)
        const hasEdits = edits && (
            edits.retouchActions?.length > 0 ||
            edits.crop ||
            edits.exposure !== 0 || edits.contrast !== 0 ||
            edits.rotate !== 0 || edits.straighten !== 0 ||
            edits.grayscale || edits.sepia
        );

        if (!hasEdits) {
            // Serve Direct
            logger.info('Serving original (no edits)', { photoId });
            serveFile(res, sourcePath, `${photo.title || 'photo'}.jpg`);
            return true;
        }

        // 4. Hot-Render
        logger.info('Starting Hot-Render', { photoId });

        // Create temp output path
        const tempDir = path.join(uploadDir, 'temp_render');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const destPath = path.join(tempDir, `${photoId}_rendered_${Date.now()}.jpg`);

        // Spawn Worker
        const workerPath = path.join(__dirname, '../workers/fulfillmentWorker.js');
        const worker = new Worker(workerPath);

        const job = {
            type: 'render',
            sourcePath,
            destPath,
            edits
        };

        worker.postMessage(job);

        // Timeout race
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Rendering timed out')), 30000)
        );

        const renderTask = new Promise((resolve, reject) => {
            worker.on('message', (msg) => {
                if (msg.success) resolve(msg.destPath);
                else reject(new Error(msg.error));
            });
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });

        try {
            await Promise.race([renderTask, timeout]);

            logger.info('Render success', { photoId });
            worker.terminate();

            // Serve Rendered File
            serveFile(res, destPath, `${photo.title || 'photo'}_edited.jpg`, true); // cleanup = true

        } catch (err) {
            worker.terminate();
            logger.error('Render failed', { err: err.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Rendering failed', details: err.message }));
        }

    } catch (err) {
        logger.error('Download route error', { err: err.message });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }

    return true;
}

function serveFile(res, filePath, downloadName, cleanup = false) {
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${downloadName}"`
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    stream.on('end', () => {
        if (cleanup) {
            fs.unlink(filePath, () => { }); // Async delete temp file
        }
    });
}

module.exports = { handleDownloadRequest };
