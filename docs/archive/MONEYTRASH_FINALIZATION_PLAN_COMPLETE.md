# MoneyTrash App - Complete Finalization Plan

> **Comprehensive Plan for MoneyTrash Uploader App & Cloud Gallery Sync System**
> **Version:** 4.2.0  
> **Date:** March 2026  
> **Status:** Production Ready

---

## 📋 Executive Summary

MoneyTrash is a **Tauri-based desktop uploader application** designed as a **manual upload gateway** for the ClickFlash photography ecosystem. It serves two critical purposes:

1. **Primary Role:** Manual uploader for orders and MoneyTrash galleries when Master Portal is unavailable
2. **Cloud Integration:** Pre-registered "Office" entity in Cloudflare, functioning like Master in the cloud infrastructure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MONEYTRASH APP ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MONEYTRASH APP (Tauri + React)                    │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │  UI Layer       │  │  Upload Service │  │  Cloud Sync     │      │   │
│  │  │  - React 18     │  │  - Chunked      │  │  - S3/R2        │      │   │
│  │  │  - Vite         │  │  - Resumable    │  │  - Gallery API  │      │   │
│  │  │  - Tailwind     │  │  - Batch        │  │  - Webhooks     │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│           ┌──────────────────┼──────────────────┐                           │
│           │                  │                  │                           │
│           ▼                  ▼                  ▼                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐                 │
│  │  MASTER     │    │  CLOUD      │    │  CLOUD GALLERY  │                 │
│  │  PORTAL     │    │  STORAGE    │    │  (Customer)     │                 │
│  │  (Local)    │    │  (S3/R2)    │    │  (Cloudflare)   │                 │
│  └─────────────┘    └─────────────┘    └─────────────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

### 1. Application Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite + Tailwind CSS | User interface for upload management |
| **Desktop Shell** | Tauri 2.x | Native desktop wrapper with Rust backend |
| **State Management** | React Hooks + LocalStorage | Client-side state persistence |
| **File Handling** | Tauri FS Plugin + Native Dialog | Direct file system access |
| **HTTP Client** | Tauri HTTP Plugin + Fetch | API communication |
| **Notifications** | Tauri Notification Plugin | Desktop notifications |

### 2. Cloud Gallery Sync Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLOUD SYNC DATA FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   UPLOAD MODES:                                                              │
│   ┌─────────────────┐      ┌─────────────────┐                              │
│   │  MONEYTRASH     │      │  ORDER BACKUP   │                              │
│   │  (Gallery Mode) │      │  (Sold Mode)    │                              │
│   │                 │      │                 │                              │
│   │  • New Gallery  │      │  • Order Photos │                              │
│   │  • Watermarked  │      │  • Full Res     │                              │
│   │  • Customer Buy │      │  • Backup Only  │                              │
│   └────────┬────────┘      └────────┬────────┘                              │
│            │                        │                                       │
│            └────────────┬───────────┘                                       │
│                         ▼                                                   │
│            ┌─────────────────────────┐                                      │
│            │   MONEYTRASH UPLOADER   │                                      │
│            │   • Chunked Upload      │                                      │
│            │   • Progress Tracking   │                                      │
│            │   • Resume Support      │                                      │
│            └───────────┬─────────────┘                                      │
│                        │                                                    │
│        ┌───────────────┼───────────────┐                                   │
│        ▼               ▼               ▼                                   │
│   ┌─────────┐    ┌─────────┐    ┌──────────┐                              │
│   │  S3/R2  │    │  Cloud  │    │  Gallery │                              │
│   │Storage  │    │  API    │    │  Backend │                              │
│   └────┬────┘    └────┬────┘    └────┬─────┘                              │
│        │              │              │                                     │
│        └──────────────┴──────────────┘                                     │
│                       │                                                     │
│                       ▼                                                     │
│            ┌─────────────────┐                                             │
│            │  CLOUD GALLERY  │                                             │
│            │  (Customer App) │                                             │
│            └─────────────────┘                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Core Components

### 1. Frontend Components (`apps/moneytrash/src/`)

#### Main Application (`App.tsx`)
- **Purpose:** Main UI container with mode switching
- **Features:**
  - Dual-mode interface (MoneyTrash vs Order Backup)
  - Drag-and-drop file upload zone
  - Native file/folder picker integration
  - Real-time upload progress tracking
  - Upload history management
  - Settings configuration panel

#### Upload Services

| Service | File | Purpose |
|---------|------|---------|
| `DesktopBatchUploadService` | `desktopBatchUploadService.ts` | Batch upload with Tauri native APIs |
| `ResumableUploadService` | `resumableUploadService.ts` | Chunked, resumable uploads |
| `S3StorageService` | `s3StorageService.ts` | Direct S3/R2 cloud storage |
| `BatchUploadService` | `batchUploadService.ts` | Web-based batch uploads |

### 2. Tauri Backend (`apps/moneytrash/src-tauri/`)

#### Rust Modules

```
src-tauri/src/
├── lib.rs           # Library exports
├── main.rs          # Application entry
├── commands.rs      # Tauri command definitions
├── commands/
│   ├── mod.rs
│   ├── config.rs    # Configuration management
│   ├── file.rs      # File operations
│   ├── notification.rs  # Desktop notifications
│   └── upload.rs    # Upload handling
├── errors.rs        # Error types
└── state.rs         # Application state
```

#### Key Tauri Commands

| Command | Purpose | Parameters |
|---------|---------|------------|
| `select_files` | Open native file picker | `multiple: boolean` |
| `select_folder` | Open native folder picker | - |
| `read_file` | Read file bytes from path | `path: string` |
| `read_file_chunk` | Read file chunk for resumable | `path, offset, length` |
| `upload_file_chunk` | Upload chunk via Rust | `sessionId, chunkIndex, chunkData` |
| `finalize_upload` | Complete upload process | `sessionId, metadata` |
| `save_upload_config` | Persist settings | `config: UploadConfig` |
| `save_upload_history` | Persist history | `history: UploadHistory[]` |
| `load_upload_history` | Load history | - |
| `show_notification` | Desktop notification | `title, body` |

---

## 🔄 Sync System Design

### 1. Upload Modes

#### Mode A: MoneyTrash Gallery (`mode: 'moneytrash'`)

```typescript
interface MoneyTrashMetadata {
  eventName: string;        // Gallery/event name
  accessCode: string;       // Customer access code
  mode: 'moneytrash';
  customerEmail?: string;   // Notification email
  singlePhotoPrice?: string;
  fullGalleryPrice?: string;
  mimeType: string;
}
```

**Flow:**
1. User selects photos → Creates gallery metadata
2. Photos uploaded with watermark (optional)
3. Gallery created in Cloud Gallery
4. Customer receives email with access code
5. Customer can purchase photos via Stripe

#### Mode B: Order Backup (`mode: 'sold'`)

```typescript
interface OrderBackupMetadata {
  eventName: string;        // Order reference
  accessCode: string;       // Order ID
  mode: 'sold';
  mimeType: string;
}
```

**Flow:**
1. User selects order photos
2. Full-resolution photos uploaded to cloud storage
3. Linked to order in Cloud Gallery
4. Available for customer download after purchase

### 2. Chunked Upload Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│                  CHUNKED UPLOAD SEQUENCE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLIENT (MoneyTrash)              SERVER (Cloud API)            │
│  ───────────────────              ────────────────              │
│                                                                  │
│  1. INIT                                                          │
│  ─────────────► POST /api/upload/chunk/init                     │
│                  {fileName, fileSize, totalChunks, metadata}    │
│                                                                  │
│  ◄─────────────  {sessionId}                                     │
│                                                                  │
│  2. UPLOAD CHUNKS                                                 │
│  ─────────────► PUT /api/upload/chunk                           │
│                  {sessionId, chunkIndex, chunkData}              │
│                                                                  │
│  ◄─────────────  {received: true}                                │
│                                                                  │
│  [Repeat for all chunks...]                                       │
│                                                                  │
│  3. FINALIZE                                                      │
│  ─────────────► POST /api/upload/chunk/finalize                 │
│                  {sessionId, metadata}                           │
│                                                                  │
│  ◄─────────────  {success: true, galleryUrl, assetIds}          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Resumable Upload State Machine

```typescript
interface UploadSession {
  id: string;                    // Client session ID
  serverSessionId?: string;      // Server session ID
  fileName: string;
  fileSize: number;
  filePath: string;              // Native file path
  uploadedChunks: number[];      // Completed chunk indices
  totalChunks: number;
  metadata: UploadMetadata;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  progress: number;              // 0-100
  error?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 4. Cloud Gallery API Integration

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload/chunk/init` | POST | Initialize upload session |
| `/api/upload/chunk` | PUT | Upload chunk data |
| `/api/upload/chunk/finalize` | POST | Complete upload |
| `/api/upload/chunk/cancel` | POST | Cancel upload session |
| `/api/galleries` | POST | Create new gallery |
| `/api/galleries/:code` | GET | Get gallery by access code |
| `/api/assets` | POST | Create asset record |
| `/api/orders` | POST | Create order |
| `/api/orders/:id/assets` | POST | Link assets to order |

#### Authentication

```typescript
// Request headers for Cloud API
interface CloudApiHeaders {
  'Authorization': `Bearer ${jwtToken}`;
  'X-Desk-Id': string;           // Office/Station identifier
  'X-Office-Type': 'master' | 'moneytrash';
  'Content-Type': 'application/json';
}
```

---

## 🏢 Office Registration System

### Cloudflare "Office" Entity

MoneyTrash apps are registered as "Offices" in Cloudflare, similar to Master Portal:

```typescript
interface OfficeRegistration {
  id: string;                    // Unique office ID
  name: string;                  // Office name
  type: 'master' | 'moneytrash';
  location?: string;
  deskId: string;               // Station identifier
  apiKey: string;               // API authentication
  webhookUrl?: string;          // Event webhook
  settings: OfficeSettings;
  createdAt: string;
  updatedAt: string;
}

interface OfficeSettings {
  maxUploadSize: number;        // Max file size (bytes)
  allowedFormats: string[];     // ['jpg', 'png', 'heic']
  defaultPricing?: {
    singlePhoto: number;
    fullGallery: number;
  };
  storageConfig: {
    provider: 's3' | 'r2';
    bucket: string;
    region: string;
  };
}
```

### Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  OFFICE REGISTRATION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. INSTALLATION                                                 │
│     - Install MoneyTrash app                                     │
│     - First launch triggers registration                         │
│                                                                  │
│  2. CONFIGURATION                                                │
│     - Enter Cloud API URL                                        │
│     - Enter Office credentials (from Management Hub)            │
│     - Configure S3/R2 storage                                    │
│                                                                  │
│  3. REGISTRATION                                                 │
│     ┌──────────────┐      POST /api/offices/register            │
│     │  MoneyTrash  │ ─────────────────────────────────►         │
│     │    App       │      {deskId, name, type: 'moneytrash'}    │
│     └──────────────┘                                           │
│            │                                                     │
│            │  ◄──────────────────────── {apiKey, officeId}      │
│            │                                                     │
│            ▼                                                     │
│     ┌──────────────┐                                            │
│     │  Cloudflare  │                                            │
│     │   Backend    │                                            │
│     └──────────────┘                                            │
│                                                                  │
│  4. VERIFICATION                                                 │
│     - App stores API key securely (Tauri secure storage)        │
│     - Tests connection to Cloud API                             │
│     - Tests S3/R2 connectivity                                   │
│     - Ready for uploads                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Models

### 1. Upload Job Model

```typescript
interface UploadJob {
  id: string;
  files: File[];
  metadata: {
    eventName: string;
    accessCode: string;
    mode: 'moneytrash' | 'sold';
    customerEmail?: string;
    singlePhotoPrice?: string;
    fullGalleryPrice?: string;
    apiUrl?: string;
    useNativePaths?: boolean;
    nativePaths?: string[];
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    currentFile?: string;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errors: Array<{ file: string; error: string }>;
}
```

### 2. Upload History Model

```typescript
interface UploadHistoryItem {
  id: string;
  eventName: string;
  accessCode: string;
  fileCount: number;
  timestamp: string;
  mode: 'moneytrash' | 'sold';
  galleryUrl?: string;
  orderId?: string;
}
```

### 3. App Settings Model

```typescript
interface AppSettings {
  // Cloud Configuration
  apiUrl: string;                    // Cloud API endpoint
  deskId: string;                    // Office/Station identifier
  
  // S3/R2 Configuration
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3Endpoint?: string;
  
  // App Preferences
  autoStartUpload: boolean;
  saveHistory: boolean;
  maxConcurrentUploads: number;
  chunkSize: number;                 // bytes
}
```

### 4. Cloud Gallery Asset Model

```typescript
interface CloudAsset {
  id: string;
  galleryId: string;
  officeId: string;                  // MoneyTrash office ID
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  urls: {
    original: string;
    preview?: string;
    thumbnail?: string;
  };
  metadata: {
    uploadedBy: string;
    uploadMethod: 'moneytrash';
    clientTimestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

## 🔧 Configuration Guide

### 1. Environment Variables

```bash
# .env file for MoneyTrash

# Cloud API
VITE_API_URL=https://api.clickflash.app
VITE_CLOUD_GALLERY_URL=https://gallery.clickflash.app

# Office Registration
VITE_OFFICE_ID=your-office-id
VITE_API_KEY=your-api-key

# S3/R2 Storage (optional - can be configured in UI)
VITE_S3_ACCESS_KEY=your-access-key
VITE_S3_SECRET_KEY=your-secret-key
VITE_S3_REGION=auto
VITE_S3_BUCKET=clickflash-uploads
VITE_S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com

# App Settings
VITE_MAX_UPLOAD_SIZE=52428800      # 50MB
VITE_CHUNK_SIZE=1048576            # 1MB
VITE_MAX_CONCURRENT_UPLOADS=5
```

### 2. Tauri Configuration (`tauri.conf.json`)

```json
{
  "productName": "MoneyTrash Uploader",
  "identifier": "com.clickflash.moneytrash",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "MoneyTrash Transfer",
        "width": 1400,
        "height": 900,
        "minWidth": 1000,
        "minHeight": 700,
        "center": true,
        "decorations": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' blob: data:; connect-src 'self' https:"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "dmg", "appimage"],
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"]
  }
}
```

---

## 🚀 Deployment Guide

### 1. Development Setup

```bash
# Install dependencies
cd apps/moneytrash
npm install

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Run in development mode
npm run tauri:dev
```

### 2. Build for Production

```bash
# Build frontend and Tauri app
npm run tauri:build

# Output locations:
# Windows: src-tauri/target/release/moneytrash-uploader.exe
# macOS:   src-tauri/target/release/bundle/macos/
# Linux:   src-tauri/target/release/bundle/appimage/
```

### 3. Distribution

#### Windows (MSI Installer)
```bash
npm run tauri:build -- --target x86_64-pc-windows-msvc
```

#### macOS (DMG)
```bash
npm run tauri:build -- --target x86_64-apple-darwin
npm run tauri:build -- --target aarch64-apple-darwin  # Apple Silicon
```

#### Linux (AppImage)
```bash
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

---

## 🧪 Testing Strategy

### 1. Unit Tests

```bash
# Run TypeScript tests
npm run test

# Run Rust tests
cd src-tauri && cargo test
```

### 2. E2E Tests (Playwright)

```bash
# Install Playwright browsers
npm run playwright:install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

### 3. Test Scenarios

| Scenario | Test Case |
|----------|-----------|
| **Upload Flow** | Single file upload |
| | Multiple file upload |
| | Folder upload |
| | Large file (>50MB) handling |
| **Resumable** | Network interruption recovery |
| | App crash recovery |
| | Chunk retry logic |
| **Cloud Sync** | Gallery creation |
| | Asset linking |
| | Order backup |
| **Offline** | Queue while offline |
| | Auto-resume when online |

---

## 🔒 Security Considerations

### 1. File Validation

```typescript
// File type whitelist
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic'],
  'image/webp': ['.webp']
};

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Validate before upload
function validateFile(file: File): boolean {
  return file.size <= MAX_FILE_SIZE && 
         Object.keys(ALLOWED_TYPES).includes(file.type);
}
```

### 2. API Security

- JWT tokens for API authentication
- Refresh token rotation
- Request signing for sensitive operations
- Rate limiting on upload endpoints

### 3. Storage Security

- Signed URLs for temporary access
- Bucket policies restricting public access
- Server-side encryption (SSE-S3 or SSE-KMS)
- Lifecycle policies for old uploads

---

## 📈 Performance Optimization

### 1. Upload Performance

| Optimization | Implementation |
|--------------|----------------|
| **Chunked Uploads** | 1MB chunks with parallel upload |
| **Concurrent Uploads** | Max 5 files simultaneously |
| **Native File Access** | Tauri FS plugin bypasses browser limits |
| **Compression** | Optional image compression before upload |
| **CDN Integration** | Direct upload to edge locations |

### 2. Memory Management

```rust
// Rust-side file reading with controlled buffer size
#[tauri::command]
async fn read_file_chunk(
    path: String,
    offset: u64,
    length: u64,
) -> Result<Vec<u8>, AppError> {
    let mut file = File::open(&path).await?;
    file.seek(SeekFrom::Start(offset)).await?;
    
    let mut buffer = vec![0u8; length as usize];
    file.read_exact(&mut buffer).await?;
    
    Ok(buffer)
}
```

---

## 🐛 Troubleshooting Guide

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Upload fails at 0% | API connection issue | Check `VITE_API_URL` config |
| "S3 not configured" | Missing storage config | Configure S3 in Settings panel |
| Large files fail | Memory limit exceeded | Enable chunked upload mode |
| Uploads stuck | Network interruption | Use resumable upload service |
| Can't select files | Tauri permissions | Check FS plugin permissions |
| History lost | Storage cleared | Enable cloud backup of history |

### Debug Mode

```bash
# Enable debug logging
RUST_LOG=debug npm run tauri:dev

# Or set in tauri.conf.json
{
  "build": {
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "RUST_LOG=debug npm run dev"
  }
}
```

---

## 📋 Finalization Checklist

### Core Features
- [x] Dual-mode interface (MoneyTrash + Order Backup)
- [x] Drag-and-drop file upload
- [x] Native file/folder picker (Tauri)
- [x] Chunked, resumable uploads
- [x] Progress tracking with visual feedback
- [x] Upload history with persistence
- [x] Settings configuration panel
- [x] Desktop notifications
- [x] Dark mode UI

### Cloud Integration
- [x] Cloud Gallery API client
- [x] S3/R2 storage integration
- [x] Office registration system
- [x] Gallery creation workflow
- [x] Asset linking to orders
- [x] Webhook support for events

### Production Ready
- [x] Error handling and recovery
- [x] Offline queue support
- [x] Auto-retry with exponential backoff
- [x] Secure credential storage
- [x] Cross-platform builds
- [x] Auto-updater integration
- [x] Logging and telemetry
- [x] Documentation complete

### Testing
- [x] Unit tests for services
- [x] E2E tests for critical flows
- [x] Performance testing
- [x] Security audit
- [x] Cross-platform validation

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-01 | Initial release |
| 0.2.0 | 2026-02 | Added resumable uploads |
| 0.3.0 | 2026-02 | S3/R2 direct upload |
| 1.0.0 | 2026-03 | Production release |
| 4.2.0 | 2026-03 | Full ecosystem integration |

---

## 📚 Related Documentation

- [MONEYTRASH_MECHANISM.md](./MONEYTRASH_MECHANISM.md) - MoneyTrash system mechanics
- [MONEYTRASH_FINALIZATION.md](./MONEYTRASH_FINALIZATION.md) - Previous finalization notes
- [API.md](./API.md) - Cloud API documentation
- [AGENTS.md](./AGENTS.md) - Project-wide development guidelines

---

**Plan Created:** March 12, 2026  
**Last Updated:** March 12, 2026  
**Maintained by:** ClickFlash Development Team
