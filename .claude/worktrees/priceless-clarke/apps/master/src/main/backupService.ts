import fs from 'fs';
import path from 'path';

export class BackupService {
    private static MAX_BACKUPS = 7;

    /** Call with the resolved DATA_DIR after app is ready. */
    public static async runDailyBackup(dataDir: string): Promise<void> {
        const backupDir = path.join(dataDir, 'backup');
        const dbPath    = path.join(dataDir, 'master.db');
        try {
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const dateStr  = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const destPath = path.join(backupDir, `master_${dateStr}.sqlite.bak`);

            if (fs.existsSync(destPath)) {
                console.log(`[Backup] Already backed up for ${dateStr}`);
                return;
            }

            if (!fs.existsSync(dbPath)) {
                console.warn(`[Backup] DB not found at ${dbPath}`);
                return;
            }

            await fs.promises.copyFile(dbPath, destPath);
            console.log(`[Backup] Created ${destPath}`);

            await BackupService.cleanupOldBackups(backupDir);
        } catch (error) {
            console.error('[Backup] Backup failed:', error);
        }
    }

    private static async cleanupOldBackups(backupDir: string): Promise<void> {
        const files   = await fs.promises.readdir(backupDir);
        const backups = files
            .filter(f => f.endsWith('.sqlite.bak'))
            .map(f => ({
                name: f,
                filePath: path.join(backupDir, f),
                time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
            }))
            .sort((a, b) => b.time - a.time);

        for (const file of backups.slice(BackupService.MAX_BACKUPS)) {
            await fs.promises.unlink(file.filePath);
            console.log(`[Backup] Pruned old backup: ${file.name}`);
        }
    }
}
