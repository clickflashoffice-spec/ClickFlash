
import fs from 'fs';
import path from 'path';
import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import { DATA_DIR } from '../config/constants';

// Define Trash Archive Path (Rule 12 compliant)
const TRASH_ARCHIVE_DIR = path.join(DATA_DIR, 'trash_archive');

export default class MoneyTrashService {
    private dbManager: DatabaseManager;
    private logger: Logger;
    private checkInterval: NodeJS.Timeout | null = null;

    // Default Config (matches MoneyTrashSettings.tsx)
    private config = {
        enabled: false,
        retentionMinutes: 120,
        emailTriggerTime: 30,
        discountPercentage: 50
    };

    constructor(dbManager: DatabaseManager, logger: Logger) {
        this.dbManager = dbManager;
        this.logger = logger;
        this.ensureTrashDir();
    }

    private ensureTrashDir() {
        if (!fs.existsSync(TRASH_ARCHIVE_DIR)) {
            fs.mkdirSync(TRASH_ARCHIVE_DIR, { recursive: true });
        }
    }

    public start() {
        this.logger.info('[MoneyTrash] Service started');
        this.loadConfig();

        // Run check every 15 minutes (to respect retentionMinutes precision)
        this.checkInterval = setInterval(() => this.runLifecycleCheck(), 15 * 60 * 1000);

        // Initial run
        this.runLifecycleCheck();
    }

    public stop() {
        if (this.checkInterval) clearInterval(this.checkInterval);
    }

    private loadConfig() {
        let loaded: any = null;
        let source = '';

        // Try 1: Load from settings table (where frontend saves via /api/network-settings)
        try {
            const row = this.dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'moneytrash_settings'");
            if (row && row.value) {
                loaded = JSON.parse(row.value);
                source = 'settings:moneytrash_settings';
            }
        } catch (e: any) {
            this.logger.debug('[MoneyTrash] No moneytrash_settings in settings table');
        }

        // Try 2: Load from gallery_settings table (legacy location)
        if (!loaded) {
            try {
                const row = this.dbManager.get<{ setting_value: string }>("SELECT setting_value FROM gallery_settings WHERE setting_key = 'money_trash_config'");
                if (row && row.setting_value) {
                    let legacyLoaded: any = row.setting_value;
                    if (typeof legacyLoaded === 'string') {
                        try { legacyLoaded = JSON.parse(legacyLoaded); } catch (e) {
                            this.logger.warn('[MoneyTrash] Failed to parse legacy config JSON', { error: e instanceof Error ? e.message : String(e) });
                        }
                    }
                    loaded = legacyLoaded;
                    source = 'gallery_settings:money_trash_config';
                }
            } catch (e: any) {
                if (!e.message.includes('no such table: gallery_settings')) {
                    this.logger.warn(`[MoneyTrash] Failed to load from gallery_settings`, { error: e.message });
                }
            }
        }

        // Apply loaded config
        if (loaded) {
            this.config = {
                enabled: Boolean(loaded.enabled),
                retentionMinutes: Number(loaded.retentionMinutes) || 120, // Default 2 hours
                emailTriggerTime: Number(loaded.emailTriggerTime) || 30,
                discountPercentage: Number(loaded.discountPercentage) || 50
            };

            // Support new "retentionDays" format from GrowthPage if present, converting to minutes
            if (loaded.retentionDays) {
                this.config.retentionMinutes = Math.round(Number(loaded.retentionDays) * 24 * 60);
            }

            this.logger.info(`[MoneyTrash] Loaded Config from ${source}: ${JSON.stringify(this.config)}`);
        } else {
            this.logger.info('[MoneyTrash] Using default config (Disabled)');
        }
    }

    /**
     * Main Lifecycle Logic
     */
    private async runLifecycleCheck() {
        if (!this.config.enabled) return;

        // Reload config to get latest retention/enabled status
        this.loadConfig();

        this.logger.info('[MoneyTrash] Running Lifecycle Check...');

        try {
            await this.archiveExpiredPhotos();
            await this.pruneTrashArchive();
        } catch (error: any) {
            this.logger.error('[MoneyTrash] Lifecycle Check Failed', { error: error.message });
        }
    }

    private async archiveExpiredPhotos() {
        try {
            const cutoffTime = new Date(Date.now() - (this.config.retentionMinutes * 60 * 1000)).toISOString();

            // Rule: DB-First Scanning (Law 15: Optimization)
            const trashCandidates = this.dbManager.query<{ id: string, albumId: string, url: string, originalFilename: string }>(`
                SELECT id, albumId, url, originalFilename 
                FROM photos 
                WHERE created_at < ? 
                  AND (status IS NULL OR status != 'archived')
                  AND id NOT IN (
                      SELECT JSON_EXTRACT(item.value, '$.photoId') 
                      FROM orders, JSON_EACH(orders.items) AS item
                      WHERE orders.status IN ('paid', 'fulfilled', 'verified')
                  )
                LIMIT 100
            `, [cutoffTime]);

            if (trashCandidates.length === 0) return;

            this.logger.info(`[MoneyTrash] Found ${trashCandidates.length} trash candidates. Enqueueing...`);

            for (const photo of trashCandidates) {
                try {
                    // 1. Mark as archived in DB immediately
                    // This "hides" it from Kiosk/Touch views while keeping file available for sync
                    this.dbManager.run("UPDATE photos SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [photo.id]);

                    // 2. Enqueue for Cloud Retention Sync (Watermarking + Upload)
                    const existingQueue = this.dbManager.get("SELECT 1 FROM retention_queue WHERE asset_id = ?", [photo.id]);
                    if (!existingQueue) {
                        this.dbManager.run(
                            "INSERT INTO retention_queue (album_id, asset_id, status, created_at) VALUES (?, ?, 'pending', CURRENT_TIMESTAMP)",
                            [photo.albumId, photo.id]
                        );
                    }

                    this.logger.info(`[MoneyTrash] Archived and enqueued ${photo.id}`);
                } catch (err: any) {
                    this.logger.error(`[MoneyTrash] Failed to archive ${photo.id}`, { error: err.message });
                }
            }
        } catch (e: any) {
            this.logger.error('[MoneyTrash] Archive Process Error', { error: e.message });
        }
    }


    private async pruneTrashArchive() {
        // Implementation for hard delete logic (90 days retention)
        // We look for files that have been 'archived' for more than retention period + buffer (e.g., 90 days hard limit)
        // Or simply use the configured retention time if the intent is "Ephemeral Trash"
        // Standard practice: "Trash" holds files for X days, then deletes.
        // Here, we'll use a HARD LIMIT of 90 days for safety, independent of the soft "archive" retentionMinutes.
        const HARD_DELETE_DAYS = 90;
        const cutoffDate = new Date(Date.now() - (HARD_DELETE_DAYS * 24 * 60 * 60 * 1000)).toISOString();

        try {
            const filesToDelete = this.dbManager.query<{ id: string, url: string, albumId: string }>(`
                SELECT id, url, albumId FROM photos 
                WHERE status = 'archived' 
                AND updated_at < ?
                LIMIT 50
            `, [cutoffDate]);

            if (filesToDelete.length === 0) return;

            this.logger.info(`[MoneyTrash] Pruning ${filesToDelete.length} files older than ${HARD_DELETE_DAYS} days...`);

            for (const file of filesToDelete) {
                try {
                    // Physical Deletion across possible storage locations
                    const uploadDir = path.join(DATA_DIR, 'uploads');
                    const cleanRelative = file.url.replace(/^\/?(uploads\/|api\/files\/)?/, '');
                    const candidates = [
                        path.resolve(uploadDir, cleanRelative),
                        path.resolve(TRASH_ARCHIVE_DIR, cleanRelative),
                        path.resolve(uploadDir, file.albumId, path.basename(cleanRelative)),
                        path.resolve(TRASH_ARCHIVE_DIR, file.albumId, path.basename(cleanRelative))
                    ];

                    let deleted = false;
                    for (const candidatePath of candidates) {
                        if (fs.existsSync(candidatePath)) {
                            await fs.promises.unlink(candidatePath);
                            this.logger.info(`[MoneyTrash] Deleted file: ${candidatePath}`);
                            deleted = true;
                            break;
                        }
                    }

                    if (!deleted) {
                        this.logger.debug(`[MoneyTrash] File already removed or not found locally: ${file.url}`);
                    }

                    // Delete from DB
                    this.dbManager.run("DELETE FROM photos WHERE id = ?", [file.id]);

                    // Also clean up retention_queue if exists (should be done/synced by now)
                    this.dbManager.run("DELETE FROM retention_queue WHERE asset_id = ?", [file.id]);

                } catch (err: any) {
                    this.logger.error(`[MoneyTrash] Failed to prune ${file.id}`, { error: err.message });
                }
            }
        } catch (e: any) {
            this.logger.error('[MoneyTrash] Prune Error', { error: e.message });
        }
    }
}
