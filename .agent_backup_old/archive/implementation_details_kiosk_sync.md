# implementation_details_kiosk_sync.md

## Overview

This document details the specific implementation of the synchronization mechanism between the Master App (Backend) and Touch App (Kiosk).

## 1. Data Fetching Strategy

The Touch App operates in an "Offline First" mode but relies on the Master App for initial data population.

### Album & Photo Fetching

- **Service**: `apiService.getAlbums()`
- **Mechanism**: Calls PocketBase `albums` collection.
- **Critical Requirement**: To display photos, the `includePhotos: true` option **MUST** be passed.
- **Expansion Logic**:
  - The API request uses `expand` parameter.
  - **Keys Checked**: The client robustly checks multiple keys to handle schema variations:
        1. `photos_via_albumId` (Preferred: Reverse relation on `photos.albumId`)
        2. `photos` (Direct relation fallback)
        3. `photos_via_album` (Legacy fallback)

### Code Reference

```typescript
// touch-app/react/src/services/api/photoService.ts

if (options?.includePhotos && expand) {
    const potentialPhotos = 
        expand.photos_via_albumId || 
        expand.photos || 
        expand.photos_via_album;
    // ... map photos
}
```

## 2. Kiosk Context Initialization

The `KioskContext.tsx` manages the initial load.

- **Sync Loop**:
    1. Load from Offline Storage (IndexedDB).
    2. Attempt Online Sync (`apiService.getAlbums({ includePhotos: true })`).
    3. Listen for Realtime Events (`pb.collection('albums').subscribe`).

## 3. Configuration Settings

The Touch App relies on specific settings for file access and server connection.

- **`localNetwork`**:
  - `serverUrl`: URL of the Master Backend (e.g., `http://192.168.1.100:8090`).
  - **Port Enforcement**: The system strictly enforces port `8090` for Master Backend communication.
- **`touchOrdersFolder`**:
  - Local path on the Kiosk machine where orders are finalized before being pushed to Master.

## 4. Common Issues & Fixes

### "0 Photos" Bug

- **Symptom**: Albums appear but show "0 photos".
- **Cause**: `apiService.getAlbums()` called without `{ includePhotos: true }`.
- **Fix**: Update `KioskContext.tsx` to pass the option.
- **Root Cause**: Default API behavior favors lightweight metadata; expansion must be requested explicitly.

### "Network Error" during Sync

- **Cause**: Firewall blocking port 8090 or wrong IP.
- **Fix**: Check Windows Firewall rules for "Node.js" and "Star Master". Verify IP in Kiosk Settings.
