import express, { Request, Response, Router } from 'express';
import { DatabaseManager } from '../shared/db';
import { Logger } from '../shared/logger';
import { LedgerService } from '../services/LedgerService';
import { sendError, ERROR_CODES, sendInvalidInputError } from '../shared/errorHandler';

interface LedgerContext {
    dbManager: DatabaseManager;
    logger: Logger;
    ledgerService: LedgerService;
}

export default function ledgerRoutes(context: LedgerContext): Router {
    const { logger, ledgerService } = context;
    const router = express.Router();

    // GET /api/ledger
    // Filters: photographerId, startDate, endDate
    router.get('/', (req: Request, res: Response) => {
        try {
            const photographerId = req.query.photographerId as string;
            const startDate = req.query.startDate as string;
            const endDate = req.query.endDate as string;

            const entries = ledgerService.getLedger(photographerId, startDate, endDate);

            res.json({
                success: true,
                data: entries
            });
        } catch (error: any) {
            logger.error('[Ledger] Failed to fetch ledger', error);
            sendError(res, 500, 'Ledger Fetch Error', error.message, ERROR_CODES.INTERNAL_ERROR);
        }
    });

    // POST /api/ledger/adjust
    // Manual adjustment (Bonus, Deduction, Payout, etc.)
    router.post('/adjust', async (req: Request, res: Response) => {
        try {
            const { photographerId, type, amount, description, date } = req.body;

            if (!photographerId || !type || amount === undefined || !description) {
                return sendInvalidInputError(res, 'Missing required fields');
            }

            const validTypes = ['Bonus', 'Deduction', 'Salary', 'Payout', 'Correction'];
            if (!validTypes.includes(type)) {
                return sendInvalidInputError(res, 'Invalid adjustment type');
            }

            const entryDate = date || new Date().toISOString().split('T')[0];

            await ledgerService.addEntry({
                photographer_id: photographerId,
                type: type as any,
                amount: Number(amount),
                description,
                date: entryDate
            });

            res.json({
                success: true,
                message: 'Adjustment recorded successfully'
            });

        } catch (error: any) {
            logger.error('[Ledger] Failed to record adjustment', error);
            sendError(res, 500, 'Adjustment Error', error.message, ERROR_CODES.INTERNAL_ERROR);
        }
    });

    // POST /api/ledger/backfill
    // One-time utility to populate ledger from past orders
    router.post('/backfill', async (req: Request, res: Response) => {
        try {
            const { secret } = req.body;
            if (secret !== process.env.JWT_SECRET) {
                return sendError(res, 403, 'Forbidden', 'Invalid secret', ERROR_CODES.FORBIDDEN);
            }

            logger.info('[Ledger] Starting historical backfill...');
            const orders = context.dbManager.query<any>('SELECT * FROM orders WHERE status = "Completed"');
            let count = 0;
            let skipped = 0;

            for (const order of orders) {
                if (!order.photographerId) continue;

                // Check if entry exists (Idempotency)
                const existing = context.dbManager.get<{ id: string }>(
                    'SELECT id FROM photographer_ledger WHERE order_id = ?',
                    [order.id]
                );

                if (existing) {
                    skipped++;
                    continue;
                }

                const photographer = context.dbManager.get<any>('SELECT * FROM users WHERE id = ?', [order.photographerId]);
                if (photographer) {
                    await ledgerService.recordOrderCommission(order, photographer);
                    count++;
                }
            }

            logger.info(`[Ledger] Backfill complete. Added ${count}, Skipped ${skipped}`);
            res.json({
                success: true,
                count,
                skipped,
                message: `Backfilled ${count} orders`
            });

        } catch (error: any) {
            logger.error('[Ledger] Backfill failed', error);
            sendError(res, 500, 'Backfill Error', error.message, ERROR_CODES.INTERNAL_ERROR);
        }
    });

    return router;
}
