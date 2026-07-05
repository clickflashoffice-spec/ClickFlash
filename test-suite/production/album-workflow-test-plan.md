# ClickFlash Production Test Plan - Album Workflow

> **Test Album:** `C:\Users\alamo\Desktop\album`  
> **Photos:** 28 files (~29MB)  
> **Types:** JPG, WEBP  
> **Date:** June 14, 2026  
> **Tester:** Automated Production Test Suite

---

## TEST ALBUM SPECIFICATION

### Album Contents

| Property | Value |
|----------|-------|
| **Path** | `C:\Users\alamo\Desktop\album` |
| **Total Files** | 28 |
| **Total Size** | ~29 MB |
| **Formats** | JPG (24), WEBP (4) |
| **Photo Types** | Portrait, couple, mermaid/beach, event |
| **Resolution Range** | ~200KB - 9MB per photo |
| **Date Range** | Jan 2025 - Apr 2025 |

### Sample Photos

| Filename | Size | Type | Description |
|----------|------|------|-------------|
| `1a5aeeb8-c8ee-4991-abcb-a9a08b5aa7a5.jpg` | 603KB | Portrait | Studio portrait |
| `4_20230617205428_20818721_large.jpg` | 213KB | Event | Event photography |
| `couple-photography-00026.webp` | 254KB | Couple | Couple session |
| `IMG_7159.jpg` | 263KB | Portrait | Portrait session |
| `IMG-20250701-WA0008.jpg` | 258KB | Event | WhatsApp export |
| `MAR_0304 (1).JPG` | 1.9MB | Mermaid | Beach/mermaid theme |
| `MAR_0396 (1).JPG` | 9.2MB | Mermaid | High-res beach photo |
| `Mermaid-Photo-Session_08.jpg` | 976KB | Mermaid | Mermaid session |
| `Mermaid-Photoshoot-on-the-Beach-image-1.webp` | 62KB | Mermaid | WebP beach |

---

## PRODUCTION TEST SCENARIOS

### Scenario 1: Album Import (Master)

**Objective:** Verify album creation and photo import functionality

**Steps:**
1. Create new album "Production Test Album - June 2026"
2. Import all 28 photos from `C:\Users\alamo\Desktop\album`
3. Verify thumbnails generated for all photos
4. Verify metadata extracted (EXIF, dimensions, file size)
5. Verify photos stored in SQLite database
6. Verify photos backed up to local storage

**Expected Results:**
- Album created with correct name
- All 28 photos imported successfully
- Thumbnails generated (200x200, 800x800)
- Metadata extracted for each photo
- Database entries created in `albums` and `photos` tables
- No errors in import log

**Validation Queries:**
```sql
-- Check album created
SELECT * FROM albums WHERE title = 'Production Test Album - June 2026';

-- Check all photos imported
SELECT COUNT(*) FROM photos WHERE album_id = '<album_id>';
-- Expected: 28

-- Check photo metadata
SELECT filename, width, height, file_size, created_at 
FROM photos 
WHERE album_id = '<album_id>';
```

---

### Scenario 2: Photo Editing (Master)

**Objective:** Verify photo editing capabilities

**Steps:**
1. Select photo from imported album
2. Apply auto-enhance (brightness, contrast, saturation)
3. Apply filter (black & white, sepia, vintage)
4. Crop photo to 4:5 ratio (Instagram)
5. Rotate photo 90 degrees
6. Save edited version as new photo
7. Verify original preserved

**Expected Results:**
- Edit applied successfully
- New photo created with edit metadata
- Original photo unchanged
- Edit history tracked in database
- Thumbnails regenerated for edited photo

---

### Scenario 3: Album Sync to Touch Kiosk

**Objective:** Verify album synchronization between Master and Touch

**Prerequisites:**
- Touch Kiosk paired with Master (HMAC-SHA256 verified)
- LAN connection established

**Steps:**
1. Mark album as "Ready for Kiosk"
2. Trigger sync to Touch Kiosk
3. Verify HMAC-SHA256 signature on all requests
4. Verify album metadata transferred
5. Verify all 28 photos transferred with thumbnails
6. Verify sync completion on Touch Kiosk
7. Check sync log for errors

**Expected Results:**
- Album appears on Touch Kiosk within 30 seconds
- All 28 photos visible with thumbnails
- Photo metadata correct (title, description, price)
- Sync log shows success for all items
- Vector clock updated on both devices

**Validation:**
```
Master → Touch: POST /api/sync/albums (HMAC signed)
Touch → Master: POST /api/sync/ack (HMAC signed)
```

---

### Scenario 4: Customer Photo Selection (Touch Kiosk)

**Objective:** Verify customer can browse and select photos

**Steps:**
1. Customer opens Touch Kiosk
2. Browses "Production Test Album - June 2026"
3. Selects 5 photos for purchase
4. Adds photos to order
5. Enters customer email
6. Submits order

**Expected Results:**
- Album loads with all 28 photos
- Customer can select/deselect photos
- Order total calculated correctly
- Customer email validated
- Order submitted successfully
- Order appears on Master within 5 seconds

---

### Scenario 5: Order Management (Master)

**Objective:** Verify order lifecycle management

**Steps:**
1. Master receives order from Touch Kiosk
2. Verify order details (photos, customer email, total)
3. Process payment (Stripe test mode)
4. Mark order as "Paid"
5. Generate print job
6. Mark order as "Fulfilled"
7. Send email confirmation to customer

**Expected Results:**
- Order appears in Master dashboard
- Payment processed successfully
- Print job generated with correct photos
- Order status updated correctly
- Email sent to customer
- Order archived after fulfillment

---

### Scenario 6: Cloud Upload (Master → Cloudflare)

**Objective:** Verify cloud synchronization

**Steps:**
1. Master initiates cloud sync
2. Upload album metadata to Management Hub
3. Upload photos to R2 storage (presigned URLs)
4. Verify D1 database updated with album/photo records
5. Verify R2 objects created with correct desk_id prefix
6. Check sync status in Management Hub

**Expected Results:**
- Album metadata uploaded to D1
- Photos uploaded to R2 (`uploads/{desk_id}/photos/`)
- Sync status shows "Completed"
- No errors in sync log
- Vector clock updated

**Validation Queries:**
```sql
-- Check album in cloud D1
SELECT * FROM albums WHERE desk_id = '<desk_id>' AND title = 'Production Test Album - June 2026';

-- Check photos in cloud D1
SELECT COUNT(*) FROM photos WHERE desk_id = '<desk_id>' AND album_id = '<album_id>';
-- Expected: 28

-- Check R2 objects
-- List: uploads/{desk_id}/photos/{photo_id}.jpg
```

---

### Scenario 7: Gallery Publication (Cloud)

**Objective:** Verify customer gallery creation and sharing

**Steps:**
1. Master marks album as "Publish to Gallery"
2. Cloud sync publishes album to Gallery Worker
3. Generate shareable link with token
4. Open gallery link in browser
5. Verify all 28 photos visible
6. Verify photo download works
7. Verify Stripe checkout for paid photos

**Expected Results:**
- Gallery page loads with album
- All 28 photos displayed with thumbnails
- Shareable link works (e.g., `https://gallery.clicketflash.com/g/abc123`)
- Photo download generates presigned R2 URL
- Stripe checkout works for paid photos
- Gallery analytics tracked

---

### Scenario 8: MoneyTrash Upload (Unsold Photos)

**Objective:** Verify unsold photo monetization

**Steps:**
1. Identify 10 unsold photos from album
2. Select photos for MoneyTrash upload
3. Upload to MoneyTrash Worker (chunked, 1MB chunks)
4. Verify upload progress
5. Verify photos in MoneyTrash database
6. Verify photos stored in R2 (`uploads/{desk_id}/retention/`)
7. Set pricing for unsold photos

**Expected Results:**
- Photos uploaded successfully (chunked)
- Upload progress shown correctly
- Photos appear in MoneyTrash dashboard
- R2 objects created with retention prefix
- Pricing set correctly
- Photos available for purchase

---

### Scenario 9: Analytics & Reporting

**Objective:** Verify analytics tracking

**Steps:**
1. Check album analytics (views, selections, orders)
2. Check photo analytics (most viewed, most selected)
3. Check revenue analytics (total sales, per-photo revenue)
4. Check sync analytics (sync lag, success rate)
5. Generate daily report

**Expected Results:**
- Album views tracked
- Photo selections tracked
- Order conversions tracked
- Revenue calculated correctly
- Sync metrics healthy
- Report generated successfully

---

### Scenario 10: Backup & Recovery

**Objective:** Verify backup and disaster recovery

**Steps:**
1. Trigger manual backup of album
2. Verify backup file created (encrypted SQLite)
3. Verify backup uploaded to cloud storage
4. Delete album from Master (simulated disaster)
5. Restore album from backup
6. Verify all 28 photos restored
7. Verify metadata preserved

**Expected Results:**
- Backup file created with encryption
- Backup uploaded to cloud
- Album restored successfully
- All 28 photos restored with metadata
- Thumbnails regenerated
- No data loss

---

## AUTOMATED TEST EXECUTION

### Test Script Structure

```typescript
// test-suite/production/album-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { AlbumHelper } from './helpers/album';
import { PhotoHelper } from './helpers/photo';
import { OrderHelper } from './helpers/order';
import { CloudHelper } from './helpers/cloud';
import { TouchHelper } from './helpers/touch';

const TEST_ALBUM_PATH = 'C:\\Users\\alamo\\Desktop\\album';
const TEST_ALBUM_NAME = 'Production Test Album - June 2026';

test.describe('Production Album Workflow', () => {
  test.beforeAll(async () => {
    // Verify test album exists
    const albumFiles = await AlbumHelper.getPhotoFiles(TEST_ALBUM_PATH);
    expect(albumFiles.length).toBe(28);
  });

  test('Scenario 1: Album Import', async ({ page }) => {
    // Create album and import photos
    const album = await AlbumHelper.createAlbum(TEST_ALBUM_NAME);
    const imported = await AlbumHelper.importPhotos(album.id, TEST_ALBUM_PATH);
    
    expect(imported.count).toBe(28);
    expect(imported.errors).toHaveLength(0);
    
    // Verify database
    const photos = await AlbumHelper.getPhotos(album.id);
    expect(photos.length).toBe(28);
  });

  test('Scenario 2: Photo Editing', async ({ page }) => {
    // Select first photo
    const photo = await PhotoHelper.getFirstPhoto(TEST_ALBUM_NAME);
    
    // Apply edits
    const edited = await PhotoHelper.editPhoto(photo.id, {
      enhance: true,
      filter: 'vintage',
      crop: '4:5',
      rotate: 90
    });
    
    expect(edited.success).toBe(true);
    expect(edited.originalPreserved).toBe(true);
  });

  test('Scenario 3: Touch Kiosk Sync', async ({ page }) => {
    // Verify Touch Kiosk paired
    const kiosk = await TouchHelper.getPairedKiosk();
    expect(kiosk.status).toBe('connected');
    
    // Sync album
    const sync = await TouchHelper.syncAlbum(TEST_ALBUM_NAME);
    expect(sync.success).toBe(true);
    expect(sync.photosTransferred).toBe(28);
    
    // Verify on Touch
    const touchPhotos = await TouchHelper.getPhotos(TEST_ALBUM_NAME);
    expect(touchPhotos.length).toBe(28);
  });

  test('Scenario 4: Customer Order Flow', async ({ page }) => {
    // Customer selects photos on Touch
    const order = await TouchHelper.createOrder({
      albumName: TEST_ALBUM_NAME,
      selectedPhotos: 5,
      customerEmail: 'test@example.com'
    });
    
    expect(order.success).toBe(true);
    expect(order.total).toBeGreaterThan(0);
    
    // Verify on Master
    const masterOrder = await OrderHelper.getOrder(order.id);
    expect(masterOrder.status).toBe('pending');
  });

  test('Scenario 5: Cloud Upload', async ({ page }) => {
    // Trigger cloud sync
    const sync = await CloudHelper.syncAlbum(TEST_ALBUM_NAME);
    expect(sync.success).toBe(true);
    expect(sync.photosUploaded).toBe(28);
    
    // Verify D1
    const cloudAlbum = await CloudHelper.getAlbum(TEST_ALBUM_NAME);
    expect(cloudAlbum.photos.length).toBe(28);
    
    // Verify R2
    const r2Objects = await CloudHelper.getR2Objects(TEST_ALBUM_NAME);
    expect(r2Objects.length).toBe(28);
  });

  test('Scenario 6: Gallery Publication', async ({ page }) => {
    // Publish album
    const gallery = await CloudHelper.publishAlbum(TEST_ALBUM_NAME);
    expect(gallery.success).toBe(true);
    expect(gallery.url).toContain('gallery.clicketflash.com');
    
    // Verify gallery page
    await page.goto(gallery.url);
    await expect(page.locator('.gallery-photo')).toHaveCount(28);
  });
});
```

---

## MANUAL TEST CHECKLIST

### Pre-Test Setup

- [ ] Master Station running (port 8090)
- [ ] Touch Kiosk paired and connected
- [ ] Cloud sync configured (JWT token valid)
- [ ] Test album folder accessible (`C:\Users\alamo\Desktop\album`)
- [ ] Stripe test mode configured
- [ ] Sentry DSN configured (for error tracking)

### Test Execution

- [ ] **Scenario 1:** Album Import - All 28 photos imported
- [ ] **Scenario 2:** Photo Editing - Edit applied, original preserved
- [ ] **Scenario 3:** Touch Sync - Album visible on Touch Kiosk
- [ ] **Scenario 4:** Customer Selection - Order created successfully
- [ ] **Scenario 5:** Order Management - Payment processed, print job generated
- [ ] **Scenario 6:** Cloud Upload - Album in D1, photos in R2
- [ ] **Scenario 7:** Gallery Publication - Gallery page loads, photos visible
- [ ] **Scenario 8:** MoneyTrash Upload - Unsold photos uploaded
- [ ] **Scenario 9:** Analytics - Metrics tracked correctly
- [ ] **Scenario 10:** Backup/Recovery - Backup created, restore successful

### Post-Test Validation

- [ ] No errors in Master logs
- [ ] No errors in Touch Kiosk logs
- [ ] No errors in Cloudflare Worker logs
- [ ] Sentry shows no new errors
- [ ] Database consistency verified
- [ ] R2 storage usage reasonable
- [ ] Sync status healthy

---

## PERFORMANCE BENCHMARKS

| Metric | Target | Measurement |
|--------|--------|-------------|
| Album Import (28 photos) | < 30 seconds | Time from start to completion |
| Thumbnail Generation | < 5 seconds per photo | Sharp processing time |
| Touch Sync (28 photos) | < 60 seconds | LAN transfer time |
| Cloud Upload (28 photos) | < 5 minutes | Internet upload time |
| Gallery Page Load | < 3 seconds | Time to first photo visible |
| Order Processing | < 10 seconds | Payment to confirmation |
| Backup Creation | < 2 minutes | SQLite backup + encryption |
| Restore from Backup | < 3 minutes | Restore + thumbnail regeneration |

---

## KNOWN ISSUES & WORKAROUNDS

| Issue | Workaround | Fix Priority |
|-------|-----------|--------------|
| Large photos (>5MB) may timeout | Increase upload timeout to 60s | High |
| WebP thumbnails may fail | Convert to JPG first | Medium |
| Touch sync may fail on weak LAN | Retry with exponential backoff | Medium |
| Cloud sync may fail on slow internet | Chunked upload with resume | High |
| Gallery may not load on first try | Refresh page (cache issue) | Low |

---

*Document generated for ClickFlash Production Testing*  
*Test Album: C:\Users\alamo\Desktop\album (28 photos, ~29MB)*  
*Date: June 14, 2026*
