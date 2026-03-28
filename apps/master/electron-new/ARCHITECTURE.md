# Phase 71: Master Electron App Rebuild - Architecture

## Goals
1. **Eliminate Freezing**: Strict separation between main/renderer processes
2. **Process Isolation**: Heavy processing in isolated worker threads
3. **Auto-Recovery**: Automatic restart on crashes/hangs
4. **Memory Management**: Strict resource limits and monitoring

## New Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Window     │  │  Process     │  │   IPC Broker     │  │
│  │   Manager    │  │  Monitor     │  │   (Safe Bridge)  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼────────────────┼───────────────────┼────────────┘
          │                │                   │
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend Server Process                     │
│  (Forked Node.js Process with 8GB heap limit)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Express    │  │  Worker      │  │   Service        │  │
│  │   Server     │  │  Pool Mgr    │  │   Registry       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
└─────────┼────────────────┼─────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│              Worker Thread Pool (CPU-intensive)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Photo Worker │  │  ML Worker   │  │  Thumbnail Wkr   │  │
│  │ (Sharp)      │  │ (Face Recog) │  │  (Quick Gen)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Renderer Process (UI)                      │
│              (Fully Isolated - No Node Access)               │
└─────────────────────────────────────────────────────────────┘
```

## Key Changes

### 1. Process Separation
- **Main Process**: Only manages windows and process lifecycle
- **Backend Process**: Separate forked process for Express server
- **Worker Threads**: CPU-intensive tasks (image processing, ML)
- **Renderer**: React UI with no direct Node.js access

### 2. IPC Communication
- ContextBridge with strict whitelist
- Async IPC with timeout protection
- No synchronous IPC calls (prevents blocking)

### 3. Worker Pool Architecture
- Fixed pool sizes to prevent memory exhaustion
- Queue-based task distribution
- Automatic worker restart on failure

### 4. Process Monitoring
- Health check heartbeat every 5 seconds
- Automatic restart on unresponsive processes
- Memory usage monitoring with limits

## File Structure

```
electron-new/
├── src/
│   ├── main/
│   │   ├── index.ts              # Entry point
│   │   ├── window-manager.ts     # BrowserWindow management
│   │   ├── process-manager.ts    # Backend process lifecycle
│   │   ├── ipc-broker.ts         # Safe IPC bridge
│   │   └── crash-recovery.ts     # Auto-restart logic
│   ├── preload/
│   │   └── index.ts              # ContextBridge preload
│   ├── workers/
│   │   ├── photo-worker.ts       # Image processing worker
│   │   ├── ml-worker.ts          # ML/face recognition worker
│   │   └── worker-pool.ts        # Worker pool manager
│   ├── utils/
│   │   ├── logger.ts             # Structured logging
│   │   └── constants.ts          # Process limits & config
│   └── types/
│       └── electron.d.ts         # TypeScript types
├── package.json                  # Electron-specific deps
└── tsconfig.json                 # TypeScript config
```

## Memory Limits

| Process | Max Memory | Purpose |
|---------|-----------|---------|
| Main | 1GB | Window management only |
| Backend | 8GB | Express + business logic |
| Photo Worker | 2GB per worker | Sharp image processing |
| ML Worker | 4GB per worker | TensorFlow/face-api |
| Renderer | 512MB | UI rendering only |

## Error Recovery

1. **Worker Crash**: Restart worker, retry task (max 3 attempts)
2. **Backend Hang**: Kill and restart after 30s unresponsive
3. **Renderer Crash**: Reload page, preserve session
4. **Main Process Crash**: Full app restart (handled by Windows service)
