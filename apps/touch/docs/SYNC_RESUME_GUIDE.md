# Sync Resume Capability Guide

## Overview

The sync service now supports checkpoint and resume functionality, allowing interrupted sync operations to resume from where they left off instead of starting from the beginning.

## Features

- **Checkpoint System**: Saves progress after each album batch
- **Resume Capability**: Automatically resumes from last checkpoint
- **Progress Tracking**: Tracks processed albums and photos
- **Automatic Cleanup**: Clears checkpoint on successful completion
- **Expiry Protection**: Checkpoints expire after 24 hours

## How It Works

### Checkpoint Creation

Checkpoints are automatically created and updated during sync:

1. **Initial Checkpoint**: Created when sync starts
2. **Batch Updates**: Updated after each album batch is processed
3. **Photo Updates**: Updated when each photo is successfully processed
4. **Completion**: Checkpoint is cleared when sync completes successfully

### Resume Process

When sync starts:

1. **Check for Checkpoint**: Looks for existing checkpoint in localStorage
2. **Validate Checkpoint**: Checks if checkpoint is expired (>24 hours)
3. **Filter Processed**: Skips albums/photos already processed
4. **Resume Sync**: Continues from where it left off
5. **Update Progress**: Updates checkpoint as sync progresses

### Checkpoint Structure

```typescript
{
  timestamp: number,              // When checkpoint was created
  albumsProcessed: string[],      // Array of processed album IDs
  photosProcessed: string[],      // Array of processed photo IDs
  currentAlbumId?: string,        // Currently processing album
  currentPhotoIndex?: number,     // Current photo index
  totalAlbums: number,            // Total albums to sync
  totalPhotos: number,            // Total photos to sync
  bytesTransferred: number,       // Total bytes transferred
  startTime: number,              // Sync start time
  syncType: 'full' | 'incremental'
}
```

## Usage

### Automatic Resume

The sync service automatically resumes from checkpoint:

```typescript
// Sync will automatically check for and resume from checkpoint
await syncService.sync();
```

### Manual Checkpoint Management

```typescript
import { syncCheckpointService } from './services/syncCheckpointService';

// Check if checkpoint exists
const hasCheckpoint = syncCheckpointService.hasValidCheckpoint();

// Get checkpoint statistics
const stats = syncCheckpointService.getCheckpointStats();
console.log(stats);
// {
//   exists: true,
//   albumsProcessed: 5,
//   photosProcessed: 120,
//   age: 3600000  // milliseconds
// }

// Clear checkpoint manually (if needed)
syncCheckpointService.clearCheckpoint();
```

## Benefits

### Before Resume Capability

- **Problem**: Interrupted syncs restart from beginning
- **Impact**: Wastes bandwidth and time
- **Example**: Sync 1000 photos, interrupted at 900, restarts from 0

### After Resume Capability

- **Solution**: Sync resumes from last checkpoint
- **Impact**: Saves bandwidth and time
- **Example**: Sync 1000 photos, interrupted at 900, resumes at 900

## Performance Impact

### Bandwidth Savings

- **Before**: 100% of photos re-downloaded on interruption
- **After**: Only remaining photos downloaded
- **Savings**: Up to 90% bandwidth reduction for interrupted syncs

### Time Savings

- **Before**: Full sync time on every restart
- **After**: Only remaining items processed
- **Savings**: Up to 90% time reduction for interrupted syncs

## Storage

Checkpoints are stored in `localStorage`:
- **Key**: `syncServiceCheckpoint`
- **Size**: ~1-5KB (depends on number of processed items)
- **Expiry**: 24 hours

## Error Handling

### Checkpoint Expiry

- Checkpoints older than 24 hours are automatically cleared
- Prevents stale checkpoints from blocking sync
- Fresh sync starts if checkpoint is expired

### Sync Failures

- Checkpoint is preserved on sync failure
- Allows resume on next sync attempt
- Only cleared on successful completion

### Storage Errors

- Gracefully handles localStorage errors
- Falls back to normal sync if checkpoint can't be saved
- Logs warnings but doesn't block sync

## Testing

### Test Resume Capability

1. **Start Sync**: Begin syncing a large album set
2. **Interrupt**: Close browser or stop sync mid-way
3. **Restart**: Start sync again
4. **Verify**: Check logs for "Resuming sync from checkpoint"
5. **Confirm**: Only remaining items are processed

### Test Checkpoint Expiry

1. **Create Checkpoint**: Start and interrupt a sync
2. **Wait**: Wait 24+ hours (or manually expire)
3. **Restart**: Start sync again
4. **Verify**: Checkpoint should be cleared, full sync starts

## Monitoring

### Checkpoint Statistics

```typescript
const stats = syncCheckpointService.getCheckpointStats();
if (stats.exists) {
  console.log(`Resume available: ${stats.albumsProcessed} albums, ${stats.photosProcessed} photos`);
}
```

### Log Messages

Look for these log messages:

- `"[SyncService] Resuming sync from checkpoint"` - Resume detected
- `"[SyncCheckpoint] Checkpoint saved"` - Checkpoint updated
- `"[SyncCheckpoint] Checkpoint expired, clearing"` - Expired checkpoint
- `"[SyncService] Filtered processed albums"` - Skipping processed items

## Best Practices

1. **Don't Clear Manually**: Let sync service manage checkpoints
2. **Monitor Storage**: Check localStorage size if issues occur
3. **Check Logs**: Review checkpoint messages for debugging
4. **Allow Completion**: Let sync complete to clear checkpoint

## Troubleshooting

### Checkpoint Not Working

1. **Check localStorage**: Verify checkpoint is saved
2. **Check Expiry**: Ensure checkpoint isn't expired
3. **Check Logs**: Look for checkpoint-related messages
4. **Clear Manually**: If stuck, clear checkpoint manually

### Sync Always Restarts

1. **Check Storage**: Verify localStorage is available
2. **Check Errors**: Look for checkpoint save errors
3. **Check Expiry**: Checkpoint might be expiring too quickly
4. **Check Code**: Verify checkpoint service is imported

## Configuration

### Checkpoint Expiry

Default: 24 hours

To change, modify `CHECKPOINT_EXPIRY_MS` in `syncCheckpointService.ts`:

```typescript
const CHECKPOINT_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours
```

## Future Enhancements

Potential improvements:
- Incremental sync (only new/changed items)
- Checkpoint compression for large datasets
- Server-side checkpoint storage
- Multi-device checkpoint sync

---

**Status**: ✅ **Sync Resume Capability Implemented**

