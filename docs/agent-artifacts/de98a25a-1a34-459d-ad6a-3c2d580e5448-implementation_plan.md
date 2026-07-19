# Goal: 100% Custom Offline Automatic Photo Editor

This plan details the architecture and implementation of a fully local, subscription-free, high-performance automatic photo editing engine integrated directly into the Master Portal (`apps/master`). The feature is designed to process massive batches of high-resolution photos securely and privately without relying on cloud AI APIs.

## User Review Required

> [!IMPORTANT]
> **Performance vs. Quality Trade-off**: The current frontend implementation uses `ImageData` manipulations via Web Workers for real-time previewing, while the backend relies on `sharp` (C++ libvips) for high-performance batch processing. We plan to retain this dual architecture: 
> 1. Fast, approximated Canvas/WebGL edits in the UI for instant feedback.
> 2. Perfect, high-quality rendering via `sharp` when edits are baked and synced to disk.
> Do you approve of this dual-rendering architecture, or would you prefer the UI to wait for the backend to render the high-res previews in real-time? (Recommendation: Keep dual-rendering for UI snappiness).

## Open Questions

> [!WARNING]
> **Background Replacement**: We have a backend `ChromaKeyService` using `@imgly/background-removal-node`. Should we expose a "Replace Background" capability in the new Editor UI, or should that remain a separate feature (e.g. for photo booths)?

> [!WARNING]
> **Database Structure**: Edits will be saved as JSON in a `manualEdits` column on the `photos` table. Do we need to maintain a history of edits (undo/redo stack) in the database, or just the final state?

## Proposed Changes

---

### Phase 1: Interactive Frontend Editor (`apps/master`)

The UI currently has basic placeholders. We will build a production-ready interface.

#### [MODIFY] `apps/master/src/components/AutoEditor/PhotoEditor.tsx`
- Complete the integration with `imageProcessingService` for real-time, non-blocking UI previews of Auto-Enhance and Skin Retouching.
- Add controls (sliders) for Manual Edits (Exposure, Contrast, Highlights, Shadows).
- Connect the "Save" action to update the SQLite database via `apiService`.

#### [MODIFY] `apps/master/src/components/AutoEditor/BatchControls.tsx`
- Implement a batch-processing UI where a photographer can select multiple photos and apply the "Auto-Enhance" heuristic engine or sync specific edits (e.g., applying the same preset) across hundreds of files concurrently.

#### [MODIFY] `apps/master/src/components/AutoEditor/BeforeAfterSlider.tsx`
- Improve the visual slider component for pixel-perfect comparison of the original preview and the locally edited canvas.

---

### Phase 2: High-Performance Backend Rendering Engine

We already have a foundation in `photoWorker.ts` and `AutoEditEngine.ts`. We need to wire it up to respond to UI changes and handle batch jobs robustly.

#### [MODIFY] `apps/master/backend/workers/photoWorker.ts`
- Ensure the `apply-edits` job correctly applies the full suite of heuristics (Smart Crop, Auto Exposure, Contrast) computed by `AutoEditEngine` and bakes `_preview_edited.jpg` and `_highres_edited.jpg` securely to disk.
- Add support for `@imgly/background-removal-node` (via `ChromaKeyService`) directly into the worker pipeline if requested.

#### [MODIFY] `apps/master/backend/server.ts`
- Expose new endpoints for batch editing (`POST /api/photos/batch-edit`) and single photo edits (`PUT /api/photos/:id/edits`).
- Hook the endpoints up to the `sqliteConcurrency` database layer and trigger `photoWorker` to re-process the files.

---

### Phase 3: Database Storage and Sync

#### [MODIFY] `packages/database/schema/unified.sql`
- Add `manualEdits` (TEXT/JSON) and `autoEnhanced` (BOOLEAN) to the `photos` table in SQLite/D1 if missing.

#### [MODIFY] `apps/master/src/services/db.ts`
- Add repository methods for fetching and updating the edit state of photos efficiently.

---

### Phase 4: Integration and E2E Testing

#### [NEW] `apps/master/e2e/offline-editor.spec.ts`
- Playwright E2E test verifying the flow: Photo is loaded -> Auto Enhance triggered in UI -> Batch apply -> API validates database update -> Backend worker successfully bakes new assets.

### Verification Plan

The end-to-end integration is now implemented. To verify that `autoEnhanced` and `autoEdits` persist correctly:
1. Boot up the Master app (`npm run dev:master` or `npm run start`).
2. Open an album, navigate to a photo, and click **"Review Auto Edits"** to open the `PhotoEditor`.
3. Accept the auto-edits.
4. Verify that the Filmstrip thumbnail now shows the blue ⚡️ (Zap) badge indicating it's `autoEnhanced`.
5. Click **"Save"** in the top right of the `AlbumEditor` toolbar.
6. Verify the successful toast message. You can optionally inspect SQLite/PocketBase to confirm the `autoEnhanced` property is `1` (true).

### Verification Steps
- [x] Backend logic written & verified via unit testing integration logic.
- [x] UI logic written for Review Modal and batch saving.
- [ ] Manual User Verification (as outlined above).

### Manual Verification
- Open Master Portal, select 50 photos, and click "Auto Enhance".
- Observe CPU and Memory usage via `Performance Monitor` to ensure the Node worker threads scale effectively without crashing the app.
- Check the output directory to verify that `_preview_edited.jpg` and `_highres_edited.jpg` are generated and correctly represent the edits.
