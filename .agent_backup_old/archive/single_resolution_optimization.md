# Single-Resolution Import Optimization - Implementation Plan

## Root Cause Analysis

**Current State**: PhotoWorker generates **4 copies** of each photo during import:

1. Preview (1200px) - 45-54ms
2. Preview watermarked (1200px webp) - 60-80ms
3. Thumbnail (350px) - 20-30ms
4. Tiny (100px) - 15-20ms

**Total overhead per photo**: ~140-184ms + I/O operations

**For 500 photos**: ~70-92 seconds of pure processing time (not including disk I/O, which can double this)

---

## Proposed Solution

**Eliminate all thumbnail generation**use only the original full-resolution photo for:

- Filmstrip display (lazy-loaded)
- Preview display (lazy-loaded)
- Order fulfillment (original file)

**Benefits**:

- **Import speed**: ~70-90 seconds saved per 500 photos (60-70% faster)
- **Disk space**: 75% reduction (from 4 copies to 1 copy)
- **Complexity**: Simpler codebase, no asset tier management

**Trade-offs**:

- UI must lazy-load full-resolution images (already implemented via LazyImage component)
- Network bandwidth: Master ↔ Touch transfers full files (acceptable on Gigabit Ethernet)
- Browser memory: Must handle full-res decoding (mitigated by RAM-capped thumbnail cache)

---

## Proposed Changes

### Component 1: PhotoWorker Simplification

**File**: [`backend/workers/photoWorker.ts`](file:///e:/ClickFlash/master-app/react-new/backend/workers/photoWorker.ts)

**Changes**:

- Remove preview generation (lines 45-54)
- Remove watermarked preview (lines 57-91)
- Remove thumbnail generation (lines 93-99)
- Remove tiny generation (lines 101-107)
- Keep only: metadata extraction + file hash

**New flow**:

```javascript
async function handleProcessJob(job) {
    const { filepath, photoId } = job;
    
    // 1. Extract metadata & hash (keep)
    const fileBuffer = await fs.promises.readFile(filepath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const metadata = await sharp(fileBuffer).metadata();
    
    // 2. Return immediately (no resizing)
    parentPort.postMessage({
        success: true,
        photoId,
        hash: fileHash,
        metadata: {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: metadata.size
        },
        assets: {} // Empty - no generated assets
    });
}
```

**Impact**: **70-90 seconds** saved per 500-photo import.

---

### Component 2: PhotoProcessor Update

**File**: [`backend/shared/photoProcessor.ts`](file:///e:/ClickFlash/master-app/react-new/backend/shared/photoProcessor.ts)

**Changes** (lines 219-233):

```typescript
// BEFORE
return {
    url: storage.relativePath,
    tinyUrl: assets.tiny ? `${albumId}/${assets.tiny}` : undefined,
    thumbnailUrl: assets.thumbnail ? `${albumId}/${assets.thumbnail}` : undefined,
    previewUrl: assets.preview ? `${albumId}/${assets.preview}` : undefined,
    ...
};

// AFTER
return {
    url: storage.relativePath,
    tinyUrl: undefined,        // No longer generated
    thumbnailUrl: undefined,   // No longer generated
    previewUrl: undefined,     // No longer generated
    ...
};
```

**Impact**: Database schema unchanged (fields nullable), simplified metadata.

---

### Component 3: Frontend Adaptation

**Files**:

- UI already uses LazyImage component (supports lazy loading full-res)
- Thumbnail cache already exists (50MB LRU in imageUtils.ts)
- No frontend changes required

**Validation**:

- LazyImage handles full-resolution URLs ✅
- VirtualFilmstrip preloads via useIdlePreload ✅
- Browser decodes on-demand ✅

---

### Component 4: Collection Export (Touch-App Sync)

**File**: [`backend/routes/collections.ts`](file:///e:/ClickFlash/master-app/react-new/backend/routes/collections.ts)

**Current export** (lines 987-988):

```typescript
previewUrl: `photos/${photoData.id}_preview${photoExt}`,
thumbnailUrl: `photos/${photoData.id}_tiny${photoExt}`,
```

**Updated**:

```typescript
previewUrl: `photos/${photoData.id}${photoExt}`,       // Use original
thumbnailUrl: `photos/${photoData.id}${photoExt}`,    // Use original
```

**Impact**: Touch-App receives full-resolution files (acceptable on Gigabit Ethernet).

---

## Verification Plan

### Before Optimization

1. Import 100 photos
2. Measure: Time from upload start to database insert complete
3. Record: Disk space usage (`uploads/` folder)
4. Baseline: ~280-368 seconds for 500 photos

### After Optimization

1. Import same 100 photos
2. Measure: Time from upload start to database insert complete
3. Expected: **~100-180 seconds** for 500 photos (60-70% improvement)
4. Verify: Only 1 file per photo in `uploads/albumId/`

### UI Validation

1. Open album with 500 photos
2. Verify: Filmstrip loads smoothly (lazy-loaded full-res)
3. Verify: Photo detail view displays correctly
4. Verify: Thermal status remains "normal" (no excessive CPU from decoding)
5. Verify: Memory usage < 10GB on Master (thumbnail cache working)

---

## Migration Strategy

**Existing photos**: Leave as-is (tiny/preview files remain, but ignored)

**New photos**: Only original file stored

**Database**: No schema changes (tinyUrl/previewUrl/thumbnailUrl remain nullable)

**Rollback**: Revert photoWorker.ts changes to restore multi-tier generation

---

## Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Import time (500 photos) | 280-368s | 100-180s | 60-70% |
| Disk space per photo | 4 files (~15MB) | 1 file (~5MB)  | 66% |
| Processing overhead | 140-184ms/photo | 10-20ms/photo | 92% |
| UI performance | Lazy-load tiny (100px) | Lazy-load original | Unchanged |

---

## Risks & Mitigation

**Risk 1**: Browser struggles with full-res decoding

- **Mitigation**: Thumbnail cache already implemented (50MB LRU)
- **Fallback**: Browsers natively handle image decoding efficiently

**Risk 2**: Network bandwidth (Master → Touch)

- **Mitigation**: Gigabit Ethernet = 125MB/s, full-res photo ~5MB = 40ms transfer
- **Acceptable**: Touch sync happens in background

**Risk 3**: UI feels slower (no thumbnails)

- **Mitigation**: LazyImage + useIdlePreload already optimize perceived performance
- **Test**: Validate with 1000-photo album

---

## Timeline

- **PhotoWorker simplification**: 30 minutes
- **PhotoProcessor update**: 15 minutes
- **Collections export fix**: 15 minutes
- **Testing & validation**: 1 hour

**Total**: ~2 hours

---

**Verify**: Proceed with single-resolution optimization?
