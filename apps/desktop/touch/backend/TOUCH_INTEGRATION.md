# Touch Developer - Master Integration Implementation

This implementation follows the **Touch Developer - Complete Integration Guide** for seamless Master ↔ Touch synchronization.

## 📋 Overview

### How It Works

**Albums (Master → Touch):**

1. Master copies albums TO Touch's uploads folder via network
2. Touch monitors its OWN local uploads folder
3. Touch detects and imports albums automatically

**Orders (Touch → Master):**

1. Touch exports orders TO its own local orders folder
2. Master monitors Touch's orders folder via network
3. Master detects and imports orders automatically

### Key Principles

- ✅ Touch uses local paths for its folders
- ✅ Touch shares folders for Master to access
- ✅ Touch monitors its own uploads folder
- ✅ Touch exports to its own orders folder
- ✅ Master handles multi-kiosk complexity

## 🚀 Quick Start

### 1. Run Setup Script

```bash
cd backend
node setup-touch-integration.js
```

This will:

- Create `C:\TouchData\uploads` folder
- Create `C:\TouchData\orders` folder
- Configure database settings
- Display network sharing instructions

### 2. Share Folders on Network

Run these PowerShell commands **as Administrator**:

```powershell
# Share uploads folder (Master writes here)
New-SmbShare -Name "TouchUploads" -Path "C:\TouchData\uploads" -FullAccess "Everyone"

# Share orders folder (Master reads from here)
New-SmbShare -Name "TouchOrders" -Path "C:\TouchData\orders" -ReadAccess "Everyone"
```

### 3. Verify Network Access

From the **Master PC**, test access:

```powershell
# Test uploads folder
dir \\TOUCH-PC-IP\TouchUploads

# Test orders folder
dir \\TOUCH-PC-IP\TouchOrders
```

Replace `TOUCH-PC-IP` with the actual IP address of the Touch PC.

### 4. Restart Touch Server

```bash
# Stop current server (Ctrl+C)
# Start server
node server.js
```

## 📁 Implementation Details

### Album Import (Master → Touch)

**Service:** `services/albumMonitor.js`

- **Monitor Interval:** 30 seconds
- **Folder Monitored:** `C:\TouchData\uploads` (local path)
- **Detection:** Looks for folders matching `album-{id}-{timestamp}`
- **Required File:** `metadata.json` in each album folder

**metadata.json Format:**

```json
{
  "id": "album123",
  "title": "Beach Photos - Room 305",
  "date": "2025-12-12",
  "roomNumber": "305",
  "photographerId": "photographer1",
  "photoCount": 25,
  "categories": ["Beach & Pool"],
  "timestamp": "2025-12-12T15:00:00Z",
  "photos": [
    {
      "id": "photo1",
      "title": "Beach sunset",
      "url": "photo1.jpg",
      "category": "Beach & Pool",
      "manualEdits": { "exposure": 10 }
    }
  ]
}
```

**Import Process:**

1. Scans upload folder every 30 seconds
2. Finds `album-*` folders with `metadata.json`
3. Checks if album already exists (prevents duplicates)
4. Creates album record in database
5. Copies photos to Touch uploads directory
6. Creates photo records in database
7. Marks folder as `.processed`

### Order Export (Touch → Master)

**Route:** `POST /api/orders/:id/export-to-master`

- **Folder:** `C:\TouchData\orders` (local path)
- **Format:** `order-{id}-{timestamp}/metadata.json`

**metadata.json Format:**

```json
{
  "orderId": "order123",
  "kioskId": "beach-bar",
  "albumId": "album123",
  "albumTitle": "Beach Photos",
  "roomNumber": "305",
  "customerName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "orderDate": "2025-12-12T15:30:00Z",
  "totalAmount": 150.00,
  "currency": "USD",
  "paymentMethod": "Credit Card",
  "appliedDiscount": 10.00,
  "photos": [
    {
      "id": "photo1",
      "filename": "photo1.jpg",
      "albumId": "album123",
      "category": "Beach & Pool",
      "quantity": 2,
      "printSize": "8x10"
    }
  ],
  "status": "completed",
  "timestamp": "2025-12-12T15:35:00Z",
  "notes": "Rush order"
}
```

**Export Process:**

1. Receives order ID via API
2. Retrieves order from database
3. Creates timestamped folder in orders directory
4. Copies ordered photos to folder
5. Generates metadata.json
6. Updates order status to 'exported'

## ⚙️ Configuration

### Database Settings

Settings are stored in the `settings` table:

```sql
-- View current settings
SELECT * FROM settings WHERE key IN ('touchUploadFolder', 'touchOrdersFolder');

-- Update upload folder
UPDATE settings SET value = '{"path":"C:\\CustomPath\\uploads"}' 
WHERE key = 'touchUploadFolder';

-- Update orders folder
UPDATE settings SET value = '{"path":"C:\\CustomPath\\orders"}' 
WHERE key = 'touchOrdersFolder';
```

### Custom Folder Paths

To use custom paths, edit `setup-touch-integration.js` before running:

```javascript
const DEFAULT_UPLOAD_FOLDER = 'D:\\MyCustomPath\\uploads';
const DEFAULT_ORDERS_FOLDER = 'D:\\MyCustomPath\\orders';
```

## 🧪 Testing

### Test Album Import

1. **Create test album folder:**

```powershell
mkdir "C:\TouchData\uploads\album-test123-1702389900000\photos"
```

2. **Copy test photo:**

```powershell
copy "C:\path\to\test.jpg" "C:\TouchData\uploads\album-test123-1702389900000\photos\photo1.jpg"
```

3. **Create metadata.json:**

```json
{
  "id": "test123",
  "title": "Test Album",
  "date": "2025-12-12",
  "roomNumber": "101",
  "photos": [
    {
      "id": "photo1",
      "title": "Test Photo",
      "url": "photo1.jpg",
      "category": "Test"
    }
  ]
}
```

4. **Verify:**

- Wait 30 seconds
- Check Touch logs for `[AlbumMonitor] Found album`
- Query database: `SELECT * FROM albums WHERE id = 'test123'`
- Check album appears in Touch UI

### Test Order Export

1. **Create test order in Touch app**

2. **Export via API:**

```bash
curl -X POST http://localhost:8091/api/orders/test123/export-to-master \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Verify:**

- Check `C:\TouchData\orders\` for order folder
- Verify `metadata.json` exists
- From Master PC: `dir \\TOUCH-PC\TouchOrders`

## 🔧 Troubleshooting

### Albums Not Importing

**Check folder path:**

```sql
SELECT * FROM settings WHERE key = 'touchUploadFolder';
```

**Verify folder exists:**

```powershell
dir "C:\TouchData\uploads"
```

**Check Touch logs:**

```
[AlbumMonitor] Starting album monitor (30-second interval)
[AlbumMonitor] Found album: Beach Photos (ID: album123)
[AlbumMonitor] Imported album album123 with 25 photos
```

**Verify network share:**

```powershell
# From Master PC
dir \\TOUCH-PC-IP\TouchUploads
```

### Orders Not Exporting

**Check folder path:**

```sql
SELECT * FROM settings WHERE key = 'touchOrdersFolder';
```

**Test endpoint:**

```bash
curl -X POST http://localhost:8091/api/orders/ORDER_ID/export-to-master \
  -H "Authorization: Bearer TOKEN"
```

**Check folder created:**

```powershell
dir "C:\TouchData\orders"
```

### Network Access Issues

**Test from Master PC:**

```powershell
# Can Master access Touch folders?
dir \\TOUCH-PC-IP\TouchUploads
dir \\TOUCH-PC-IP\TouchOrders
```

**Check firewall:**

- Ensure file sharing is enabled
- Check Windows Firewall allows SMB

**Verify share permissions:**

```powershell
Get-SmbShare -Name "TouchUploads"
Get-SmbShare -Name "TouchOrders"
```

## 📊 Multi-Kiosk Support

### Touch Configuration (Same for All Kiosks)

Each Touch kiosk uses the same configuration:

- Upload folder: `C:\TouchData\uploads` (local)
- Orders folder: `C:\TouchData\orders` (local)

### Master Configuration (Per-Kiosk)

Master configures each kiosk individually:

**Kiosk 1 (Beach Bar):**

- Upload path: `\\192.168.1.101\TouchUploads`
- Orders path: `\\192.168.1.101\TouchOrders`

**Kiosk 2 (Pool Area):**

- Upload path: `\\192.168.1.102\TouchUploads`
- Orders path: `\\192.168.1.102\TouchOrders`

### How It Works

1. Master: User selects "Send to Beach Bar kiosk"
2. Master: Copies album to `\\192.168.1.101\TouchUploads\`
3. Beach Bar Touch: Detects in `C:\TouchData\uploads\`
4. Beach Bar Touch: Imports album
5. Other kiosks: Don't see this album (targeted distribution)

## 📝 Summary Checklist

### Configuration

- [ ] Set `touchUploadFolder` to local path
- [ ] Set `touchOrdersFolder` to local path
- [ ] Create folders if they don't exist

### Network Setup

- [ ] Share uploads folder as `TouchUploads`
- [ ] Share orders folder as `TouchOrders`
- [ ] Test network access from Master PC

### Implementation

- [ ] Album monitor service running (30-second interval)
- [ ] Order export endpoint available
- [ ] Server restarted with new services

### Testing

- [ ] Test album import with manual folder
- [ ] Test order export with test order
- [ ] Verify network paths work
- [ ] Test with Master app

### Production

- [ ] Configure all Touch kiosks
- [ ] Share folders on all kiosks
- [ ] Configure Master with all kiosk paths
- [ ] Test multi-kiosk distribution

## 🔗 Quick Reference

| Task | Touch Configuration | Master Accesses As |
|------|-------------------|-------------------|
| Albums IN | `C:\TouchData\uploads` (local) | `\\TOUCH-PC\TouchUploads` (network) |
| Orders OUT | `C:\TouchData\orders` (local) | `\\TOUCH-PC\TouchOrders` (network) |
| Monitor Interval | 30 seconds | 30 seconds |
| Folder Sharing | Required (SMB) | Uses network paths |

## 📚 Files Modified/Created

### New Files

- `backend/services/albumMonitor.js` - Album monitoring service
- `backend/migrations/007_add_touch_integration_settings.sql` - Database migration
- `backend/setup-touch-integration.js` - Setup script
- `backend/TOUCH_INTEGRATION.md` - This documentation

### Modified Files

- `backend/routes/orderExport.js` - Updated to use `touchOrdersFolder`
- `backend/server.js` - Integrated album monitor service

## 🎯 Next Steps

1. Run the setup script
2. Share folders on network
3. Restart Touch server
4. Test album import
5. Test order export
6. Configure Master app with Touch network paths
7. Test end-to-end workflow

For detailed integration guide, see the original **Touch Developer - Complete Integration Guide** document.
