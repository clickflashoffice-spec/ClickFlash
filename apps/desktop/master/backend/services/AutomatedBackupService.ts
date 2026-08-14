import crypto from "crypto";
import { BackupService } from "./BackupService";
import { logger } from "../utils/logger";

export class AutomatedBackupService {
    private interval: NodeJS.Timeout | null = null;
    private backupInProgress = false;

    constructor(
        private backupService: BackupService,
        private deskId: string,
        private cloudHubUrl: string,
        private token: string
    ) {}

    public start(): void {
        // Run every hour
        const intervalMs = 60 * 60 * 1000;
        this.interval = setInterval(() => this.runBackupCycle(), intervalMs);
        logger.info("[AutomatedBackup] Started automated backup service interval.");
        
        // Run an initial backup 5 minutes after start
        setTimeout(() => this.runBackupCycle(), 5 * 60 * 1000);
    }

    public stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            logger.info("[AutomatedBackup] Stopped automated backup service.");
        }
    }

    public async runBackupCycle(): Promise<void> {
        if (this.backupInProgress) {
            logger.warn("[AutomatedBackup] Backup already in progress, skipping cycle.");
            return;
        }

        this.backupInProgress = true;
        try {
            if (!this.deskId || this.deskId === "master-unregistered") {
                logger.warn("[AutomatedBackup] Desk not registered, skipping backup.");
                return;
            }

            if (!this.token) {
                logger.warn("[AutomatedBackup] No cloud sync token, skipping upload.");
                return;
            }

            logger.info("[AutomatedBackup] Creating local database snapshot...");
            const { zipBuffer } = await this.backupService.createIncrementalSnapshot();
            
            const checksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');

            logger.info(`[AutomatedBackup] Uploading backup to cloud (${zipBuffer.byteLength} bytes)...`);

            const uploadUrl = `${this.cloudHubUrl}/api/cloud/backup/upload`;
            
            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/octet-stream",
                    "x-desk-id": this.deskId,
                    "x-backup-checksum": checksum,
                    "x-backup-type": "snapshot"
                },
                body: new Uint8Array(zipBuffer)
            });

            if (!response.ok) {
                const errText = await response.text();
                logger.error(`[AutomatedBackup] Cloud upload failed: ${response.status} - ${errText}`);
                return;
            }

            const result = await response.json() as any;
            if (result.success) {
                logger.info(`[AutomatedBackup] Successfully uploaded backup to cloud: ${result.key}`);
            } else {
                logger.error(`[AutomatedBackup] Upload response error: ${JSON.stringify(result)}`);
            }

            // Cleanup local backup after successful upload (optional, but BackupService also manages local retention)
            
        } catch (e: any) {
            logger.error(`[AutomatedBackup] Failed to run backup cycle: ${e.message}`, e);
        } finally {
            this.backupInProgress = false;
        }
    }
}
