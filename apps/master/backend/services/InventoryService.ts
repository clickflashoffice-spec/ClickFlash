import { DatabaseManager } from '../shared/db';
import { Logger } from '../shared/logger';
import { randomUUID } from 'crypto';

export interface InventoryItem {
    id: string;
    name: string;
    type: string;
    current_count: number;
    low_stock_threshold: number;
    updated_at: string;
}

export class InventoryService {
    private db: DatabaseManager;
    private logger: Logger;

    constructor(db: DatabaseManager, logger: Logger) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Get all inventory items
     */
    public async getInventory(): Promise<InventoryItem[]> {
        return this.db.query<InventoryItem>('SELECT * FROM inventory ORDER BY type, name');
    }

    /**
     * Deduct stock for a specific consumable type
     */
    public async deductStock(type: string, amount: number = 1): Promise<void> {
        try {
            // Find the first available item of this type with stock
            const item = this.db.get<InventoryItem>(
                'SELECT * FROM inventory WHERE type = ? AND current_count > 0 LIMIT 1',
                [type]
            );

            if (!item) {
                this.logger.warn(`[Inventory] No available stock found for type: ${type}`);
                return;
            }

            const newCount = item.current_count - amount;
            this.db.run(
                'UPDATE inventory SET current_count = ?, updated_at = ? WHERE id = ?',
                [newCount, new Date().toISOString(), item.id]
            );

            this.logger.info(`[Inventory] Deducted ${amount} from ${item.name}. Remaining: ${newCount}`);

            if (newCount <= item.low_stock_threshold) {
                this.logger.warn(`[Inventory] LOW STOCK ALERT: ${item.name} is at ${newCount}`);
            }
        } catch (error: any) {
            this.logger.error(`[Inventory] Failed to deduct stock for ${type}`, { error: error?.message ?? String(error) });
        }
    }

    /**
     * Add or Update inventory item (Management App hook)
     */
    public async updateStock(id: string, count: number): Promise<void> {
        this.db.run(
            'UPDATE inventory SET current_count = ?, updated_at = ? WHERE id = ?',
            [count, new Date().toISOString(), id]
        );
        this.logger.info(`[Inventory] Manual stock update for ${id}: ${count}`);
    }
}
