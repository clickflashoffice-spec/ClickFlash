# ClickFlash Backup Service

> **Shared backup and restore service for all ClickFlash applications**

## Installation

```bash
npm install @clickflash/backup-service
```

## Quick Start

```javascript
const BackupService = require('@clickflash/backup-service');

// Initialize service
const backup = new BackupService({
    appName: 'master-portal',
    dataDir: './data',
    backupDir: './backups',
    compression: true,
    retention: {
        daily: 7,    // Keep 7 daily backups
        weekly: 4,   // Keep 4 weekly backups
        monthly: 12  // Keep 12 monthly backups
    }
});

// Create a backup
const result = await backup.createBackup('daily');
console.log('Backup created:', result.name);

// List backups
const backups = await backup.listBackups();
console.log('Available backups:', backups);

// Restore from backup
await backup.restoreBackup('backup-daily-2026-01-31T10-00-00-000Z');
console.log('Restore completed');
```

## Features

- ✅ **Automated Backups** - Schedule daily, weekly, monthly backups
- ✅ **Compression** - ZIP compression to save space
- ✅ **Retention Policy** - Automatic cleanup of old backups
- ✅ **Point-in-Time Recovery** - Restore to any backup
- ✅ **Integrity Verification** - Check backup validity
- ✅ **Restore Points** - Automatic restore points before restoration

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appName` | string | 'unknown' | Application identifier |
| `dataDir` | string | './data' | Data directory to backup |
| `backupDir` | string | './backups' | Backup storage directory |
| `compression` | boolean | true | Enable ZIP compression |
| `retention` | object | `{daily:7,weekly:4,monthly:12}` | Retention policy |

### Methods

#### `createBackup(type, options)`
Create a new backup.
- `type`: 'daily' | 'weekly' | 'monthly' | 'restore-point'
- Returns: `{ success, name, path, manifest }`

#### `listBackups(type?)`
List available backups.
- `type`: Optional filter by type
- Returns: Array of backup objects

#### `restoreBackup(name, options)`
Restore from a backup.
- `name`: Backup name
- `options.skipRestorePoint`: Skip creating restore point

#### `verifyBackup(name)`
Verify backup integrity.
- Returns: `{ valid, manifest?, error? }`

#### `scheduleBackups(schedule)`
Schedule automatic backups.

## Backup Structure

```
backups/
├── daily/
│   ├── backup-daily-2026-01-31T10-00-00-000Z.zip
│   └── backup-daily-2026-01-31T10-00-00-000Z.json (manifest)
├── weekly/
│   └── backup-weekly-...
└── monthly/
    └── backup-monthly-...
```

## Backup Contents

- **Database** - SQLite database files
- **Uploads** - User uploaded files/photos
- **Config** - Environment files and settings

## Usage in Apps

### Master Portal / Touch Kiosk

```javascript
const BackupService = require('@clickflash/backup-service');

const backup = new BackupService({
    appName: 'master-portal',
    dataDir: './data',
    backupDir: './data/backup'
});

// Schedule daily backups
backup.scheduleBackups({
    daily: '0 2 * * *',     // 2 AM daily
    weekly: '0 3 * * 0',    // 3 AM Sunday
    monthly: '0 4 1 * *'    // 4 AM 1st of month
});
```

### Management Hub / Customer Gallery

```javascript
const BackupService = require('@clickflash/backup-service');

const backup = new BackupService({
    appName: 'management-hub',
    dataDir: './pb_data',
    backupDir: './pb_data/backup'
});

// Manual backup endpoint
app.post('/api/backup', async (req, res) => {
    const result = await backup.createBackup(req.body.type || 'manual');
    res.json(result);
});

// Restore endpoint
app.post('/api/restore', async (req, res) => {
    await backup.restoreBackup(req.body.backupName);
    res.json({ success: true });
});
```

## License

Private - ClickFlash Photography Solutions
