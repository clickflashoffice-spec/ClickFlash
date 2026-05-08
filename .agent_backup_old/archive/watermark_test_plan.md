# Test: Gallery Watermark Export

## Test Album Selection

To test watermark generation, we need an existing album with photos.

**Test Plan**:

1. Query database for existing albums
2. Select album with photos
3. Export to gallery (generate watermarks)
4. Verify watermark files created
5. Re-export (test caching)

## Test Commands

### Step 1: Find album with photos

```sql
SELECT a.id, a.title, COUNT(p.id) as photo_count 
FROM albums a 
LEFT JOIN photos p ON p.albumId = a.id 
GROUP BY a.id 
HAVING photo_count > 0 
LIMIT 5;
```

### Step 2: Export album to gallery

```bash
curl -X POST http://localhost:8090/api/gallery/export \
  -H "Content-Type: application/json" \
  -d '{"albumId": "ALBUM_ID_HERE"}'
```

### Step 3: Verify watermarks created

```bash
# Check watermark folder
dir "e:\ClickFlash\master-app\react-new\pb_data\uploads\gallery\watermarked\ALBUM_ID_HERE"
```

### Step 4: Re-export (test caching)

```bash
# Same command as Step 2
# Expected: "cached": photo_count, "generated": 0
```

## Expected Results

**First Export**:

- Response: `generated: N, cached: 0`
- Processing time: ~1-10s (depending on photo count)
- Watermarked `.webp` files in `gallery/watermarked/{albumId}/`

**Second Export (Cache Test)**:

- Response: `generated: 0, cached: N`
- Processing time: instant (<1s)
- No new files created

## Session Summary

**Completed Today**:

- ✅ Phase 14: Performance Ultimate (100%)
- ✅ Phase 27: React Deployment Guide
- ✅ Phase 28: Import Speed Optimization (85% faster)
- ✅ Phase 29: Gallery Watermark System (code complete)

**Future Enhancements**:

- Advanced photo straightening (vanishing point, RANSAC, generative fill)

**Current Status**: Server running, ready for watermark testing.
