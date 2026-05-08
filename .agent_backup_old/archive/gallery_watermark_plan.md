# Gallery Watermark System - Implementation Plan

## Goal

Implement on-demand watermark generation for customer gallery/moneytrash feature. Watermarks generated **only when exporting to gallery**, not during photo import.

---

## Architecture Overview

**Trigger**: Gallery export endpoint (`POST /api/gallery/export`)  
**Generator**: Worker thread using Sharp  
**Storage**: Separate `gallery/watermarked/{albumId}/` folder  
**Source**: Original full-resolution photos  

**Flow**:

```
User exports album to gallery
  → API endpoint triggered
  → For each photo in album:
    → Check if watermarked version exists
    → If not, generate watermark (worker thread)
    → Store in gallery/watermarked/{albumId}/
  → Return gallery URL with watermarked photos
```

---

## Proposed Changes

### Component 1: Watermark Worker

**File**: [NEW] `backend/workers/watermarkWorker.ts`

**Purpose**: Generate watermarked version of single photo using Sharp.

**Implementation**:

```typescript
// Receives:
// - sourcePath: Original photo path
// - outputPath: Watermarked photo destination
// - watermarkConfig: { text, opacity, rotation, fontSize }

async function generateWatermark(job) {
    const { sourcePath, outputPath, config } = job;
    
    const metadata = await sharp(sourcePath).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 800;
    
    // Create SVG watermark
    const fontSize = config.fontSize || Math.floor(Math.min(width, height) * 0.1);
    const svgWatermark = Buffer.from(`
        <svg width="${width}" height="${height}">
            <style>
                .watermark { 
                    fill: rgba(255, 255, 255, ${config.opacity || 0.3}); 
                    font-size: ${fontSize}px; 
                    font-weight: bold; 
                    transform: rotate(${config.rotation || -45}deg); 
                }
            </style>
            <text x="50%" y="50%" text-anchor="middle" class="watermark">
                ${config.text || 'PROOF'}
            </text>
        </svg>
    `);
    
    // Apply watermark and save as WebP
    await sharp(sourcePath)
        .composite([{ input: svgWatermark, gravity: 'center' }])
        .webp({ quality: 80 })
        .toFile(outputPath);
}
```

**Benefits**:

- Worker thread (non-blocking)
- Customizable watermark
- WebP format (smaller file size)

---

### Component 2: Gallery Export Endpoint

**File**: [NEW] `backend/routes/gallery.ts`

**Route**: `POST /api/gallery/export`

**Request Body**:

```json
{
    "albumId": "uuid",
    "watermarkConfig": {
        "text": "PROOF",
        "opacity": 0.3,
        "rotation": -45,
        "fontSize": null  // auto-calculate
    }
}
```

**Response**:

```json
{
    "success": true,
    "galleryUrl": "http://gallery.example.com/albums/{albumId}",
    "watermarkedPhotos": [
        {
            "photoId": "uuid",
            "watermarkUrl": "gallery/watermarked/{albumId}/{photoId}.webp"
        }
    ],
    "stats": {
        "totalPhotos": 150,
        "generated": 150,
        "cached": 0,
        "processingTime": "45s"
    }
}
```

**Implementation**:

```typescript
router.post('/export', async (req, res) => {
    const { albumId, watermarkConfig } = req.body;
    
    // 1. Get all photos in album
    const photos = db.all('SELECT * FROM photos WHERE albumId = ?', [albumId]);
    
    // 2. Ensure watermark directory exists
    const watermarkDir = path.join(uploadDir, 'gallery', 'watermarked', albumId);
    fs.mkdirSync(watermarkDir, { recursive: true });
    
    // 3. Generate watermarks (parallel, with concurrency limit)
    const results = await Promise.all(
        photos.map(async (photo) => {
            const watermarkPath = path.join(watermarkDir, `${photo.id}.webp`);
            
            // Skip if already exists (cache)
            if (fs.existsSync(watermarkPath)) {
                return { photoId: photo.id, cached: true };
            }
            
            // Generate watermark via worker
            const sourcePath = path.join(uploadDir, photo.url);
            await watermarkWorker.generate({
                sourcePath,
                outputPath: watermarkPath,
                config: watermarkConfig
            });
            
            return { photoId: photo.id, cached: false };
        })
    );
    
    // 4. Return gallery URL
    res.json({
        success: true,
        galleryUrl: `http://gallery.example.com/albums/${albumId}`,
        watermarkedPhotos: results,
        stats: {
            totalPhotos: photos.length,
            generated: results.filter(r => !r.cached).length,
            cached: results.filter(r => r.cached).length
        }
    });
});
```

---

### Component 3: Gallery Routes Registration

**File**: [MODIFY] `backend/server.ts`

**Changes**:

```typescript
import galleryRouter from './routes/gallery';

// Register route
app.use('/api/gallery', galleryRouter);
```

---

### Component 4: Watermark Configuration Storage

**File**: [MODIFY] `backend/routes/albums.ts` or dedicated settings

**Storage**: Store watermark preferences per album or globally.

**Database** (optional):

```sql
CREATE TABLE IF NOT EXISTS watermark_config (
    id TEXT PRIMARY KEY,
    albumId TEXT,  -- NULL for global default
    text TEXT DEFAULT 'PROOF',
    opacity REAL DEFAULT 0.3,
    rotation INTEGER DEFAULT -45,
    fontSize INTEGER,  -- NULL for auto
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Verification Plan

### Manual Testing

1. **Create test album** with 10 photos
2. **Export to gallery**:

   ```bash
   curl -X POST http://localhost:8090/api/gallery/export \
   -H "Content-Type: application/json" \
   -d '{"albumId": "test-album-id", "watermarkConfig": {"text": "PROOF"}}'
   ```

3. **Verify watermarks generated**:
   - Check `uploads/gallery/watermarked/{albumId}/` folder
   - Verify 10 `.webp` files exist
   - Open files to confirm watermark visible
4. **Test caching**:
   - Re-export same album
   - Verify `cached: 10` in response (no regeneration)
5. **Test customization**:
   - Export with custom text: `"SAMPLE"`
   - Verify watermark text changed

### Performance Testing

1. **Large album** (500 photos)
2. **Measure processing time**
   - Expected: ~2-3 minutes for 500 photos (4 worker threads)
3. **Verify memory usage** stays stable

---

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Import speed | Slow (4 tiers) |Fast (1 thumbnail) ✅ |
| Gallery export | N/A | ~2-3 min for 500 photos |
| Watermark quality | N/A | High (original source) |
| Storage overhead | N/A | +~500MB per 500 photos (WebP) |

---

## Future Enhancements

1. **Batch export API** for multiple albums
2. **Watermark templates** (corner logo, bottom banner, etc.)
3. **Custom image watermarks** (upload logo)
4. **Gallery integration** (auto-sync on export)

---

**Verify**: Ready to implement gallery watermark system?
