import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { DatabaseManager } from '../shared/db';
import { Logger } from '../shared/logger';

// backend/routes/orderExport.ts

interface OrderExportContext {
    dbManager: DatabaseManager;
    logger: Logger;
    [key: string]: any;
}

/**
 * Phase 34: Generate HMAC-SHA256 signature for LAN requests
 */
function signRequest(kioskId: string, signingSecret: string, method: string, path: string, body: string): { timestamp: string; signature: string } {
    const timestamp = String(Date.now());
    const payload = `${kioskId}:${timestamp}:${method}:${path}:${body}`;
    const signature = crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');
    return { timestamp, signature };
}

export default function createOrderExportRouter(context: OrderExportContext): Router {
    const router = Router({ mergeParams: true });
    const { dbManager, logger } = context;

    /**
     * @route POST /api/orders/:id/export-to-master
     * @description Export order to Master via HTTP API (Mesh Networking)
     */
    router.post('/:id/export-to-master', async (req: Request, res: Response) => {
        const { id: orderId } = req.params;

        try {
            // 1. Get Local Order
            const order = dbManager.get('SELECT * FROM orders WHERE id = ?', [orderId]);
            if (!order) {
                return res.status(404).json({ error: 'Order not found locally' });
            }

            // 2. Discover Master IP
            const g = global as any;
            let masterIp = 'localhost';
            let masterPort = 8090;

            if (g.discoveredMasters && g.discoveredMasters.length > 0) {
                masterIp = g.discoveredMasters[0].ip;
                masterPort = g.discoveredMasters[0].port;
            } else {
                try {
                    const setting = dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'serverUrl'");
                    if (setting && setting.value) {
                        const url = new URL(setting.value);
                        masterIp = url.hostname;
                        masterPort = parseInt(url.port) || 8090;
                    }
                } catch (e) { }
            }

            const masterPath = '/api/collections/orders/records';
            const masterUrl = `http://${masterIp}:${masterPort}${masterPath}`;
            if (logger && logger.info) logger.info(`[OrderExport] Syncing order ${orderId} to Master at ${masterUrl}`);

            // 3. Prepare Payload (Match Master Schema)
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

            const payload = {
                id: order.id,
                date: order.created_at ? order.created_at.split(' ')[0] : new Date().toISOString().split('T')[0],
                items: items,
                total: order.total,
                status: order.status === 'Exported' ? 'Pending' : order.status,
                email: order.email || undefined,
                clientName: order.clientName || undefined,
                photographerId: order.photographerId ? String(order.photographerId) : undefined,
                roomNumber: order.roomNumber || undefined,
                phone: order.phone || undefined,
                source: 'touch',
                checksum: order.checksum || undefined,
                created_at: order.created_at || undefined,
                updated_at: order.updated_at || undefined
            };

            // Law 08 Hardening: Ensure checksum exists before export
            if (!payload.checksum) {
                const { OrderIntegrity } = require('../shared/OrderIntegrity');
                payload.checksum = OrderIntegrity.calculateChecksum(payload);
                logger.info(`[OrderExport] Generated missing checksum for order ${orderId}: ${payload.checksum}`);
            }

            const bodyStr = JSON.stringify(payload);

            // 4. Phase 34: Sign the request with HMAC-SHA256
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Touch-Sync': 'true'
            };

            // 4. Phase 34: Sign the request with HMAC-SHA256
            const kioskConfig = dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'kioskId'");
            const secretConfig = dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'signingSecret'");

            if (!kioskConfig?.value || !secretConfig?.value) {
                logger.error('[OrderExport] Signing credentials missing. Kiosk not properly configured for order export.');
                return res.status(500).json({ 
                    error: 'Kiosk not properly configured for order export',
                    details: 'Missing kioskId or signingSecret in settings'
                });
            }

            try {
                const kioskId = kioskConfig.value;
                const signingSecret = secretConfig.value;
                const { timestamp, signature } = signRequest(kioskId, signingSecret, 'POST', masterPath, bodyStr);

                headers['X-Kiosk-ID'] = kioskId;
                headers['X-Timestamp'] = timestamp;
                headers['X-Signature'] = signature;

                logger.info(`[OrderExport] Request signed for kiosk ${kioskId}`);
            } catch (signErr: any) {
                logger.error(`[OrderExport] Failed to sign request: ${signErr.message}`);
                return res.status(500).json({ 
                    error: 'Failed to sign order export request',
                    details: signErr.message
                });
            }

            // 5. Send to Master
            const response = await fetch(masterUrl, {
                method: 'POST',
                headers,
                body: bodyStr
            });

            if (!response.ok) {
                const errBody = await response.text();
                logger.error(`Master rejected order ${orderId}`, { status: response.status, body: errBody });
                return res.status(response.status).json({
                    error: 'Master rejected order',
                    details: errBody
                });
            }

            const remoteData = await response.json();

            // 6. Update Local Status
            dbManager.run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
                ['Exported', new Date().toISOString(), orderId]);

            res.json({ success: true, masterId: remoteData.id });

        } catch (error: any) {
            if (logger && logger.error) logger.error('Order Export failed', { error: error.message, orderId });
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
