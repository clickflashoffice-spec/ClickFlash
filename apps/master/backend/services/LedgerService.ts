import { DatabaseManager } from '../shared/db';
import { Logger } from '../shared/logger';
import { randomUUID } from 'crypto';

export interface LedgerEntry {
    id: string;
    photographer_id: string;
    order_id?: string;
    type: 'Commission' | 'Salary' | 'Bonus' | 'Deduction' | 'Payout';
    amount: number;
    description: string;
    date: string;
    created_at: string;
    sync_id?: string;
    sync_status: 'pending' | 'synced';
}

export class LedgerService {
    private db: DatabaseManager;
    private logger: Logger;

    constructor(db: DatabaseManager, logger: Logger) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Adds an entry to the ledger.
     * Idempotent check: If order_id is provided, checks if an entry with that order_id already exists.
     */
    public async addEntry(entry: Omit<LedgerEntry, 'id' | 'created_at' | 'sync_status'>): Promise<string> {
        try {
            // Idempotency check for orders
            if (entry.order_id) {
                const existing = this.db.get<{ id: string }>(
                    'SELECT id FROM photographer_ledger WHERE order_id = ?',
                    [entry.order_id]
                );
                if (existing) {
                    this.logger.warn(`[Ledger] Skipped duplicate entry for order ${entry.order_id}`);
                    return existing.id;
                }
            }

            const id = randomUUID();
            const created_at = new Date().toISOString();
            const sync_id = randomUUID();

            this.db.run(`
                INSERT INTO photographer_ledger (
                    id, photographer_id, order_id, type, amount, description, date, created_at, sync_id, sync_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                entry.photographer_id,
                entry.order_id || null,
                entry.type,
                entry.amount,
                entry.description,
                entry.date,
                created_at,
                sync_id,
                'pending'
            ]);

            this.logger.info(`[Ledger] Added ${entry.type} entry for photographer ${entry.photographer_id}: ${entry.amount}`);
            return id;

        } catch (error: any) {
            this.logger.error('[Ledger] Failed to add entry', error);
            throw error;
        }
    }

    /**
     * Calculates and records commission for a completed order.
     */
    public async recordOrderCommission(order: any, photographer: any): Promise<void> {
        if (!order || !photographer) return;

        // Only calculate for Commission-based or mixed if we support that (currently strictly 'Commission')
        // But what if they have Salary AND Commission? The types suggested one or the other ('PayrollType').
        // Let's stick to the Law: "payrollType?: PayrollType".

        if (photographer.payrollType !== 'Commission') {
            return; // Salary employees get fixed monthly, not per order
        }

        const rate = (photographer.commissionRate || 0) / 100; // stored as 0-100, so /100
        if (rate <= 0) return;

        const commissionAmount = parseFloat((order.total * rate).toFixed(2));
        if (commissionAmount <= 0) return;

        await this.addEntry({
            photographer_id: photographer.id,
            order_id: order.id,
            type: 'Commission',
            amount: commissionAmount,
            description: `Commission for Order #${order.orderNumber || order.id} (${(rate * 100).toFixed(0)}%)`,
            date: new Date().toISOString().split('T')[0],
            sync_id: randomUUID()
        });
    }

    public getLedger(photographerId?: string, startDate?: string, endDate?: string): LedgerEntry[] {
        let query = 'SELECT * FROM photographer_ledger WHERE 1=1';
        const params: any[] = [];

        if (photographerId) {
            query += ' AND photographer_id = ?';
            params.push(photographerId);
        }

        if (startDate) {
            query += ' AND date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY created_at DESC';

        return this.db.query<LedgerEntry>(query, params);
    }

    public getBalance(photographerId: string): number {
        const result = this.db.get<{ balance: number }>(
            'SELECT SUM(amount) as balance FROM photographer_ledger WHERE photographer_id = ?',
            [photographerId]
        );
        return result?.balance || 0;
    }
}
