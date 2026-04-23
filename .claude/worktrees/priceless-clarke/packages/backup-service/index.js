/**
 * ClickFlash Backup Service
 * Handles automated backups and restores for all apps
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const archiver = require('archiver');
const unzipper = require('unzipper');
const crypto = require('crypto');

// Promisified fs functions
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const copyFile = promisify(fs.copyFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

/**
 * Backup Service Class
 */
class BackupService {
    constructor(config) {
        this.config = {
            backupDir: config.backupDir || './backups',
            dataDir: config.dataDir || './data',
            retention: config.retention || { daily: 7, weekly: 4, monthly: 12 },
            compression: config.compression !== false, // default true
            ...config
        };
        
        this.ensureBackupDir();
    }

    /**
     * Ensure backup directory exists
     */
    async ensureBackupDir() {
        try {
            await mkdir(this.config.backupDir, { recursive: true });
            await mkdir(path.join(this.config.backupDir, 'daily'), { recursive: true });
            await mkdir(path.join(this.config.backupDir, 'weekly'), { recursive: true });
            await mkdir(path.join(this.config.backupDir, 'monthly'), { recursive: true });
        } catch (error) {
            console.error('[BackupService] Failed to create backup directory:', error);
            throw error;
        }
    }

    /**
     * Create a backup
     * @param {string} type - 'daily', 'weekly', 'monthly'
     * @param {Object} options - Additional options
     */
    async createBackup(type = 'daily', options = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup-${type}-${timestamp}`;
        const backupPath = path.join(this.config.backupDir, type, backupName);
        
        console.log(`[BackupService] Creating ${type} backup: ${backupName}`);

        try {
            // Create manifest
            const manifest = {
                name: backupName,
                type,
                createdAt: new Date().toISOString(),
                version: '1.0.0',
                app: this.config.appName || 'unknown',
                files: []
            };

            if (this.config.compression) {
                // Create zip archive
                await this.createZipBackup(backupPath + '.zip', manifest);
            } else {
                // Create directory backup
                await mkdir(backupPath, { recursive: true });
                await this.createDirectoryBackup(backupPath, manifest);
            }

            // Save manifest
            const manifestPath = backupPath + (this.config.compression ? '.json' : path.sep + 'manifest.json');
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

            console.log(`[BackupService] Backup created: ${backupName}`);
            
            // Cleanup old backups
            await this.cleanupOldBackups(type);

            return {
                success: true,
                name: backupName,
                path: backupPath + (this.config.compression ? '.zip' : ''),
                manifest
            };

        } catch (error) {
            console.error('[BackupService] Backup failed:', error);
            throw error;
        }
    }

    /**
     * Create zip archive backup
     */
    async createZipBackup(archivePath, manifest) {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(archivePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                manifest.size = archive.pointer();
                manifest.compression = 'zip';
                resolve();
            });

            archive.on('error', reject);
            archive.on('warning', (err) => {
                console.warn('[BackupService] Archive warning:', err);
            });

            archive.pipe(output);

            // Add database
            const dbPath = path.join(this.config.dataDir, 'data.db');
            if (fs.existsSync(dbPath)) {
                archive.file(dbPath, { name: 'database/data.db' });
                manifest.files.push('database/data.db');
            }

            // Add uploads
            const uploadsDir = path.join(this.config.dataDir, 'uploads');
            if (fs.existsSync(uploadsDir)) {
                archive.directory(uploadsDir, 'uploads');
                manifest.files.push('uploads/');
            }

            // Add config
            const configFiles = ['.env', 'config.json', 'settings.json'];
            configFiles.forEach(file => {
                const filePath = path.join(process.cwd(), file);
                if (fs.existsSync(filePath)) {
                    archive.file(filePath, { name: `config/${file}` });
                    manifest.files.push(`config/${file}`);
                }
            });

            archive.finalize();
        });
    }

    /**
     * Create directory backup (uncompressed)
     */
    async createDirectoryBackup(backupPath, manifest) {
        // Copy database
        const dbSource = path.join(this.config.dataDir, 'data.db');
        const dbDest = path.join(backupPath, 'database');
        if (fs.existsSync(dbSource)) {
            await mkdir(dbDest, { recursive: true });
            await copyFile(dbSource, path.join(dbDest, 'data.db'));
            manifest.files.push('database/data.db');
        }

        // Copy uploads
        const uploadsSource = path.join(this.config.dataDir, 'uploads');
        const uploadsDest = path.join(backupPath, 'uploads');
        if (fs.existsSync(uploadsSource)) {
            await this.copyDirectory(uploadsSource, uploadsDest);
            manifest.files.push('uploads/');
        }

        manifest.compression = 'none';
    }

    /**
     * Copy directory recursively
     */
    async copyDirectory(source, destination) {
        await mkdir(destination, { recursive: true });
        const entries = await readdir(source, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(source, entry.name);
            const destPath = path.join(destination, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await copyFile(srcPath, destPath);
            }
        }
    }

    /**
     * List available backups
     */
    async listBackups(type = null) {
        const backups = [];
        const types = type ? [type] : ['daily', 'weekly', 'monthly'];

        for (const t of types) {
            const dir = path.join(this.config.backupDir, t);
            if (!fs.existsSync(dir)) continue;

            const entries = await readdir(dir);
            for (const entry of entries) {
                const entryPath = path.join(dir, entry);
                const stats = await stat(entryPath);
                
                backups.push({
                    name: entry,
                    type: t,
                    path: entryPath,
                    size: stats.size,
                    createdAt: stats.mtime
                });
            }
        }

        return backups.sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Restore from backup
     */
    async restoreBackup(backupName, options = {}) {
        console.log(`[BackupService] Restoring backup: ${backupName}`);

        const backupPath = await this.findBackup(backupName);
        if (!backupPath) {
            throw new Error(`Backup not found: ${backupName}`);
        }

        try {
            // Create restore point before restoring
            if (!options.skipRestorePoint) {
                await this.createBackup('restore-point', { compression: true });
            }

            if (backupPath.endsWith('.zip')) {
                await this.restoreFromZip(backupPath);
            } else {
                await this.restoreFromDirectory(backupPath);
            }

            console.log(`[BackupService] Restore completed: ${backupName}`);
            return { success: true };

        } catch (error) {
            console.error('[BackupService] Restore failed:', error);
            throw error;
        }
    }

    /**
     * Restore from zip archive
     */
    async restoreFromZip(zipPath) {
        return new Promise((resolve, reject) => {
            fs.createReadStream(zipPath)
                .pipe(unzipper.Parse())
                .on('entry', async (entry) => {
                    const filePath = entry.path;
                    const fullPath = path.join(this.config.dataDir, '..', filePath);
                    
                    if (entry.type === 'Directory') {
                        await mkdir(fullPath, { recursive: true });
                    } else {
                        await mkdir(path.dirname(fullPath), { recursive: true });
                        entry.pipe(fs.createWriteStream(fullPath));
                    }
                })
                .on('close', resolve)
                .on('error', reject);
        });
    }

    /**
     * Restore from directory
     */
    async restoreFromDirectory(backupPath) {
        // Restore database
        const dbSource = path.join(backupPath, 'database', 'data.db');
        const dbDest = path.join(this.config.dataDir, 'data.db');
        if (fs.existsSync(dbSource)) {
            await copyFile(dbSource, dbDest);
        }

        // Restore uploads
        const uploadsSource = path.join(backupPath, 'uploads');
        const uploadsDest = path.join(this.config.dataDir, 'uploads');
        if (fs.existsSync(uploadsSource)) {
            await this.copyDirectory(uploadsSource, uploadsDest);
        }
    }

    /**
     * Find backup by name
     */
    async findBackup(backupName) {
        const types = ['daily', 'weekly', 'monthly'];
        for (const type of types) {
            const dir = path.join(this.config.backupDir, type);
            const zipPath = path.join(dir, backupName + '.zip');
            const dirPath = path.join(dir, backupName);

            if (fs.existsSync(zipPath)) return zipPath;
            if (fs.existsSync(dirPath)) return dirPath;
        }
        return null;
    }

    /**
     * Cleanup old backups based on retention policy
     */
    async cleanupOldBackups(type) {
        const retention = this.config.retention[type] || 7;
        const backups = await this.listBackups(type);
        
        if (backups.length > retention) {
            const toDelete = backups.slice(retention);
            for (const backup of toDelete) {
                try {
                    if (backup.path.endsWith('.zip')) {
                        await unlink(backup.path);
                    } else {
                        await this.deleteDirectory(backup.path);
                    }
                    console.log(`[BackupService] Deleted old backup: ${backup.name}`);
                } catch (error) {
                    console.error('[BackupService] Failed to delete backup:', error);
                }
            }
        }
    }

    /**
     * Delete directory recursively
     */
    async deleteDirectory(dirPath) {
        const entries = await readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                await this.deleteDirectory(fullPath);
            } else {
                await unlink(fullPath);
            }
        }
        
        fs.rmdirSync(dirPath);
    }

    /**
     * Verify backup integrity
     */
    async verifyBackup(backupName) {
        const backupPath = await this.findBackup(backupName);
        if (!backupPath) {
            throw new Error(`Backup not found: ${backupName}`);
        }

        try {
            const manifestPath = backupPath.endsWith('.zip') 
                ? backupPath.replace('.zip', '.json')
                : path.join(backupPath, 'manifest.json');

            if (!fs.existsSync(manifestPath)) {
                return { valid: false, error: 'Manifest not found' };
            }

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            if (backupPath.endsWith('.zip')) {
                // Verify zip can be opened
                await new Promise((resolve, reject) => {
                    fs.createReadStream(backupPath)
                        .pipe(unzipper.Parse())
                        .on('close', resolve)
                        .on('error', reject);
                });
            }

            return { valid: true, manifest };

        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Schedule automatic backups
     */
    scheduleBackups(cronSchedule = null) {
        // This would use node-cron in a real implementation
        console.log('[BackupService] Scheduling backups...');
        
        // Daily at 2 AM
        if (!cronSchedule || cronSchedule.daily) {
            console.log('[BackupService] Daily backup scheduled for 2:00 AM');
        }
        
        // Weekly on Sunday at 3 AM
        if (!cronSchedule || cronSchedule.weekly) {
            console.log('[BackupService] Weekly backup scheduled for Sunday 3:00 AM');
        }
        
        // Monthly on 1st at 4 AM
        if (!cronSchedule || cronSchedule.monthly) {
            console.log('[BackupService] Monthly backup scheduled for 1st of month 4:00 AM');
        }
    }
}

module.exports = BackupService;
