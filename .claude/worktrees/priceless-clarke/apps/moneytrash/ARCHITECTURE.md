# MoneyTrash Uploader - Architecture Documentation

> **Tauri v2 Desktop Application for Secure Photo Uploads**

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend (Rust) Architecture](#backend-rust-architecture)
- [Data Flow](#data-flow)
- [Error Handling](#error-handling)
- [Offline Support](#offline-support)
- [Security Considerations](#security-considerations)
- [Testing Strategy](#testing-strategy)

## Overview

The MoneyTrash Uploader is a Tauri v2 desktop application that provides secure, resumable photo uploads to the ClickFlash cloud platform. It features offline queue management, progress persistence, and robust error handling.

### Key Features

- **Chunked Uploads**: Files are split into 1MB chunks for reliability
- **Offline Queue**: Uploads queue when offline and resume automatically
- **Progress Persistence**: Upload state survives app restarts
- **Native File Access**: Direct file system access via Tauri APIs
- **Retry Logic**: Exponential backoff for failed uploads

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MoneyTrash Uploader                         │
│                      (Tauri v2 Application)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐      ┌─────────────────┐                  │
│  │   Frontend      │      │   Backend       │                  │
│  │   (React 18)    │◄────►│   (Rust)        │                  │
│  │                 │ IPC  │                 │                  │
│  │ • Components    │      │ • Commands      │                  │
│  │ • Services      │      │ • State Mgmt    │                  │
│  │ • Error Bounds  │      │ • File I/O      │                  │
│  └─────────────────┘      └─────────────────┘                  │
│           │                        │                            │
│           ▼                        ▼                            │
│  ┌─────────────────┐      ┌─────────────────┐                  │
│  │  IndexedDB      │      │  File System    │                  │
│  │  (Progress)     │      │  (Temp Chunks)  │                  │
│  └─────────────────┘      └─────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  ClickFlash API │
                    │  (HTTP/REST)    │
                    └─────────────────┘
```

## Frontend Architecture

### Directory Structure

```
src/
├── components/
│   └── error-boundaries/
│       └── FeatureErrorBoundary.tsx  # Error boundary for feature isolation
├── services/
│   ├── uploadQueue.ts                # Offline upload queue management
│   ├── progressStorage.ts            # IndexedDB persistence layer
│   ├── batchUploadService.ts         # Web-based batch uploads
│   ├── desktopBatchUploadService.ts  # Tauri-native batch uploads
│   └── s3StorageService.ts           # S3-compatible storage
├── utils/
│   └── logger.ts                     # Structured logging utility
├── App.tsx                           # Main application component
└── main.tsx                          # Application entry point
```

### Key Services

#### Upload Queue Service (`uploadQueue.ts`)

Manages the upload queue with offline support:

```typescript
// Queue item lifecycle
pending → uploading → [completed | failed → retry → ... | cancelled]

// Key methods
- addToQueue(files, metadata): Queue files for upload
- pauseUpload(id): Pause an active upload
- resumeUpload(id): Resume a paused upload
- cancelUpload(id): Cancel and remove from queue
- retryUpload(id): Retry a failed upload
```

**Features:**
- Automatic retry with exponential backoff (base: 5s)
- Network status monitoring
- Persistent state via IndexedDB
- Concurrent upload limiting (default: 3)

#### Progress Storage (`progressStorage.ts`)

Uses IndexedDB for durable progress storage:

```typescript
interface PersistedProgress {
  jobId: string;
  sessions: UploadSessionProgress[];
  metadata: UploadMetadata;
  files: FileProgress[];
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  startedAt: string;
  lastUpdated: string;
}
```

**Features:**
- Survives app restarts
- Automatic cleanup of old completed uploads
- Query by status and date

#### Logger (`logger.ts`)

Structured logging with multiple outputs:

```typescript
logger.debug('Upload started', { fileId, size });
logger.info('Upload completed', { fileId, duration });
logger.warn('Retry attempt', { fileId, attempt });
logger.error('Upload failed', error, { fileId });
```

**Features:**
- Console output with styling
- localStorage persistence (last 100 entries)
- Log level filtering
- Export capability

### Error Handling

#### Feature Error Boundaries

```tsx
<FeatureErrorBoundary
  featureName="UploadPanel"
  showReset={true}
  onError={(error, info) => logError(error, info)}
>
  <UploadPanel />
</FeatureErrorBoundary>
```

**Features:**
- Isolates errors to specific features
- Shows user-friendly error UI
- Provides reset/retry options
- Logs errors automatically

## Backend (Rust) Architecture

### Directory Structure

```
src-tauri/src/
├── main.rs           # Application entry & Tauri setup
├── errors.rs         # Error types and handling
├── state.rs          # Application state management
└── commands/
    ├── mod.rs        # Command module exports
    ├── upload.rs     # Upload commands
    ├── file.rs       # File system commands
    ├── config.rs     # Configuration commands
    └── notification.rs # Notification commands
```

### Error Handling (`errors.rs`)

Structured error types for Rust/JS boundary:

```rust
#[derive(Error, Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(String),
    
    #[error("Network error: {0}")]
    Network(String),
    
    #[error("Upload error: {0}")]
    Upload(String),
    
    // ... more variants
}
```

**Features:**
- Serializable to JSON for JS consumption
- Error codes for programmatic handling
- User-friendly messages
- Retryable error detection

### State Management (`state.rs`)

Thread-safe state using Tokio's async Mutex:

```rust
pub struct UploadState {
    pub sessions: Mutex<HashMap<String, UploadSession>>,
    pub stats: Mutex<UploadStats>,
    pub config: Mutex<AppConfig>,
}
```

**Features:**
- Persistent configuration
- Upload statistics tracking
- Session management
- Automatic save/load

### Commands (`commands/`)

#### Upload Commands (`upload.rs`)

Core upload functionality with chunked transfers:

```rust
#[tauri::command]
pub async fn upload_file_chunk(
    state: State<'_, UploadState>,
    session_id: String,
    chunk_index: u32,
    total_chunks: u32,
    chunk_data: Vec<u8>,
    // ...
) -> CommandResult<UploadProgress>

#[tauri::command]
pub async fn finalize_upload(
    state: State<'_, UploadState>,
    app_handle: tauri::AppHandle,
    session_id: String,
    api_url: Option<String>,
    metadata: UploadMetadata,
) -> CommandResult<UploadResult>
```

**Features:**
- 1MB chunk size
- Session-based tracking
- Temp file cleanup
- API integration

#### File Commands (`file.rs`)

Secure file system operations:

```rust
#[tauri::command]
pub async fn select_files(...) -> CommandResult<Vec<FileInfo>>

#[tauri::command]
pub async fn select_folder(...) -> CommandResult<Option<Vec<FileInfo>>>

#[tauri::command]
pub async fn read_file(path: String) -> CommandResult<Vec<u8>>
```

**Security:**
- Path traversal prevention (`..` and `~` blocked)
- File size limits (500MB max)
- Extension validation

## Data Flow

### Upload Flow

```
1. User selects files
   └─► select_files() or select_folder()

2. Files added to queue
   └─► uploadQueue.addToQueue()
   └─► Progress persisted to IndexedDB

3. Queue processor picks up file
   └─► uploadQueue.processQueue()

4. File read (native path or File object)
   └─► read_file() [Tauri] or file.arrayBuffer()

5. Chunked upload to Rust backend
   └─► upload_file_chunk() [Tauri command]
   └─► Chunks saved to temp directory

6. Finalization
   └─► finalize_upload() [Tauri command]
   └─► File reassembled
   └─► Uploaded to API
   └─► Temp files cleaned up
   └─► Notification shown

7. Progress update
   └─► IndexedDB updated
   └─► UI notified
```

### Error Recovery Flow

```
Upload fails
    │
    ▼
┌─────────────────┐
│  Error Caught   │
│  in Command     │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Log Error      │
│  (structured)   │
└─────────────────┘
    │
    ▼
┌─────────────────┐     ┌─────────────────┐
│  Retry?         │────►│  Yes: Increment │
│  (count < max)  │     │  retryCount     │
└─────────────────┘     │  & requeue      │
    │ No                └─────────────────┘
    ▼                            │
┌─────────────────┐              │
│  Mark Failed    │◄─────────────┘
│  Persist State  │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Notify UI      │
│  Show retry UI  │
└─────────────────┘
```

## Error Handling

### Rust Side

1. **Error Types**: Structured `AppError` enum with serde serialization
2. **CommandResult**: Wrapper type for consistent response format
3. **Validation**: Input validation before processing
4. **Cleanup**: Always clean up temp files, even on error

### JavaScript Side

1. **Error Boundaries**: Catch React component errors
2. **Try/Catch**: Wrap invoke calls
3. **User Feedback**: Show actionable error messages
4. **Logging**: All errors logged with context

### Recovery Strategies

| Error Type | Strategy |
|------------|----------|
| Network timeout | Retry with exponential backoff |
| File not found | Mark failed, notify user |
| Permission denied | Mark failed, suggest fix |
| Chunk mismatch | Retry from failed chunk |
| API error | Retry if 5xx, fail if 4xx |

## Offline Support

### Queue Management

```typescript
// When offline:
1. Add to queue with 'pending' status
2. Persist to IndexedDB
3. Show "Waiting for connection" UI

// When online:
1. Network event triggers processing
2. Queue processor picks up pending items
3. Uploads proceed normally
```

### State Persistence

- **IndexedDB**: Progress, queue state, history
- **localStorage**: Configuration, logs
- **File System**: Temp chunks (Rust-managed)

### Recovery on Restart

1. App starts
2. Initialize IndexedDB
3. Check for incomplete uploads
4. Prompt user to resume
5. Or auto-resume if configured

## Security Considerations

### File System Security

- Path traversal blocked (`..`, `~`)
- File size limits enforced
- Extension whitelist for images
- No execution of uploaded files

### Network Security

- HTTPS for API communication
- No credentials in logs
- Chunked uploads reduce memory exposure
- Timeout protection

### Data Protection

- Temp files cleaned up after upload
- No persistent storage of file contents
- Config stored in OS-specific secure location

## Testing Strategy

### Rust Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_file_path() {
        assert!(validate_file_path("/valid/path").is_ok());
        assert!(validate_file_path("../invalid").is_err());
    }

    #[test]
    fn test_error_codes() {
        let err = AppError::Network("timeout".to_string());
        assert_eq!(err.code(), "NETWORK_ERROR");
        assert!(err.is_retryable());
    }
}
```

### Frontend Tests

```typescript
describe('UploadQueue', () => {
  it('should add items to queue', async () => {
    const queue = new UploadQueueService();
    const ids = await queue.addToQueue(files, metadata);
    expect(ids).toHaveLength(files.length);
  });

  it('should retry failed uploads', async () => {
    const item = queue.getItem(id);
    item.status = 'failed';
    const result = queue.retryUpload(id);
    expect(result).toBe(true);
    expect(item.status).toBe('pending');
  });
});
```

### Integration Tests

1. **File Selection**: Test native file picker integration
2. **Chunk Upload**: Verify chunk assembly on backend
3. **Error Recovery**: Simulate network failures
4. **Persistence**: Test state restoration

## Performance Considerations

### Memory Management

- 1MB chunks keep memory usage low
- Streaming file reads (not loading entire files)
- Temp file cleanup after uploads

### Concurrent Operations

- Max 3 concurrent uploads (configurable)
- Async file scanning for large folders
- Non-blocking UI updates

### Storage Efficiency

- IndexedDB compaction for old entries
- localStorage limited to 100 log entries
- Temp files auto-cleaned

## Configuration

### Application Config

```rust
pub struct AppConfig {
    pub default_api_url: String,
    pub max_concurrent_uploads: usize,
    pub chunk_size: usize,
    pub enable_notifications: bool,
    pub auto_retry: bool,
    pub max_retries: u32,
    pub preserve_exif: bool,
}
```

### Environment Variables

```bash
# Development
RUST_LOG=debug
TAURI_DEV=1

# Production
RUST_LOG=warn
TAURI_DEV=0
```

## Deployment

### Build Process

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Build Tauri app
cd src-tauri
cargo build --release
```

### Distribution

- Windows: `.msi` installer
- macOS: `.dmg` bundle
- Linux: `.deb` / `.AppImage`

## Future Enhancements

1. **Resumable Uploads**: Resume from specific chunks
2. **Bandwidth Throttling**: Configurable upload speed
3. **Compression**: Client-side image compression
4. **Encryption**: End-to-end encryption for sensitive files
5. **Multi-API**: Support for multiple cloud providers

---

**Last Updated**: 2026-02-18
**Version**: 0.2.0
**Maintainers**: ClickFlash Team
