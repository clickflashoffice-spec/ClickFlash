# Orders & MoneyTrash Upload System Audit

## Executive Summary

This document audits the flow of orders and photos from Master Stations to the Customer Gallery cloud system, identifying critical gaps in multi-master synchronization.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CURRENT ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐        ┌─────────────────────┐                     │
│  │   MASTER STATION    │        │  MANAGEMENT HUB     │                     │
│  │   (Local SQLite)    │        │  (Cloudflare D1)    │                     │
│  │                     │        │                     │                     │
│  │  ┌───────────────┐  │        │  ┌───────────────┐  │                     │
│  │  │ orders        │──┼────────┼─▶│ orders        │  │                     │
│  │  │ operation_logs│──┼────────┼─▶│ operation_logs│  │                     │
│  │  │ photos        │──┼────────┼─▶│ photos        │  │                     │
│  │  └───────────────┘  │        │  └───────────────┘  │                     │
│  │                     │        │                     │                     │
│  │  ┌───────────────┐  │        │  ┌───────────────┐  │                     │
│  │  │ retention_q   │──┼────────┼─▶│ ???           │  │                     │
│  │  │ (unsold)      │  │        │  │               │  │                     │
│  │  └───────────────┘  │        │  └───────────────┘  │                     │
│  └──────────┬──────────┘        └─────────────────────┘                     │
│             │                                                                │
│             │ POST /api/cloud/upload-photo                                   │
│             │ (But endpoint expects different fields!)                       │
│             ▼                                                                │
│  ┌─────────────────────┐                                                     │
│  │  GALLERY BACKEND    │                                                     │
│  │  (Customer Facing)  │                                                     │
│  │                     │                                                     │
│  │  Expects: orderId   │                                                     │
│  │  Expects: photoId   │                                                     │
│  │  Expects: albumId   │                                                     │
│  │  Expects: file      │                                                     │
│  │                     │                                                     │
│  └─────────────────────┘                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Issues Identified

### Issue 1: Field Mismatch in Upload Endpoint

**Problem**: Master sends fields that don't match Gallery backend expectations

**Master sends** (`cloudSyncService.ts:1107-1114`):
```typescript
form.append('collectionId', albumId);  // ❌ Gallery expects 'albumId'
form.append('status', 'unsold');       // ❌ Gallery doesn't use this
form.append('price', this.config.price); // ❌ Gallery doesn't use this
form.append('original_id', assetId);   // ❌ Gallery expects 'photoId'
form.append('desk_id', this.deskId);   // ❌ Not handled
form.append('name', baseName);         // ❌ Not used
form.append('preview_file', fs.createReadStream(filePath)); // ❌ Gallery expects 'file'
```

**Gallery expects** (`gallery/backend/routes/syncRoutes.js:141-144`):
```typescript
const orderId = getField(fields.orderId);     // ✅ Not sent by Master
const photoId = getField(fields.photoId);     // ❌ Master sends 'original_id'
const albumId = getField(fields.albumId);     // ❌ Master sends 'collectionId'
const manualEdits = getField(fields.manualEdits);
const file = getFile(files.file);             // ❌ Master sends 'preview_file'
```

**Impact**: Retention uploads fail because Gallery backend can't parse the request

---

### Issue 2: Missing Retention Gallery Endpoint

**Problem**: There's no dedicated endpoint for MoneyTrash retention uploads

The Gallery backend's `/api/cloud/upload-photo` is designed for order fulfillment (high-res photos), not for retention gallery uploads (watermarked unsold photos).

**Current flow**:
1. MoneyTrash marks photos as 'archived' and adds to `retention_queue`
2. QueueProcessor watermarks the photos
3. QueueProcessor calls `cloudService.uploadRetentionAsset()`
4. Upload fails due to field mismatch

**Expected flow**:
1. MoneyTrash marks photos as 'archived' and adds to `retention_queue`
2. QueueProcessor watermarks the photos
3. Upload to **dedicated retention endpoint**
4. Gallery backend stores with `status = 'unsold'` and `desk_id`

---

### Issue 3: No Order Sync from Master to Gallery

**Problem**: Orders created locally on Master don't sync to Gallery

**Current state**:
- `pollPaidOrders()` - Pulls orders FROM Gallery to Master
- No mechanism to push local Master orders TO Gallery

**Impact**: 
- Customers can't view orders in Gallery
- Multi-master order consolidation impossible

---

### Issue 4: Missing Multi-Master Isolation in Gallery

**Problem**: Gallery backend doesn't properly isolate photos by `desk_id`

**Current query** (`gallery/backend/routes/syncRoutes.js:165-168`):
```sql
INSERT OR REPLACE INTO photos (id, albumId, url, manualEdits, fileHash, created_at, updated_at, desk_id, original_id)
```

**Issue**: While `desk_id` is stored, there's no filtering when customers query photos. A customer from MASTER_01 could see photos from MASTER_02.

---

## Data Flow Analysis

### MoneyTrash Flow (Currently Broken)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONEYTRASH FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Photo imported to Master                                     │
│     └─▶ photos.sync_status = 'pending'                          │
│                                                                  │
│  2. Retention period expires (e.g., 15 days)                     │
│     └─▶ MoneyTrashService.archiveExpiredPhotos()                │
│     └─▶ retention_queue.status = 'pending'                      │
│                                                                  │
│  3. QueueProcessor.processWatermark()                           │
│     └─▶ Generate watermarked preview                            │
│     └─▶ retention_queue.status = 'watermarked'                  │
│                                                                  │
│  4. QueueProcessor.processRetention()                           │
│     └─▶ cloudService.uploadRetentionAsset()                     │
│     └─▶ POST to /api/cloud/upload-photo                         │
│                                                                  │
│  5. ❌ GALLERY BACKEND                                          │
│     └─▶ Expects 'file' but gets 'preview_file'                  │
│     └─▶ Expects 'photoId' but gets 'original_id'                │
│     └─▶ ❌ UPLOAD FAILS                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Order Flow (Partially Working)

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORDER FLOW                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SCENARIO A: Gallery Order → Master (WORKING)                   │
│  ────────────────────────────────────────────                   │
│  1. Customer orders via Gallery                                 │
│  2. Gallery creates order in cloud                              │
│  3. Master polls: pollPaidOrders()                              │
│  4. Master downloads and fulfills                               │
│                                                                  │
│  SCENARIO B: Master Order → Gallery (BROKEN)                    │
│  ────────────────────────────────────────────                   │
│  1. Customer orders at Kiosk                                    │
│  2. Master creates local order                                  │
│  3. ❌ No sync to Gallery!                                      │
│  4. Customer can't view in Gallery                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Required Fixes

### Fix 1: Update Master Upload to Match Gallery

**File**: `apps/master/backend/services/cloudSyncService.ts`

Update `uploadRetentionAsset()` to send correct field names:

```typescript
// BEFORE (Broken)
form.append('collectionId', albumId);
form.append('original_id', assetId);
form.append('preview_file', fs.createReadStream(filePath));

// AFTER (Fixed)
form.append('albumId', albumId);
form.append('photoId', assetId);
form.append('file', fs.createReadStream(filePath));
```

### Fix 2: Add Retention Upload Endpoint to Gallery

**File**: `apps/gallery/backend/routes/syncRoutes.js`

Add new endpoint for retention uploads:

```javascript
// Route: POST /api/cloud/upload-retention
if (pathName === '/api/cloud/upload-retention' && req.method === 'POST') {
    // Handle watermarked unsold photo uploads
    // Store with status = 'unsold'
    // Make available for customer purchase
}
```

### Fix 3: Sync Master Orders to Gallery

**File**: `apps/master/backend/services/cloudSyncService.ts`

Add new sync method:

```typescript
public async syncOrdersToGallery() {
    // Fetch pending orders from local DB
    // POST to /api/cloud/sync-order on Gallery
    // Mark as synced
}
```

### Fix 4: Add desk_id Filtering to Gallery Queries

**File**: `apps/gallery/backend/src/server.ts`

Update photo queries to filter by desk_id:

```sql
-- Add desk_id filter based on album ownership
SELECT * FROM photos p
JOIN albums a ON p.albumId = a.id
WHERE a.desk_id = ? AND p.albumId = ?
```

---

## Multi-Master Considerations

### Photo ID Conflicts

**Problem**: Two Masters might generate the same photo ID (UUID collision unlikely but possible with integer IDs)

**Solution**: Use composite key `(desk_id, original_id)`:
```sql
PRIMARY KEY (desk_id, original_id)
```

### Album Isolation

**Problem**: Album IDs might collide across Masters

**Solution**: Prefix album IDs with desk_id in Gallery:
```typescript
const galleryAlbumId = `${deskId}_${localAlbumId}`;
```

### Order Consolidation

**Challenge**: Customer might have orders from multiple Masters

**Solution**: Hub aggregates orders by customer email:
```sql
SELECT * FROM orders 
WHERE email = 'customer@example.com'
ORDER BY date DESC
```

---

## Implementation Priority

### P0 (Critical - Blocks MoneyTrash)
1. Fix field mismatch in uploadRetentionAsset()
2. Add proper error handling for upload failures

### P1 (High - Required for Multi-Master)
3. Add order sync from Master to Gallery
4. Implement desk_id filtering in Gallery

### P2 (Medium - Enhancement)
5. Add retention-specific endpoint
6. Add upload progress tracking
7. Implement retry logic for failed uploads

---

## Testing Scenarios

### Scenario 1: Basic Retention Upload
```
1. Import photo to Master
2. Wait for retention period
3. Verify photo appears in Gallery (watermarked)
4. Customer can view and purchase
```

### Scenario 2: Multi-Master Isolation
```
1. Master A uploads photo with ID "photo123"
2. Master B uploads photo with ID "photo123"
3. Verify Gallery shows both as separate photos
4. Verify customers only see photos from their respective Masters
```

### Scenario 3: Order Sync
```
1. Create order at Master A Kiosk
2. Wait for sync
3. Verify order appears in Gallery
4. Customer can view and download
```

---

## Appendix: API Reference

### Master → Gallery Upload

**Endpoint**: `POST /api/cloud/upload-photo`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Fields** (Current - Broken):
```
collectionId: string
status: string
price: string
original_id: string
desk_id: string
name: string
preview_file: File
```

**Fields** (Required):
```
albumId: string
photoId: string
file: File
```

---

*Document Version: 1.0*  
*Audit Date: 2026-02-21*  
*Status: CRITICAL ISSUES IDENTIFIED*
