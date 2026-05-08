# Implementation Plan - Phase 30: Rule 15 High-Volume Hardening

## Overview

This phase addresses **Rule 15 (Scale Capacity)** and **Law 12 (Structured Storage)**. We will harden the storage architecture to manage 100GB+ libraries by enforcing a strict album-based directory hierarchy and optimizing database lookups.

## Proposed Changes

### 1. Storage Hardening (Law 12 Enforcement)

- **Problem**: Currently, ~600 photos are dumped in the root of `pb_data/uploads/`, violating the structured storage law.
- **Fix**: Update `PhotoProcessor.ts` to ensure *all* incoming files are immediately routed to `uploads/<albumId>/highres/` or `uploads/<albumId>/thumbs/`.
- **NEW**: Create a maintenance script `ReorganizeStorage.ts` to move orphaned files from the root into their correct album folders based on database metadata.

### 2. Database Optimization

- **Indexing**: Add a dedicated index for `photos(roomNumber)` to support fast "Find My Photos" lookups when the database grows large.
- **Cleanup**: Ensure `idx_photos_albumId` and `idx_photos_created_at` are fully utilized in all core queries.

### 3. Backend Logic Enhancement

- **Law 07/12 Compliance**: Update `Syncer` and `QueueProcessor` to handle tiered paths consistently.
- **Memory Management**: Review `PhotoProcessor` for buffer leaks during high-volume imports.

### 4. UI Virtualization & Pagination

- **Optimization**: Check `PhotosView` and `FulfillmentView` (Master) and `PhotoSelectionScreen` (Touch) for virtualization. A 100GB library can have 20,000+ photos per album; loading them all will crash the browser.

## Verification Plan

### Automated Verification

- Run a simulation that imports 1,000 photos and verify they are all placed in `<albumId>/highres/`.
- Measure DB query latency for `roomNumber` search across a mock dataset of 100,000 photo records.

### Manual Verification

- Verify that "Find My Photos" on the Kiosk remains instant even with a large background database.
- Inspect the physical folder structure on disk to ensure zero files remain in the `uploads/` root.

Verify: [Fixed | New Error | Next Phase]?
