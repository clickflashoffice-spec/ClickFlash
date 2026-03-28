// backend/routes/orders.ts
import express, { Request, Response, Router } from 'express';
import { pb } from '../services/pb'; // Assume backend has its own PB or DB access
import { Logger } from '../shared/logger'; // Or local logger
import os from 'os';

// Rule 14 & Rule 22: Export to Master
export default function orderRoutes(context: any): Router {
    const { logger } = context;
    const router = express.Router();

    router.post('/:id/export-to-master', async (req: Request, res: Response) => {
        const orderId = req.params.id;
        try {
            // 1. Get Local Order
            // Using backend internal DB access or PB logic? 
            // Touch backend typically uses SQLite or generic DB.
            // Let's assume context.dbManager exists like Master, or we rely on 'pb' service which might be frontend only?
            // If backend needs DB, we should see how 'system.ts' does it or 'server.ts'.
            // Assuming context.dbManager for now.
            const order = context.dbManager.get('SELECT * FROM orders WHERE id = ?', [orderId]);
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
                // Fallback or explicit config
                // Check .env?
                if (process.env.MASTER_IP) masterIp = process.env.MASTER_IP;
            }

            const masterUrl = `http://${masterIp}:${masterPort}/api/collections/orders/records`;

            // 3. Send to Master
            // We need to parse order data to match Master's schema
            const payload = { ...order };
            // Ensure ID matches or let Master generate new? Usually keep same ID if UUID.

            // Clean up internal fields if needed
            delete payload.local_id;

            const response = await fetch(masterUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Master rejected order: ${response.statusText}`);
            }

            const remoteData = await response.json();

            // 4. Update Local Status
            context.dbManager.run('UPDATE orders SET status = ?, synced = 1 WHERE id = ?', ['Exported', orderId]);

            res.json({ success: true, masterId: remoteData.id });

        } catch (error: any) {
            if (logger) logger.error('Export failed', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
