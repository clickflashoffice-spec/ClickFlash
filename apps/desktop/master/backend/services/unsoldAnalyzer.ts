import { aiSalesOrchestrator } from './aiSalesOrchestrator';
import { DatabaseManager } from '../database/db';
import { logger } from '../utils/logger';

export interface UnsoldRecord {
    id: string;
    albumId: string;
    albumTitle?: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    whatsappOptIn?: boolean;
    resortName?: string;
    topActivity?: string;
    uploadedAt: Date | string;
    totalOpened?: number;
    totalConverted?: number;
}

export class UnsoldPhotosAnalyzer {
    private dbManager: DatabaseManager | null = null;

    constructor(dbManager?: DatabaseManager) {
        if (dbManager) {
            this.dbManager = dbManager;
        }
    }

    public setDbManager(dbManager: DatabaseManager) {
        this.dbManager = dbManager;
    }

    /**
     * Queries the database for unpurchased photos older than specified hours.
     */
    async getUnsoldPhotosOlderThan(hours: number = 24): Promise<UnsoldRecord[]> {
        if (!this.dbManager) {
            logger.warn('[UnsoldAnalyzer] No dbManager configured, returning empty list');
            return [];
        }

        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        try {
            // Find photos older than cutoff that have not been included in a completed/paid order
            const query = `
                SELECT 
                    p.id,
                    p.albumId,
                    p.created_at AS uploadedAt,
                    a.title AS albumTitle,
                    COALESCE(a.customerEmail, '') AS customerEmail,
                    COALESCE(a.customerPhone, '') AS customerPhone,
                    COALESCE(a.customerName, 'Guest') AS customerName
                FROM photos p
                LEFT JOIN albums a ON p.albumId = a.id
                WHERE p.created_at < ?
                  AND (p.status IS NULL OR p.status != 'archived')
                  AND p.id NOT IN (
                      SELECT JSON_EXTRACT(item.value, '$.photoId') 
                      FROM orders, JSON_EACH(orders.items) AS item
                      WHERE orders.status IN ('paid', 'fulfilled', 'verified')
                  )
                  AND (a.customerEmail IS NOT NULL OR a.customerPhone IS NOT NULL)
                ORDER BY p.created_at DESC
                LIMIT 50;
            `;

            const rows = this.dbManager.query<any>(query, [cutoffTime]);

            return rows.map(r => ({
                id: r.id,
                albumId: r.albumId,
                albumTitle: r.albumTitle || 'Resort Photo Session',
                customerEmail: r.customerEmail || undefined,
                customerName: r.customerName || 'Valued Guest',
                customerPhone: r.customerPhone || undefined,
                whatsappOptIn: true,
                resortName: process.env.RESORT_NAME || 'ClickFlash Resort & Spa',
                topActivity: r.albumTitle || 'Photoshoot',
                uploadedAt: r.uploadedAt,
                totalOpened: 1,
                totalConverted: 0
            }));
        } catch (error: any) {
            logger.error('[UnsoldAnalyzer] Error querying unsold photos:', error);
            return [];
        }
    }

    /**
     * Marks an asset as analyzed to prevent repetitive marketing messages.
     */
    async markPhotoAsAnalyzed(id: string) {
        if (!this.dbManager) return;
        try {
            this.dbManager.run(
                "UPDATE photos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [id]
            );
        } catch (e: any) {
            logger.warn(`[UnsoldAnalyzer] Could not update photo ${id}: ${e.message}`);
        }
    }

    /**
     * Runs periodically (e.g. daily cron job) to analyze unsold photos and trigger AI sales workflows.
     */
    async analyzeUnsoldInventory(hours: number = 24) {
        logger.info(`[UnsoldAnalyzer] Starting batch analysis of unsold photos > ${hours} hours...`);
        
        const unsoldRecords = await this.getUnsoldPhotosOlderThan(hours);
        
        if (unsoldRecords.length === 0) {
            logger.info('[UnsoldAnalyzer] No unsold photos found matching criteria.');
            return;
        }

        logger.info(`[UnsoldAnalyzer] Found ${unsoldRecords.length} records to analyze.`);

        // Pass records to AI Sales Orchestrator
        await aiSalesOrchestrator.huntForLeads(unsoldRecords);

        // Mark processed records
        for (const record of unsoldRecords) {
            await this.markPhotoAsAnalyzed(record.id);
        }

        logger.info('[UnsoldAnalyzer] Batch analysis complete.');
    }
}

export const unsoldPhotosAnalyzer = new UnsoldPhotosAnalyzer();
