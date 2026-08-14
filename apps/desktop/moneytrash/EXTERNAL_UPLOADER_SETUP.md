# External Uploader Hotel - Setup Guide

## Overview

MoneyTrash is now pre-configured as **"External Uploader"** hotel (Site ID: **EXT001**), registered to Cloudflare R2 for cloud storage.

## Identity

| Field | Value |
|-------|-------|
| **Site ID** | EXT001 |
| **Name** | External Uploader |
| **Type** | External Uploader Hotel |
| **R2 Folder** | EXT001/ |

## Quick Start

### 1. Automated Setup

```powershell
cd apps/moneytrash/scripts
.\setup-external-uploader.ps1
```

This will:
- ✅ Configure environment variables
- ✅ Generate unique credentials
- ✅ Create data directories
- ✅ Optional: Register with Management Hub

### 2. Manual Setup

```bash
cd apps/moneytrash

# Copy configuration
cp .env.external-uploader .env

# Edit .env with your Cloudflare credentials
# Update R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY

# Install dependencies
npm install

# Start development server
npm run dev
```

## Cloudflare R2 Configuration

### Site-Specific Folder Structure

Files uploaded from External Uploader will land in:

```
clickflash-assets/
├── EXT001/
│   ├── raw/
│   │   └── {date}/
│   ├── processed/
│   └── thumbnails/
├── TN001/
├── TN002/
└── TN003/
```

### Getting R2 Credentials

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2**
3. Select bucket **clickflash-assets**
4. Go to **Manage R2 API Tokens**
5. Create new token with **Object Read & Write** permissions
6. Copy credentials to `.env`:
   ```
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   ```

## Management Hub Registration

### Option 1: Automatic (via script)

```bash
node scripts/register-external-uploader.js
```

### Option 2: Manual Registration

Send POST request to Management Hub:

```bash
curl -X POST https://management-hub.clickflash-office.workers.dev/api/office/register \
  -H "Content-Type: application/json" \
  -d '{
    "deskId": "EXT001",
    "name": "External Uploader",
    "contactEmail": "external-uploader@clickflash.ai",
    "apiKey": "your_master_api_key",
    "type": "external_uploader"
  }'
```

## Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Main configuration (created from template) |
| `.env.external-uploader` | Template with defaults |
| `external-uploader-credentials.json` | Generated credentials |
| `scripts/setup-external-uploader.ps1` | Setup script |
| `scripts/register-external-uploader.js` | Hub registration script |

## Environment Variables

### Identity
```env
NEXT_PUBLIC_SITE_ID=EXT001
NEXT_PUBLIC_SITE_NAME="External Uploader Hotel"
```

### Cloud Storage
```env
CLOUD_STORAGE_ENABLED=true
R2_BUCKET=clickflash-assets
R2_SITE_FOLDER=EXT001
```

### Hub Connection
```env
CLOUD_API_URL=https://management-hub.clickflash-office.workers.dev
DESK_ID=EXT001
```

## Testing

### 1. Test R2 Upload

```bash
cd apps/moneytrash
npm run test:r2
```

### 2. Test Hub Connection

```bash
node scripts/test-cloud-connection.js
```

### 3. Full Upload Test

1. Start MoneyTrash: `npm run dev`
2. Select photos to upload
3. Verify files appear in R2: `EXT001/` folder
4. Check Management Hub for new gallery

## Troubleshooting

### "R2 credentials not configured"
**Solution**: Add real R2 credentials to `.env`

### "Hub registration failed"
**Solution**: Verify MASTER_API_KEY and Hub URL

### "Upload fails"
**Solution**: Check R2 bucket permissions and CORS settings

## Integration with Ecosystem

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL UPLOADER FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MoneyTrash (EXT001)                                            │
│       │                                                         │
│       ├──▶ R2 Cloud Storage (EXT001/*)                         │
│       │            │                                            │
│       │            └──▶ Cloudflare CDN                        │
│       │                                                         │
│       └──▶ Management Hub                                       │
│                     │                                           │
│                     ├──▶ Gallery Backend                      │
│                     └──▶ Customer Gallery UI                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Run setup script
2. ✅ Get Cloudflare R2 credentials
3. ✅ Test upload to EXT001 folder
4. ✅ Verify in Management Hub
5. ✅ Test Customer Gallery access
