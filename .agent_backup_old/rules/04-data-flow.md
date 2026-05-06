---
category: data
priority: high
---

# Data Flow

> **Core Principle**: All data movement between Master-App and Touch-App happens via **file-based communication** over a secure Ethernet bridge.

---

## Order Creation and Synchronization

### Touch-App: Order Creation

**Step 1: Customer Completes Selection**

```python
# Touch-App creates order locally
order = {
    "order_id": "ORD-2026-001",
    "customer_name": "John Doe",
    "selected_photos": ["photo1.jpg", "photo2.jpg"],
    "timestamp": "2026-01-04T15:00:00Z"
}

# Save to Touch's local folder
save_order("Touch App Python/local/orders/ORD-2026-001.json", order)
```

**Step 2: Push to Master**

```python
# Copy order to Master's designated folder
source = "Touch App Python/local/orders/ORD-2026-001.json"
destination = "Master App Python/local/orders/from_touch/ORD-2026-001.json"

copy_file(source, destination)  # Via Ethernet bridge
```

### Master-App: Order Processing

**Step 3: Detect New Order**

```python
# Master monitors its local orders folder
watch_folder = "Master App Python/local/orders/from_touch/"

# Detect new order file
new_orders = detect_new_files(watch_folder)
```

**Step 4: Process Order**

```python
for order_file in new_orders:
    order = load_order(order_file)
    
    # Process customer selections
    process_order(order)
    
    # Generate fulfillment package
    create_fulfillment_package(order)
    
    # Archive processed order
    move_to_archive(order_file)
```

---

## Upload Mechanism

### Master-App: Photo Processing

**Step 1: Import and Process**

```python
# Import raw photos
raw_photos = import_photos("Master App Python/local/raw/")

# Process each photo
for photo in raw_photos:
    # Edit and enhance
    edited = apply_edits(photo)
    
    # Generate asset tiers
    tiny = generate_tiny(edited)      # 100px WebP
    preview = generate_preview(edited) # 1200px JPEG
    fulfillment = edited               # Original high-res
    
    # Save to Master's storage
    save_asset(tiny, "local/assets/tiny/")
    save_asset(preview, "local/assets/preview/")
    save_asset(fulfillment, "local/assets/fulfillment/")
```

**Step 2: Push to Touch**

```python
# Push finalized assets to Touch
for photo in finalized_photos:
    # Copy tiny and preview tiers only
    copy_to_touch(photo.tiny, "Touch App Python/local/uploads/tiny/")
    copy_to_touch(photo.preview, "Touch App Python/local/uploads/preview/")
    
    # Fulfillment tier stays on Master
```

### Touch-App: Photo Display

**Step 3: Fetch and Display**

```python
# Touch reads ONLY from its local folder
upload_folder = "Touch App Python/local/uploads/"

# Load photos for display
tiny_photos = load_photos(f"{upload_folder}/tiny/")
preview_photos = load_photos(f"{upload_folder}/preview/")

# Display to customer
display_gallery(tiny_photos, preview_photos)
```

---

## Photo Processing Pipeline

### Master-App Pipeline

```
┌─────────────┐
│ Raw Import  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Edit/Enhance│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Asset Tiering│
└──────┬──────┘
       │
       ├──► Tiny (100px WebP)
       ├──► Preview (1200px JPEG)
       └──► Fulfillment (Original)
       │
       ▼
┌─────────────┐
│ Face Index  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Push to Touch│
└─────────────┘
```

### Touch-App Pipeline

```
┌─────────────┐
│ Receive     │
│ from Master │ (LAN Only)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Display     │
│ Gallery     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Customer    │
│ Selection   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Create Order│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Push to     │
│ Master      │ (LAN Only)
└─────────────┘
```

### Global Sync Pipeline (Master → Cloud Relay)

```
┌─────────────┐
│ Receive from│
│ Touch       │ (LAN Only)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Local DB    │
│ Record      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Cloud Sync  │
│ Manager     │ (Internet)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Management  │
│ Hub (Worker)│ (Online Only)
└─────────────┘
```

---

## Data Mirroring Between Apps

### What Gets Mirrored

| Data Type | Master → Touch | Touch → Master |
|-----------|----------------|----------------|
| **Photos (Tiny)** | ✅ Yes | ❌ No |
| **Photos (Preview)** | ✅ Yes | ❌ No |
| **Photos (Fulfillment)** | ❌ No | ❌ No |
| **Orders** | ❌ No | ✅ Yes |
| **Customer Data** | ❌ No | ✅ Yes |
| **Face Recognition Index** | ✅ Yes | ❌ No |

### Synchronization Timing

**Master → Touch**:

- After photo processing completes
- When new albums are finalized
- When face recognition index updates

**Touch → Master**:

- Immediately after order creation
- Real-time as customer makes selections

---

## Directory Structure

### Master-App Directories

```
Master App Python/local/
├── raw/                    # Raw imported photos
├── assets/
│   ├── tiny/              # 100px WebP
│   ├── preview/           # 1200px JPEG
│   └── fulfillment/       # Original high-res
├── orders/
│   ├── from_touch/        # Orders received from Touch
│   └── processed/         # Archived processed orders
└── face_recognition/
    └── index/             # Face recognition database
```

### Touch-App Directories

```
Touch App Python/local/
├── uploads/
│   ├── tiny/              # Received from Master
│   └── preview/           # Received from Master
├── orders/
│   ├── pending/           # Orders created locally
│   └── sent/              # Orders sent to Master
└── face_recognition/
    └── cache/             # Local face search cache
```

---

## Data Flow Diagrams

### Order Flow

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  Touch-App   │          │  Master-App  │          │  Cloud-Hub   │
└──────┬───────┘          └──────┬───────┘          └──────┬───────┘
       │                         │                         │
       │ 1. Create order.json    │                         │
       │    (local offline)      │                         │
       │                         │                         │
       │ 2. Push to Master (LAN) │                         │
       │────────────────────────>│                         │
       │                         │                         │
       │                         │ 3. Save & Process       │
       │                         │    locally              │
       │                         │                         │
       │                         │ 4. Sync to Cloud (Web)  │
       │                         │────────────────────────>│
       │                         │                         │
       │                         │                         │ 5. Global Store
       │                         │                         │    (Analytics/Fulfillment)
       │                         │                         │
```

### Photo Flow

```
┌──────────────┐                    ┌──────────────┐
│  Master-App  │                    │  Touch-App   │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │ 1. Import raw photos              │
       │                                   │
       │ 2. Edit & enhance                 │
       │                                   │
       │ 3. Generate tiers                 │
       │    - Tiny                         │
       │    - Preview                      │
       │    - Fulfillment                  │
       │                                   │
       │ 4. Push tiny & preview            │
       │───────────────────────────────────>│
       │    (local/uploads/)               │
       │                                   │
       │                                   │ 5. Load photos
       │                                   │
       │                                   │ 6. Display gallery
       │                                   │

### Prohibited Data Flows

```

❌ Touch -> Direct Cloud (Prohibited - No Internet Access)
❌ Cloud -> Direct Touch (Prohibited - No Inbound Access)
❌ Browser -> ZIP Download -> File System (Prohibited - Use Master Push)
❌ Touch -> Pull -> Master (Prohibited - Touch is passive)

```

---

## Error Handling

### Network Failures

```python
def push_to_touch(file_path, destination):
    max_retries = 3
    retry_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            copy_file(file_path, destination)
            log_success(file_path)
            return True
        except NetworkError as e:
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            else:
                log_error(f"Failed to push {file_path}: {e}")
                queue_for_retry(file_path)
                return False
```

### Data Validation

```python
def validate_order(order_file):
    """Validate order before processing"""
    order = load_json(order_file)
    
    required_fields = ["order_id", "customer_name", "selected_photos"]
    for field in required_fields:
        if field not in order:
            raise ValidationError(f"Missing required field: {field}")
    
    # Validate photo references exist
    for photo_id in order["selected_photos"]:
        if not photo_exists(photo_id):
            raise ValidationError(f"Photo not found: {photo_id}")
    
    return order
```

---

## Summary

**Key Data Flow Principles**:

1. **File-Based**: All communication via file copying
2. **One-Way**: Master pushes photos, Touch pushes orders
3. **Local First**: Always create locally before pushing
4. **Validation**: Validate all data before processing
5. **Error Handling**: Retry failed transfers, log all operations
6. **No Direct Access**: Apps never read from each other's internal folders

This ensures **reliable, offline-capable data exchange** between Master-App and Touch-App.
