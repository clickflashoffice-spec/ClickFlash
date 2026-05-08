---
category: assets
priority: high
---

# Asset Management

> **Rule 43**: All photos must be processed into three tiers for optimal performance and storage efficiency.

---

## Asset Tiering

### The Three Tiers

| Tier | Size | Format | Purpose | DPI | Storage Location |
|------|------|--------|---------|-----|------------------|
| **Tiny** | 100px | WebP | High-density grids, thumbnails | N/A | Master & Touch |
| **Preview** | 1200px | JPEG | Client selection, in-app viewing | 72 | Master & Touch |
| **Fulfillment** | Original | Original | Printing, online delivery | 300 | Master only |

### Tier Details

#### Tiny (100px WebP)

**Purpose**: Fast loading for gallery grids with hundreds of photos

**Specifications**:

- Max dimension: 100px (width or height, whichever is larger)
- Format: WebP (best compression for web)
- Quality: 80%
- File size: ~5-15 KB

**Usage**:

```python
from PIL import Image

def generate_tiny(image_path):
    """Generate tiny tier asset"""
    img = Image.open(image_path)
    
    # Calculate dimensions (maintain aspect ratio)
    max_dim = 100
    ratio = min(max_dim / img.width, max_dim / img.height)
    new_size = (int(img.width * ratio), int(img.height * ratio))
    
    # Resize and save as WebP
    img_tiny = img.resize(new_size, Image.Resampling.LANCZOS)
    output_path = image_path.replace(".jpg", "_tiny.webp")
    img_tiny.save(output_path, "WEBP", quality=80)
    
    return output_path
```

#### Preview (1200px JPEG)

**Purpose**: High-quality viewing for customer selection

**Specifications**:

- Max dimension: 1200px (width or height, whichever is larger)
- Format: JPEG
- Quality: 90%
- File size: ~200-500 KB

**Usage**:

```python
def generate_preview(image_path):
    """Generate preview tier asset"""
    img = Image.open(image_path)
    
    # Calculate dimensions (maintain aspect ratio)
    max_dim = 1200
    ratio = min(max_dim / img.width, max_dim / img.height)
    new_size = (int(img.width * ratio), int(img.height * ratio))
    
    # Resize and save as JPEG
    img_preview = img.resize(new_size, Image.Resampling.LANCZOS)
    output_path = image_path.replace(".jpg", "_preview.jpg")
    img_preview.save(output_path, "JPEG", quality=90, optimize=True)
    
    return output_path
```

#### Fulfillment (Original High-Res)

**Purpose**: Final delivery for printing and downloads

**Specifications**:

- Dimensions: Original (no resizing)
- Format: Original (typically JPEG, RAW, or TIFF)
- Quality: 100% (uncompressed or lossless)
- DPI: 300 (for printing)
- File size: 5-50 MB (depending on camera)

**Usage**:

```python
def prepare_fulfillment(image_path):
    """Prepare fulfillment tier asset"""
    img = Image.open(image_path)
    
    # Ensure 300 DPI for printing
    output_path = image_path.replace(".jpg", "_fulfillment.jpg")
    img.save(output_path, "JPEG", quality=100, dpi=(300, 300))
    
    return output_path
```

---

## Storage Organization

### Master-App Storage

```
Master App Python/local/assets/
├── raw/                          # Original imported photos
│   └── album_001/
│       ├── IMG_0001.jpg
│       ├── IMG_0002.jpg
│       └── ...
│
├── tiny/                         # 100px WebP thumbnails
│   └── album_001/
│       ├── IMG_0001_tiny.webp
│       ├── IMG_0002_tiny.webp
│       └── ...
│
├── preview/                      # 1200px JPEG previews
│   └── album_001/
│       ├── IMG_0001_preview.jpg
│       ├── IMG_0002_preview.jpg
│       └── ...
│
└── fulfillment/                  # Original high-res (300 DPI)
    └── album_001/
        ├── IMG_0001_fulfillment.jpg
        ├── IMG_0002_fulfillment.jpg
        └── ...
```

### Touch-App Storage

```
Touch App Python/local/uploads/
├── tiny/                         # Received from Master
│   └── album_001/
│       ├── IMG_0001_tiny.webp
│       └── ...
│
└── preview/                      # Received from Master
    └── album_001/
        ├── IMG_0001_preview.jpg
        └── ...

# Note: Fulfillment tier is NOT pushed to Touch
```

---

## Processing Workflows

### Master-App: Full Processing Pipeline

```python
async def process_photo(photo_path, album_id):
    """Complete photo processing pipeline"""
    
    # 1. Import raw photo
    raw_path = import_raw_photo(photo_path, album_id)
    
    # 2. Apply edits (exposure, contrast, etc.)
    edited_path = apply_edits(raw_path)
    
    # 3. Generate all three tiers
    tiny_path = generate_tiny(edited_path)
    preview_path = generate_preview(edited_path)
    fulfillment_path = prepare_fulfillment(edited_path)
    
    # 4. Save to database
    save_photo_record(
        album_id=album_id,
        raw_path=raw_path,
        tiny_path=tiny_path,
        preview_path=preview_path,
        fulfillment_path=fulfillment_path
    )
    
    # 5. Index for face recognition
    await index_faces(preview_path)
    
    # 6. Push tiny and preview to Touch
    await push_to_touch(tiny_path, preview_path)
    
    return {
        "tiny": tiny_path,
        "preview": preview_path,
        "fulfillment": fulfillment_path
    }
```

### Touch-App: Display Only

```python
def load_album_photos(album_id):
    """Load photos for customer viewing"""
    
    # Load tiny tier for grid view
    tiny_photos = load_photos_from_folder(
        f"local/uploads/tiny/{album_id}/"
    )
    
    # Load preview tier for detail view
    preview_photos = load_photos_from_folder(
        f"local/uploads/preview/{album_id}/"
    )
    
    return {
        "tiny": tiny_photos,
        "preview": preview_photos
    }
```

---

## Performance Optimization

### Lazy Loading

```python
# Load tiny tier first for fast grid display
def display_gallery(album_id):
    """Display photo gallery with lazy loading"""
    
    # 1. Load and display tiny tier immediately
    tiny_photos = load_tiny_photos(album_id)
    render_grid(tiny_photos)
    
    # 2. Lazy load preview tier on demand
    def on_photo_click(photo_id):
        preview_photo = load_preview_photo(photo_id)
        display_lightbox(preview_photo)
```

### Caching Strategy

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_tiny_photo(photo_id):
    """Cache tiny photos in memory"""
    return load_photo(f"local/uploads/tiny/{photo_id}")

@lru_cache(maxsize=20)
def get_preview_photo(photo_id):
    """Cache preview photos in memory"""
    return load_photo(f"local/uploads/preview/{photo_id}")
```

### Batch Processing

```python
async def batch_process_album(album_id, photo_paths):
    """Process multiple photos in parallel"""
    import asyncio
    
    # Process in batches of 10
    batch_size = 10
    
    for i in range(0, len(photo_paths), batch_size):
        batch = photo_paths[i:i + batch_size]
        
        # Process batch in parallel
        tasks = [process_photo(path, album_id) for path in batch]
        await asyncio.gather(*tasks)
        
        print(f"Processed {i + len(batch)}/{len(photo_paths)} photos")
```

---

## Storage Estimates

### Example Album (500 photos)

| Tier | Size per Photo | Total for 500 Photos |
|------|----------------|----------------------|
| **Tiny** | 10 KB | 5 MB |
| **Preview** | 350 KB | 175 MB |
| **Fulfillment** | 15 MB | 7.5 GB |
| **Total** | ~15.35 MB | **~7.68 GB** |

### 100GB Library Estimate

- **Number of photos**: ~6,500 high-res photos
- **Tiny tier**: ~65 MB
- **Preview tier**: ~2.3 GB
- **Fulfillment tier**: ~97.5 GB
- **Total storage**: ~100 GB

---

## Cleanup and Maintenance

### Remove Unused Assets

```python
def cleanup_orphaned_assets():
    """Remove assets for deleted photos"""
    
    # Get all photo IDs from database
    active_photos = get_all_photo_ids()
    
    # Check each tier folder
    for tier in ["tiny", "preview", "fulfillment"]:
        tier_path = f"local/assets/{tier}/"
        
        for file in os.listdir(tier_path):
            photo_id = extract_photo_id(file)
            
            if photo_id not in active_photos:
                # Delete orphaned file
                os.remove(os.path.join(tier_path, file))
                print(f"Removed orphaned {tier}: {file}")
```

### Archive Old Albums

```python
def archive_album(album_id):
    """Archive album to external storage"""
    
    # Create archive folder
    archive_path = f"archive/{album_id}/"
    os.makedirs(archive_path, exist_ok=True)
    
    # Move fulfillment tier only (keep tiny/preview for reference)
    fulfillment_path = f"local/assets/fulfillment/{album_id}/"
    shutil.move(fulfillment_path, archive_path)
    
    # Update database
    mark_album_archived(album_id)
```

---

## Summary

**Asset Tiering Strategy**:

1. **Tiny (100px WebP)**: Fast grid loading
2. **Preview (1200px JPEG)**: Customer selection
3. **Fulfillment (Original)**: Final delivery

**Storage Distribution**:

- Master: All three tiers
- Touch: Tiny + Preview only

**Performance**:

- Lazy loading for large galleries
- Caching for frequently accessed photos
- Batch processing for efficiency

This tiering system enables **fast performance** even with **100GB+ photo libraries**.
