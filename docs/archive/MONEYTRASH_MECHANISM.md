# MoneyTrash System - Technical Documentation

## Overview

MoneyTrash is an automated photo monetization system that identifies **unsold photos** from past events and offers them to customers via a **retention gallery** before archiving. It bridges the gap between photo expiration and lost revenue.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MONEYTRASH WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │  Import      │───▶│  Orders      │───▶│  Retention   │───▶│  Cloud   │  │
│  │  Photos      │    │  Tracking    │    │  Check       │    │  Gallery │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
│        │                  │                    │                  │         │
│        │                  │                    │                  │         │
│        ▼                  ▼                    ▼                  ▼         │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                    UNSOLD DETECTION LOGIC                         │     │
│   │  ┌────────────────────────────────────────────────────────────┐  │     │
│   │  │  1. Photo imported on Day 0                                 │  │     │
│   │  │  2. Check orders for photo ID after 15-29 days              │  │     │
│   │  │  3. If NOT found in paid orders → MARK AS UNSOLD            │  │     │
│   │  │  4. Watermark and upload to cloud retention gallery         │  │     │
│   │  │  5. Send retention email to customer                        │  │     │
│   │  └────────────────────────────────────────────────────────────┘  │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Mechanism

### 1. Detection Algorithm

The system compares **imported photos** against **order photos** to find unsold items:

```sql
-- Pseudocode for unsold photo detection
SELECT 
    p.id,
    p.name,
    p.albumId,
    p.created_at
FROM photos p
WHERE 
    -- Photo is older than retention period (e.g., 15 days)
    p.created_at < DATE('now', '-15 days')
    
    -- Photo hasn't been synced to cloud yet
    AND p.sync_status != 'synced'
    
    -- Photo is NOT in any paid order
    AND p.id NOT IN (
        SELECT asset_id FROM fulfillment_queue
    )
    
    -- Photo is NOT already in retention queue
    AND p.id NOT IN (
        SELECT asset_id FROM retention_queue WHERE status = 'pending'
    )
    
    -- Photo is NOT marked as excluded
    AND p.sync_status != 'excluded'
```

### 2. Sold vs Unsold Determination

| Criteria | Sold Photo | Unsold Photo |
|----------|------------|--------------|
| **Order Lookup** | Found in `orders` table with `status = 'paid'` or `'fulfilled'` | Not found in orders, or only in cancelled orders |
| **Time Check** | N/A | Created > retention days ago (default: 15) |
| **Action** | Ignored by MoneyTrash | Watermarked, uploaded to cloud, customer emailed |

**Code Reference:** `backend/services/MoneyTrashService.ts:145-164`
```typescript
private async isPhotoSold(filename: string, albumId: string): Promise<boolean> {
    // 1. Find photo in database
    const photoParams = this.dbManager.get<{ id: string }>(
        "SELECT id FROM photos WHERE originalFilename = ? AND albumId = ?",
        [filename, albumId]
    );
    if (!photoParams) return false;

    // 2. Check if photo appears in any PAID order
    const count = this.dbManager.get<{ c: number }>(
        "SELECT count(*) as c FROM orders WHERE items LIKE ? AND status IN ('paid', 'fulfilled')",
        [`%${photoParams.id}%`]
    );

    return (count?.c || 0) > 0; // true = sold, false = unsold
}
```

---

## Data Flow

### Phase 1: Import & Tracking

```
┌──────────────────────────────────────────────────────────────┐
│                        IMPORT PHASE                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   Photographer imports photos via:                           │
│   • ImportAlbumModal (drag & drop)                           │
│   • Folder monitor (auto-import)                             │
│   • Manual upload                                            │
│                                                               │
│   Photos stored in: /uploads/{albumId}/                      │
│   Generated variants: _preview.webp, _tiny.webp              │
│                                                               │
│   Database record created:                                   │
│   • photos.id = UUID                                         │
│   • photos.albumId = Album reference                         │
│   • photos.created_at = Import timestamp                     │
│   • photos.sync_status = 'pending'                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Phase 2: Order Tracking

```
┌──────────────────────────────────────────────────────────────┐
│                        ORDER PHASE                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   Customer places order:                                     │
│   • Selects photos in Touch Kiosk                            │
│   • Pays via cash/card/stripe                                │
│                                                               │
│   Order record created:                                      │
│   • orders.id = Order UUID                                   │
│   • orders.items = JSON array of photo IDs                   │
│   • orders.status = 'pending' → 'paid'                       │
│                                                               │
│   Paid photos added to: fulfillment_queue                    │
│   (Prevents MoneyTrash from claiming sold photos)            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Phase 3: Retention Scan

```
┌──────────────────────────────────────────────────────────────┐
│                     RETENTION SCAN                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   Trigger: Every 24 hours (configurable)                     │
│                                                               │
│   1. Calculate cutoff date:                                  │
│      cutoff = NOW() - retentionDays (default: 15 days)       │
│                                                               │
│   2. Find candidate photos:                                  │
│      SELECT * FROM photos                                    │
│      WHERE created_at < cutoff_date                          │
│      AND sync_status != 'synced'                             │
│      AND id NOT IN (fulfillment_queue)                       │
│      AND id NOT IN (retention_queue)                         │
│                                                               │
│   3. For each candidate:                                     │
│      a. Check if sold (isPhotoSold())                        │
│      b. If unsold → Add to retention_queue                   │
│      c. Apply watermark                                      │
│      d. Upload to cloud gallery                              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Phase 4: Cloud Upload & Customer Notification

```
┌──────────────────────────────────────────────────────────────┐
│                     CLOUD UPLOAD                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   1. Authenticate with cloud service                         │
│      POST {cloudApiUrl}/api/auth/login                       │
│                                                               │
│   2. Upload watermarked preview:                             │
│      POST {cloudApiUrl}/api/collections/assets/records       │
│      Body (multipart/form-data):                             │
│      • collectionId = album_cloud_id                         │
│      • status = 'unsold'                                     │
│      • price = $4.99 (configurable)                          │
│      • original_id = local photo ID                          │
│      • desk_id = MASTER_01                                   │
│      • preview_file = watermarked_webp                       │
│                                                               │
│   3. Send retention email:                                   │
│      "Your photos are expiring soon! Buy now for $4.99"      │
│                                                               │
│   4. Update local status:                                    │
│      UPDATE photos SET sync_status = 'synced' WHERE id = ?   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Key Tables

```sql
-- Photos table (local)
CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    albumId TEXT NOT NULL,
    name TEXT,
    url TEXT,                    -- Relative path to file
    originalFilename TEXT,
    created_at TEXT,             -- ISO timestamp
    sync_status TEXT DEFAULT 'pending',  -- 'pending' | 'synced' | 'excluded'
    FOREIGN KEY (albumId) REFERENCES albums(id)
);

-- Orders table
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    items TEXT,                  -- JSON: [{"photoId": "xxx", ...}]
    status TEXT,                 -- 'pending' | 'paid' | 'fulfilled' | 'cancelled'
    total REAL,
    created_at TEXT
);

-- Retention Queue (MoneyTrash candidates)
CREATE TABLE retention_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,      -- Photo ID
    status TEXT DEFAULT 'pending', -- 'pending' | 'uploading' | 'synced' | 'failed'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (album_id) REFERENCES albums(id),
    FOREIGN KEY (asset_id) REFERENCES photos(id)
);

-- Fulfillment Queue (sold photos to deliver)
CREATE TABLE fulfillment_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    album_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,      -- Photo ID
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Gallery Settings (MoneyTrash config)
CREATE TABLE gallery_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT           -- JSON: { enabled, retentionDays, price, ... }
);
```

---

## Configuration

### Frontend Settings (`MoneyTrash.tsx`)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | false | Master switch for MoneyTrash |
| `retentionDays` | number | 7 | Days before photo is considered for retention |
| `price` | number | 4.99 | Price per photo in retention gallery |
| `watermarkEnabled` | boolean | true | Apply watermark to retention photos |
| `watermarkOpacity` | number | 0.5 | Watermark visibility (0-1) |

### Backend Configuration

Stored in `gallery_settings` table as JSON:
```json
{
  "enabled": true,
  "retentionMinutes": 10080,     // 7 days in minutes
  "price": "15.00",
  "watermarkEnabled": true,
  "watermarkOpacity": 0.5
}
```

---

## API Endpoints

### Cloud Service Routes (`backend/routes/cloud.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cloud/status` | GET | Get cloud connection status |
| `/api/cloud/stats` | GET | Get queue sizes and config |
| `/api/cloud/candidates` | GET | List photos eligible for retention |
| `/api/cloud/candidates/:id/action` | POST | Process candidate (exclude/upload/delete) |
| `/api/cloud/queue/pause` | POST | Pause sync queue |
| `/api/cloud/queue/resume` | POST | Resume sync queue |
| `/api/cloud/queue/purge` | POST | Clear retention queue |
| `/api/cloud/retention` | POST | Manually trigger retention batch |

### Frontend Service (`cloudService.ts`)

```typescript
cloudService.getStats()        // Get queue sizes
cloudService.getCandidates()   // Get retention candidates
cloudService.processCandidate(id, action)  // Exclude/upload/delete
cloudService.triggerRetention() // Manual retention trigger
```

---

## Retention Candidates UI

The MoneyTrash page displays candidates that match the criteria:

```typescript
interface RetentionCandidate {
    id: string;           // Photo ID
    name: string;         // Filename
    url: string;          // Thumbnail URL
    albumId: string;      // Album reference
    albumTitle: string;   // Album name
    created_at: string;   // Import date
}
```

### Manual Actions
Users can manually process candidates:
- **Upload** → Immediately upload to cloud
- **Exclude** → Mark as excluded (won't be processed)
- **Delete** → Remove from candidates

---

## File Architecture

```
backend/
├── services/
│   ├── MoneyTrashService.ts      # Core retention logic
│   └── cloudSyncService.ts       # Cloud upload/sync
├── routes/
│   └── cloud.ts                  # API endpoints
└── shared/
    └── migrations/
        └── 001_add_queues.sql    # retention_queue, fulfillment_queue

frontend/
├── components/
│   └── MoneyTrash.tsx            # Main UI
└── services/
    └── api/
        └── cloudService.ts       # API client
```

---

## Key Workflows

### Daily Automated Scan

```
┌─────────┐     ┌─────────────┐     ┌─────────────────┐     ┌──────────┐
│ CronJob │────▶│ Retention   │────▶│ Find Unsold     │────▶│ Watermark│
│ (Daily) │     │ Batch       │     │ Photos (15+ days)│     │ & Upload │
└─────────┘     └─────────────┘     └─────────────────┘     └──────────┘
                                                                   │
                                                                   ▼
                                                            ┌──────────┐
                                                            │ Send     │
                                                            │ Email    │
                                                            └──────────┘
```

### Customer Purchase Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Retention   │───▶│ Customer    │───▶│ Stripe      │───▶│ Fulfillment │
│ Gallery     │    │ Buys Photo  │    │ Payment     │    │ (Deliver    │
│ (Cloud)     │    │ ($4.99)     │    │             │    │ Original)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No candidates showing | Retention period too short | Increase `retentionDays` |
| Photos not uploading | Cloud credentials missing | Set `CLOUD_EMAIL`, `CLOUD_PASSWORD` env vars |
| Sold photos appearing | Order status not 'paid' | Check order payment status |
| Queue stuck | Service paused | Click "Resume Sync" |

### Debug Queries

```sql
-- Check retention candidates
SELECT p.id, p.name, p.created_at, a.title 
FROM photos p
JOIN albums a ON p.albumId = a.id
WHERE p.created_at < DATE('now', '-15 days')
AND p.sync_status = 'pending';

-- Check queue status
SELECT status, COUNT(*) FROM retention_queue GROUP BY status;

-- Find sold photos that shouldn't be in retention
SELECT p.id, p.name 
FROM photos p
JOIN orders o ON o.items LIKE '%' || p.id || '%'
WHERE o.status IN ('paid', 'fulfilled');
```

---

## Summary

MoneyTrash transforms **storage liability** into **revenue opportunity** by:

1. **Tracking** all imported photos with timestamps
2. **Comparing** against paid orders to identify unsold items
3. **Watermarking** unsold photos to protect IP
4. **Uploading** to cloud retention gallery
5. **Emailing** customers with purchase offers
6. **Fulfilling** orders with original high-res files

The system runs automatically, respects customer purchases, and gives photographers a second chance to monetize their work.
