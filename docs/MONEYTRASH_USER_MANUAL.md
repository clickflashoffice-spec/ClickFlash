# MoneyTrash User Manual

## Overview

MoneyTrash is a secure upload gateway for professional photographers, enabling fast and reliable photo uploads to cloud storage with multi-cloud redundancy.

## Getting Started

### First Launch

1. Launch MoneyTrash from the Start Menu or desktop shortcut
2. Configure your Master Portal connection URL
3. Set your upload preferences
4. You're ready to upload!

### Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│  MoneyTrash                              [Settings] [X]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │              DROP FILES HERE                         │   │
│  │              or click to browse                      │   │
│  │                                                      │   │
│  │         Supports: JPG, PNG, RAW, HEIC              │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Mode: [Studio] [Event] [Manual]                           │
│                                                             │
│  ──────────────────────────────────────────────────────     │
│                                                             │
│  Recent Uploads                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📁 Wedding_Johnson_2026     150 photos   Done ✓    │   │
│  │ 📁 Corporate_Event_ABC       89 photos    45% ███░ │   │
│  │ 📁 Birthday_Maria            32 photos    12% █░░░  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ──────────────────────────────────────────────────────     │
│                                                             │
│  Storage: 45.2 GB / 100 GB used                           │
│  Cloud: S3 + R2 Mirrored ✓                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Upload Modes

### Studio Mode

Best for controlled environments (studio sessions).

**Features:**
- Automatic album naming from session
- Instant upload on file drop
- Metadata extraction (EXIF)

```yaml
Mode Settings:
  autoAlbumName: true
  namingPattern: "{Date}_{EventName}"
  uploadImmediately: true
```

### Event Mode

For on-location events with multiple photographers.

**Features:**
- Continuous monitoring of drop folder
- Batch uploads at intervals
- Priority queue management

```yaml
Mode Settings:
  watchFolder: "C:\Photos\Events"
  batchInterval: 300  # seconds
  priorityQueue: true
```

### Manual Mode

Full control over uploads.

**Features:**
- Drag-and-drop uploads
- Manual album creation
- Selective upload

## Upload Process

### Standard Upload

1. Select mode (Studio/Event/Manual)
2. Drag photos onto the drop zone (or click to browse)
3. Review file list and adjust if needed
4. Click "Start Upload"
5. Monitor progress
6. Receive notification when complete

### With Metadata

MoneyTrash automatically extracts and preserves:
- EXIF data (camera, lens, settings)
- GPS coordinates (if available)
- Date/time taken
- Photographer attribution

## Cloud Storage

### Multi-Cloud Mirroring

MoneyTrash automatically mirrors uploads to both:

| Provider | Use Case | Region |
|----------|----------|--------|
| AWS S3 | Primary storage | us-east-1 |
| Cloudflare R2 | Geo-redundancy | Auto |

### Checksum Verification

Every file is verified after upload:

```
File: photo_001.jpg
Size: 4.2 MB
SHA-256: a1b2c3d4e5f6...
Status: ✓ Verified
```

If verification fails:
1. Automatic retry (up to 3 times)
2. Notification of failure
3. Manual retry option

## Settings

### Connection Settings

```yaml
Server:
  URL: http://localhost:8090
  Timeout: 300  # seconds
  Retry: 3

Authentication:
  Method: HMAC-SHA256
  KeyID: auto-generated
```

### Upload Settings

```yaml
Upload:
  chunkSize: 1MB
  parallelChunks: 3
  maxConcurrent: 5
  bandwidthLimit: 0  # 0 = unlimited

Quality:
  preserveExif: true
  generatePreview: true
  optimizeThumbnails: true
```

### Storage Settings

```yaml
Local:
  tempFolder: "%TEMP%\MoneyTrash"
  cleanupAfterUpload: true
  minDiskSpace: 5GB

Cloud:
  redundancy: "mirror"  # mirror | single | custom
  compression: false
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Upload stuck at 0% | Check server URL is correct |
| Connection timeout | Increase timeout in settings |
| File rejected | Check file type is supported |
| Duplicate photos | Enable "skip duplicates" option |
| Low upload speed | Check bandwidth limit settings |

### View Logs

```powershell
# Open log folder
explorer "$env:APPDATA\MoneyTrash\logs"

# Recent log entries
Get-Content "$env:APPDATA\MoneyTrash\logs\moneytrash.log" -Tail 50
```

### Reset Connection

```powershell
# Reset server connection
& "C:\Program Files\MoneyTrash\configure.exe" --reset-server

# Full re-authentication
& "C:\Program Files\MoneyTrash\configure.exe" --reauthenticate
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open file browser |
| Ctrl+U | Start upload |
| Ctrl+S | Pause upload |
| Delete | Remove selected files |
| Ctrl+, | Open settings |

## Command Line

MoneyTrash supports headless operation:

```powershell
# Upload specific folder
& "C:\Program Files\MoneyTrash\moneytrash.exe" upload "C:\Photos\Event" --mode studio

# Check sync status
& "C:\Program Files\MoneyTrash\moneytrash.exe" status

# Clear local cache
& "C:\Program Files\MoneyTrash\moneytrash.exe" --clear-cache
```

## Data & Privacy

### Local Data

- Temp files cleaned after successful upload
- No photos stored permanently on local machine
- Logs retained for 30 days

### Cloud Data

- All uploads encrypted in transit (TLS 1.3)
- Stored encrypted at rest (AES-256)
- Access logged with timestamps

### GDPR Compliance

- Photos deleted from cloud on request
- Export all data feature available
- Privacy policy at: clickflash.com/privacy

## Support

### Documentation

Full documentation: docs.clickflash.com/moneytrash

### Contact

- Email: support@clickflash.com
- Phone: 1-800-CLICKFX
- Hours: Mon-Fri 9am-6pm EST

### Logs Location

```
%APPDATA%\MoneyTrash\logs\
├── moneytrash.log       # Main application log
├── upload.log          # Upload-specific logs
├── sync.log            # Sync operation logs
└── errors.log          # Error logs
```
