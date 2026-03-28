import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class BackupService {
    private static BACKUP_DIR = path.join(app.getPath('userData'), 'backups');
    private static DB_PATH = path.join(app.getPath('userData'), 'database.sqlite');
    private static MAX_BACKUPS = 7;

    public static async runDailyBackup(): Promise<void> {
        try {
            if (!fs.existsSync(this.BACKUP_DIR)) {
                fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
            }

            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const backupPath = path.join(this.BACKUP_DIR, `database_${dateStr}.sqlite.bak`);

            // Check if backup already exists for today
            if (fs.existsSync(backupPath)) {
                console.log(`[Backup] Backup for ${dateStr} already exists.`);
                return;
            }

            if (!fs.existsSync(this.DB_PATH)) {
                console.warn(`[Backup] Database not found at ${this.DB_PATH}`);
                return;
            }

            // Perform copy
            await fs.promises.copyFile(this.DB_PATH, backupPath);
            console.log(`[Backup] Successfully created backup: ${backupPath}`);

            // Cleanup old backups
            await this.cleanupOldBackups();
        } catch (error) {
            console.error('[Backup] Backup failed:', error);
        }
    }

    private static async cleanupOldBackups(): Promise<void> {
        const files = await fs.promises.readdir(this.BACKUP_DIR);
        const backups = files
            .filter(f => f.endsWith('.sqlite.bak'))
            .map(f => ({ name: f, path: path.join(this.BACKUP_DIR, f), time: fs.statSync(path.join(this.BACKUP_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (backups.length > this.MAX_BACKUPS) {
            const toDelete = backups.slice(this.MAX_BACKUPS);
            for (const file of toDelete) {
                await fs.promises.unlink(file.path);
                console.log(`[Backup] Deleted old backup: ${file.name}`);
            }
        }
    }
}
