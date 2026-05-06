# Master App Upgrade Plan: "React Evolution"

This document outlines the upgrade path for the Master App, transitioning from the legacy Python/PyQt structure to the modern **React + Electron + Node.js** architecture (`master-app/react-new`).

## 1. Core Objectives

1. **Modernize UI**: Replace PyQt with a responsive, beautiful React Dashboard.
2. **Unified Backend**: Consolidate logic into the Node.js/TypeScript `server.ts` to reduce context switching (Python vs Node).
3. **Cloud Integration**: Implement the "Moneytrash" and "Retention" sync logic directly in the Node.js backend.

## 2. Feature Roadmap

### Phase 1: Cloud Sync Port (TypeScript)

We must replicate the logic planned for Python into `backend/services/CloudSyncService.ts`.

* **Upstream**: Push `Album` and `Photo` metadata + Watermarked Previews to Cloud PocketBase.
* **Downstream**: Poll Cloud for `Order:Paid` -> Trigger Fulfillment.
* **Retention**: Implement the "Weekly Batch" scheduler (e.g., using `node-cron`).

### Phase 2: Frontend "Cloud Control"

Add a specific "Cloud" section to the React Dashboard.

* **Status Panel**: Show "Last Sync Time", "Pending Uploads", "Cloud Connection Status".
* **Manual Triggers**: "Force Sync Now", "Run Retention Batch Now".
* **Configuration UI**: Fields to set `Cloud URL`, `Email`, `Retention Days`.

### Phase 3: Customer Email Management

* **UI Update**: Ensure the "Create Album" or "Booking" forms in React include a mandatory/optional `Customer Email` field.
* **Metadata**: Ensure this email flows into the SQLite database and subsequently to the Cloud sync payload.

## 3. Revised Technical Stack (Target)

* **Frontend**: React 19, Tailwind CSS, Shadcn UI (if available) / Custom Premium UI.
* **Backend**: Express.js (or direct Electron IPC), specialized `better-sqlite3` database.
* **Worker Threads**: Use `workers/photoWorker.ts` for resizing/watermarking (Heavy Lifting).

## 4. Specific Implementation Items

1. **`services/CloudSyncService.ts`**:
    * Auth with Cloud PocketBase.
    * Sync Logic (Albums -> Photos -> Previews).
2. **`workers/retentionWorker.ts`**:
    * Job to generate `_preview_wm.webp` if missing.
3. **React Routes**:
    * `/settings/cloud`: configuration page.

## 5. Deployment

* The `react-new` app builds into an `.exe` via `electron-builder`.
* This single executable replaces the Python scripts for the end-user.

verify: [Approve Master Upgrade Plan]?
