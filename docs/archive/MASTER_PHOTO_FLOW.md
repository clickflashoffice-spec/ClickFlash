# Master Photo Flow Audit Report

> **Scope:** ClickFlash Master app photo pipeline — capture, transfer, store, sync, delivery, backup.  
> **Generated:** 2026-06-12  
> **Auditor:** Hermes Agent (sub-agent)  
> **Working Directory:** `C:\Users\alamo\Desktop\ClickFlash`

---

## 1. Master Photo Storage Topology

| Storage Location | Type | Path / Table | Purpose | Retention |
|---|---|---|---|---|
| **Local Uploads** | File system | `UPLOAD_DIR` (default `pb_data/uploads`) | Raw + derived assets | Until retention policy runs |
| **Album Sub-dirs** | File system | `uploads/<albumId>/highres/` | Stripped/corrected originals | Same as above |
| **Thumbs Sub-dirs** | File system | `uploads/<albumId>/thumbs/` | `_thumb`, `_preview`, `_tiny` | Same as above |
| **SQLite `photos`** | D1 row | `apps/master/backend/shared/migrations/002_enhanced_photos_schema.sql` | Metadata, hashes, URLs | Permanent unless deleted |
| **`photo_adjustments`** | D1 row | `apps/master/backend/migrations/056_photo_adjustments_stack.sql` | Non-destructive edit JSON | Permanent |
| **`face_indexing_queue`** | D1 row | `apps/master/backend/shared/migrations/030_add_face_indexing_queue.sql` | Background face indexing jobs | Cleared on completion |
| **`photo_faces`** | D1 row | `apps/master/backend/shared/migrations/047_add_box_to_photo_faces.sql` | Face descriptors + bounding boxes | Permanent |
| **`kiosk_transfer_queue`** | D1 row | `apps/master/backend/shared/migrations/053_kiosk_transfer_queue.sql` | Master→Touch push jobs | Cleared on completion |
| **`operation_logs`** | D1 row | Referenced in `cloudSyncService.ts` (line 435) | Cloud sync operation ledger | Configurable (default 7 days) |
| **Cloud R2 / Hub** | Object storage | `cloudApiUrl` + `/api/cloud/upload-photo/chunk` | Chunked high-res backup | Retention days from `moneytrash_settings` |
| **Gallery watermarked** | File system | `uploads/gallery/watermarked/<albumId>/` | Proof exports | On-demand / ephemeral |
| **Order hot folders** | File system | `DATA_DIR/orders/order-<orderNumber>/` | Fulfillment copies | Manual cleanup |
| **Audit logs** | File system | `DATA_DIR/audit_logs/audit-YYYY-MM-DD.log` | JSONL audit trail | 30 days (`RETENTION_DAYS`) |

---

## 2. Master Photo Operations

### 2.1 Ingestion (Upload / Import)

| Handler | File + Lines | Operation | Storage Effect | Data Flow |
|---|---|---|---|---|
| **Multipart upload parser** | `backend/routes/collections.ts` 983–1011 | `formidable` parses `multipart/form-data` into `IMPORT_DIR` temp files | Temp file on disk | Touch→Master ingest |
| **Pre-process hash check** | `backend/routes/collections.ts` 1066–1092 | SHA-256 hash computed *before* `PhotoProcessor` to detect duplicates early | None (read-only) | Touch→Master ingest |
| **PhotoProcessor.processPhoto** | `backend/shared/photoProcessor.ts` 215–371 | Spawns `photoWorker` thread; moves assets to `uploads/<albumId>/` | Writes `highres/`, `thumbs/` files + DB row | Touch→Master ingest |
| **Worker: hash + resize** | `backend/workers/photoWorker.ts` 61–224 | `sharp` generates `_thumb`, `_preview`, `_tiny`, `_highres` + SHA-256 hash | 4 asset files per photo | Touch→Master ingest |
| **Duplicate detection** | `backend/shared/photoProcessor.ts` 273–291 | Post-worker hash check against `photos.fileHash` + `albumId` | Throws `DUPLICATE_PHOTO` (cleanup temp) | Touch→Master ingest |
| **AlbumService.registerPhoto** | `backend/services/albumService.ts` 185–247 | Whitelist-based `INSERT INTO photos`; queues face indexing; sets cover | D1 row in `photos`, `face_indexing_queue` | Touch→Master ingest |
| **Batch register** | `backend/services/albumService.ts` 300–374 | Transactional bulk insert for 1000+ imports | Multiple D1 rows + queue entries | Touch→Master ingest |
| **Folder Monitor** | `backend/services/folderMonitor.ts` (imported in `server.ts` line 89) | Watches `IMPORT_DIR` for auto-ingestion | Same as above | External→Master ingest |

### 2.2 Transformation (Edit / Watermark / Cull)

| Handler | File + Lines | Operation | Storage Effect | Data Flow |
|---|---|---|---|---|
| **Apply edits (worker)** | `backend/workers/photoWorker.ts` 249–333 | `handleApplyEditsJob`: rotation, crop, color, retouch, blur, sharpen | Overwrites high-res file; updates `photo_adjustments` | Master→Master edit |
| **Edit validation** | `backend/shared/photoProcessor.ts` 438–573 | `applyEdits`: ML safety check (`mlPool.run({type:"verify-retouch"})`), then DB upsert | `photo_adjustments` row + `ai_operations` log | Master→Master edit |
| **Watermark generation** | `backend/workers/photoWorker.ts` 390–426 | `handleWatermarkJob`: SVG “PROOF” overlay → `_preview_wm.webp` | File in `thumbs/` or `gallery/watermarked/` | Master→Gallery proof |
| **Gallery export** | `backend/routes/gallery.ts` 27–92 | Parallel watermark generation (max 4 concurrency) via `watermarkWorker.js` | Files in `uploads/gallery/watermarked/<albumId>/` | Master→Gallery proof |
| **AI Culling** | `backend/routes/culling.ts` 13–46 | `AICullingService.analyzePhoto` + `groupPhotos` + `autoCull` | Scores in `ai_scores`; groups in `ai_groups`; status in `photos.cullingStatus` | Master→Master cull |
| **Culling confirm (delete)** | `backend/routes/culling.ts` 91–98 | `fs.unlinkSync(storagePath)` + `DELETE FROM photos` | Removes file + DB row permanently | Master→Master cull |

### 2.3 Sync & Replication

| Handler | File + Lines | Operation | Storage Effect | Data Flow |
|---|---|---|---|---|
| **WebSocket mutation** | `backend/services/SyncManager.ts` 210–347 | `handleMutation`: Zod validation, vector-clock merge, idempotency check, DB write | D1 row update + `mutation_ack_log` insert | Touch↔Master sync |
| **HTTP fallback mutation** | `backend/routes/sync.ts` 29–53 | `POST /sync/mutation` with HMAC-SHA256 LAN signing | Same as above | Touch↔Master sync |
| **Cloud sync (orders)** | `backend/services/cloudSyncService.ts` (line ~1900) | `syncOrdersToGallery`: pushes paid orders to Hub | `orders.cloud_sync_status` updated | Master→Cloud sync |
| **Chunked photo upload** | `backend/services/cloudSyncService.ts` (line ~2000) | `uploadFileChunked`: 1MB chunks to `/api/cloud/upload-photo/chunk` | None locally; remote R2 object | Master→Cloud sync |
| **Retention batch** | `backend/services/cloudSyncService.ts` (line ~430) | `runRetentionBatch`: uploads preview/tiny assets for retention policy | `photos` status updated | Master→Cloud sync |
| **Kiosk push** | `backend/routes/orders.ts` 158–182 | `POST /:id/fulfillment/push` → `FulfillmentService.broadcastStatusToKiosks` | Copies to kiosk `ordersFolderPath` | Master→Touch delivery |
| **Order hot folder** | `backend/routes/collections.ts` 572–638 | Auto-creates `DATA_DIR/orders/order-<orderNumber>/` with copies of high-res | Files in `orders/` subdir | Master→Lab fulfillment |

### 2.4 Retrieval & Delivery

| Handler | File + Lines | Operation | Storage Effect | Data Flow |
|---|---|---|---|---|
| **Static file serve** | `backend/routes/files.ts` 38–291 | `GET /files/*`: smart resolution (album/thumbs/highres/legacy), range requests, ETag | Read-only; `X-File-MD5` header | Master→Customer download |
| **Order asset proxy** | `backend/routes/orders.ts` 231–328 | `GET /:id/assets?url=...`: serves from kiosk `ordersFolderPath` | Read-only | Master→Kiosk display |
| **Gallery checkout** | `backend/routes/galleryCheckout.ts` 31–114 | Stripe checkout + webhook; on payment unlocks high-res | `gallery_orders` row + `orders` mirror row | Customer→Master purchase |
| **Receipt email** | `backend/routes/galleryCheckout.ts` 221–293 | Async PDF generation + Resend email with attachment | `DATA_DIR/receipts/` PDF | Master→Customer email |
| **Print job** | `backend/routes/orders.ts` 185–228 | `POST /:id/print`: applies latest edits, enqueues to printer | Temporary processed file (30s cleanup) | Master→Hardware print |

---

## 3. Photo Idempotency Map

| Write Operation | Idempotency Mechanism | Key / Token Location | Failure Mode on Duplicate |
|---|---|---|---|
| **Kiosk order creation** | `clientMutationId` | `orders.client_mutation_id` (DB unique) | HTTP 208 `deduplicated: true` (`orders.ts` 445–482) |
| **WebSocket mutation** | Payload hash + mutation ID | `mutation_ack_log` table (`SyncManager.ts` 236–250) | Returns `ALREADY_APPLIED` |
| **Vector-clock update** | Clock comparison (`after`/`before`/`concurrent`) | `photos.vector_clock` JSON column | Older mutations ignored silently |
| **Stripe checkout** | Stripe `idempotencyKey` | `checkout-session-${orderId}` (`stripeService.ts` 75) | Stripe deduplicates automatically |
| **Photo upload (hash)** | SHA-256 pre-check + post-check | `photos.fileHash` + `albumId` | 409 `DUPLICATE_PHOTO` (`collections.ts` 1148) |
| **Batch manualEdits** | `updatedAt` optimistic locking | Client sends `_clientUpdatedAt`; server rejects if `serverTs - clientTs > 2000ms` (`collections.ts` 365–375) | 409 `EDIT_CONFLICT` |
| **Cloud sync operation** | `correlationId` + `operation_logs` sequence | `operation_logs` table with `sequence_number` (`cloudSyncService.ts` 435) | Duplicate sequence numbers skipped |
| **Face indexing queue** | `INSERT OR IGNORE` | `face_indexing_queue(photoId)` (`albumService.ts` 382) | Duplicate queue entries ignored |
| **Settings sync** | Hash-based change detection | `settings.remote_settings_hash` (`cloudSyncService.ts` 343–395) | Skips DB write if `changed: false` |
| **Album cover** | Conditional update | `albums.coverPhotoUrl IS NULL` (`albumService.ts` 253) | Only first photo sets cover |

---

## 4. Photo Failure Recovery

### 4.1 What’s In Place

| Component | Recovery Mechanism | Evidence |
|---|---|---|
| **Worker pool errors** | Error propagated to caller with `statusCode: 503` and `retryAfter` | `photoProcessor.ts` 134–138 |
| **Corrupt JPEG** | Aggressive repair path in worker: reads buffer, re-runs sharp with `failOnError: false` | `photoWorker.ts` 184–217 |
| **Safe file move** | `safeMove` with 5 retries, fallback `copyFile+unlink` for `EXDEV/EBUSY/EPERM` | `photoProcessor.ts` 295–314 |
| **Cloud sync retry** | Exponential backoff (1.5×), jitter, circuit breaker (5 min open), per-pipeline tracking | `cloudSyncService.ts` 83–116 |
| **Chunked upload retry** | Per-chunk 3 retries with exponential backoff (2s, 4s, 8s) | `cloudSyncService.ts` (~2100) |
| **Queue hydration** | On boot, resets `failed` operations older than 1 hour back to `pending` | `cloudSyncService.ts` 433–468 |
| **DLQ** | `dead_letter` status in `operation_logs` after 5 retries | `cloudSyncService.ts` 89 |
| **Face indexing retry** | `MAX_RETRIES = 3`; marks `failed` after exhaustion | `FaceIndexingWorker.ts` 47, 131–148 |
| **Kiosk transfer retry** | `retry_count` in `kiosk_transfer_queue` | `053_kiosk_transfer_queue.sql` |
| **Frontend update retry** | `MAX_RETRIES = 3` with 1s delay for network errors; conflict errors not retried | `src/services/api/photoService.ts` 256–314 |
| **Batch save fallback** | If batch endpoint fails, falls back to sequential `updatePhoto` calls | `src/services/api/photoService.ts` 376–397 |
| **Temp cleanup** | `fs.unlinkSync(tempFilepath)` on any processing error | `photoProcessor.ts` 362–369 |

### 4.2 What’s Missing

| Gap | Severity | Notes |
|---|---|---|
| **No orphan file scanner** | 🔴 High | `orphanRecovery.ts` referenced in task description but **not found** in codebase. No scheduled scan reconciles `photos` rows with filesystem assets. |
| **No DLQ reprocessing UI/API** | 🟡 Medium | `dead_letter` rows exist but no automated or manual retry path beyond boot hydration. |
| **No checksum verification after move** | 🟡 Medium | `safeMove` does not verify MD5/SHA-256 after `copyFile` fallback; silent corruption possible. |
| **No worker thread resurrection** | 🟡 Medium | If `photoWorker` thread crashes (unhandled exception), `WorkerPool` may not respawn until restart. |
| **No cloud sync “stuck” alert** | 🟡 Medium | If `cloud_sync_status = 'failed'` persists for days, no alert or escalation path visible. |
| **No photo-level backup verification** | 🟡 Medium | After chunked upload completes, no local record of remote ETag/checksum for verification. |
| **No graceful shutdown for face worker** | 🟢 Low | `FaceIndexingWorker.stop()` clears timer but does not finish in-flight batch. |

---

## 5. Photo Audit Trail

### 5.1 What’s Logged

| Event | Logger | Destination | Fields |
|---|---|---|---|
| **Photo upload start** | `logger.info` | `Logger` (file + console) | `photoId`, `albumId`, endpoint |
| **Duplicate detected** | `logger.warn` | `Logger` | Hash prefix, existing photo ID |
| **Worker success/failure** | `parentPort.postMessage` | Main thread → `Logger` | `success`, `photoId`, `assets` |
| **Mutation applied** | `SyncManager` | `Logger` | `entity`, `action`, `id`, `status` |
| **Data access (CRUD)** | `auditLogger.logDataAccess` | `audit_logs/audit-YYYY-MM-DD.log` JSONL | `userId`, `email`, `action`, `resource`, `resourceId` |
| **Login/logout** | `auditLogger.logLoginAttempt` | Same JSONL | `email`, `success`, `ip` |
| **Config change** | `auditLogger.logConfigChange` | Same JSONL | `setting`, `oldValue`, `newValue` |
| **Cloud sync order** | `auditService.logOrderSyncEvent` | `Logger` + `audit_logs` (implied) | `correlationId`, `orderId`, `duration` |
| **AI retouch** | `ai_operations` table | SQLite | `photo_id`, `operation_type`, `parameters` |
| **Rate limit exceeded** | `auditLogger.logRateLimitExceeded` | JSONL | `ip`, `endpoint` |

### 5.2 What Should Be Logged (Gaps)

| Missing Event | Severity | Why It Matters |
|---|---|---|
| **Photo deletion** | 🔴 High | `DELETE /:collection/records/:id` logs generic `DELETE Success` but does not capture *which* photo file paths were removed, making forensic recovery impossible. |
| **File system asset integrity check** | 🟡 Medium | No periodic log entry confirming `photos` row count matches `uploads/` file count. |
| **Cloud upload completion per photo** | 🟡 Medium | `uploadFileChunked` logs chunk-level success but does not write a persistent `photo_cloud_uploads` audit row. |
| **Gallery token generation** | 🟡 Medium | `gallery_tokens` creation is not explicitly audit-logged; customer access traceability gap. |
| **Culling action** | 🟢 Low | `culling.ts` logs analysis but not per-photo `cullingStatus` change with user attribution. |

---

## 6. Master→Cloud Photo Sync

### 6.1 Protocol

| Attribute | Value | Source |
|---|---|---|
| **Transport** | HTTPS (Node 18 `fetch`) | `cloudSyncService.ts` 80 |
| **Auth** | Bearer JWT (`this.token`) obtained via `authenticate()` | `cloudSyncService.ts` 335–404 |
| **Batch size (orders)** | 10 per cycle | `cloudSyncService.ts` (~1900) `LIMIT 10` |
| **Batch size (CRM)** | 50 per cycle | `cloudSyncService.ts` (~2400) `LIMIT 50` |
| **Chunk size (files)** | 1 MB | `cloudSyncService.ts` 87 (`CHUNK_SIZE`) |
| **Retry policy** | Exponential backoff 1.5×, jitter 0.3, max 30 min interval | `cloudSyncService.ts` 83–93 |
| **Circuit breaker** | 10 consecutive failures → 5 min OPEN | `cloudSyncService.ts` 91–111 |
| **Per-pipeline breaker** | 5 failures → 2 min timeout | `cloudSyncService.ts` 114–116 |
| **Correlation ID** | `cf_${Date.now()}_${randomBytes(4).toString('hex')}` | `cloudSyncService.ts` (~1905) |
| **Idempotency** | `operation_logs.sequence_number` + `correlationId` | `cloudSyncService.ts` 435 |
| **R2 namespace** | `deskId/albumId/originalName` | `cloudSyncService.ts` (~2050) |

### 6.2 Sync Flow

1. `CloudSyncService.start()` schedules `sync()` every 1–30 min (`MIN_SYNC_INTERVAL` → `MAX_SYNC_INTERVAL`).
2. `hydrateQueueState()` resets `failed` ops > 1 hour old to `pending` on boot.
3. `syncOrdersToGallery()` selects `status = 'paid'` + `cloud_sync_status IN (NULL, 'pending', 'failed')` LIMIT 10.
4. For each order: build `orderData` with `correlationId`, POST to `${cloudApiUrl}/api/cloud/sync/order`.
5. On success: update `orders.cloud_sync_status = 'synced'`, `sync_status = 'synced'`.
6. On failure: update `cloud_sync_status = 'failed'`, `cloud_sync_error = <error text>`.
7. High-res photos are uploaded separately via `uploadFileChunked` (1 MB chunks, 3 retries per chunk).
8. Retention assets (preview/tiny) are uploaded via `uploadRetentionAsset` to `cloudGalleryUrl`.

### 6.3 Gaps

- **No photo-level sync status column**: `photos` table has `sync_status` / `sync_id` (migration 028) but `cloudSyncService` does not appear to use them for per-photo tracking; it operates on `orders` and `operation_logs`.
- **No resume for interrupted chunked uploads**: If a chunk fails after max retries, the entire upload aborts; no partial-resume mechanism.
- **No batch photo sync**: Photos are uploaded individually per order; no bulk photo sync endpoint.

---

## 7. Master→Customer Photo Delivery

### 7.1 Gallery Generation

| Step | Handler | Details |
|---|---|---|
| **Token creation** | `galleryAuth.ts` (not fully read, but referenced) | JWT `magic-link` with `albumId`, `customerEmail`, expiry |
| **Gallery export** | `backend/routes/gallery.ts` 27–92 | Generates `_preview_wm.webp` for all album photos; caches per-album |
| **Checkout session** | `backend/routes/galleryCheckout.ts` 31–114 | Stripe Checkout Session with `idempotencyKey: checkout-session-${orderId}` |
| **Webhook unlock** | `backend/routes/galleryCheckout.ts` 119–305 | On `checkout.session.completed`, mirrors to `orders` table + sends receipt email |
| **Signed URLs** | Not implemented in Master | Master serves static files directly; no signed URL or expiration mechanism visible. |
| **Expiration** | Not implemented | Gallery tokens have JWT expiry, but no backend cron to purge expired tokens or assets. |

### 7.2 Gaps

- **No signed URLs**: All gallery assets are served via direct `/api/files/...` paths; no time-limited signed URLs.
- **No watermark removal on purchase**: The webhook unlocks “high-resolution” conceptually, but the actual asset served is still the same file path; no dynamic unwatermarked URL generation.
- **No gallery token cleanup**: `gallery_tokens` table grows indefinitely; no retention policy or cron job.

---

## 8. Photo Backup Strategy

### 8.1 Local Backup

| Component | Implementation | Evidence |
|---|---|---|
| **Backup service** | `BackupService.ts` | `streamExport`: zips `master.db` + `uploads/` to `.clickflash-backup` |
| **Restore** | `BackupService.restore()` | Validates manifest version, restores DB + uploads, requires server restart |
| **Retention** | `RETENTION_DAYS = 7` default | `cloudSyncService.ts` 197–201; configurable via `moneytrash_settings` |
| **Rolling pre-restore** | `.pre-restore-${timestamp}` copy kept | `BackupService.ts` 144–149 |

### 8.2 Cloud Backup

| Component | Implementation | Evidence |
|---|---|---|
| **R2 object storage** | Chunked upload to Hub Worker | `cloudSyncService.ts` `uploadFileChunked` |
| **Namespace isolation** | `deskId/albumId/originalName` | Prevents cross-master collision |
| **Retention policy** | `runRetentionBatch()` uploads preview/tiny for retention days | `cloudSyncService.ts` 426–430 |
| **RTO / RPO** | **Not explicitly defined** | No documented Recovery Time Objective or Recovery Point Objective. |

### 8.3 Gaps

- **No automated local backup schedule**: `BackupService` is API-triggered only; no cron or background job.
- **No backup verification**: Restored backups are not checksum-verified after extraction.
- **No off-site backup beyond R2**: Single cloud provider (Cloudflare R2 via Hub); no multi-region replication.
- **No RTO/RPO documented**: Operational targets are undefined.

---

## 9. Gaps & Risks

| # | Gap / Risk | Severity | Evidence | Mitigation Needed |
|---|---|---|---|---|
| 1 | **Orphan file scanner missing** | 🔴 High | `orphanRecovery.ts` not found in repo | Implement scheduled scan reconciling `photos` ↔ filesystem |
| 2 | **No photo deletion audit trail** | 🔴 High | `collections.ts` DELETE route logs generic success only | Log full photo record + file paths before deletion |
| 3 | **No checksum after safeMove fallback** | 🟡 Medium | `photoProcessor.ts` 295–314 uses `copyFile+unlink` without verification | Add SHA-256 verification post-move |
| 4 | **Cloud sync lacks per-photo tracking** | 🟡 Medium | `photos.sync_status` exists but unused by `cloudSyncService` | Populate `sync_status`/`sync_id` during chunked upload |
| 5 | **No signed URLs / expiration** | 🟡 Medium | `files.ts` serves direct paths; gallery uses static watermarks | Implement time-limited signed URLs for purchased assets |
| 6 | **No DLQ reprocessing** | 🟡 Medium | `dead_letter` rows accumulate; only boot hydration resets old failures | Add admin API to retry DLQ + alert on growth |
| 7 | **No automated backup schedule** | 🟡 Medium | `BackupService` is manual/API only | Add nightly cron + alert on failure |
| 8 | **Worker thread crash recovery** | 🟡 Medium | `WorkerPool` may not respawn crashed threads | Add health check + auto-restart for worker pool |
| 9 | **Gallery token retention** | 🟢 Low | `gallery_tokens` grows indefinitely | Add cron to purge expired tokens |
| 10 | **RTO/RPO undefined** | 🟢 Low | No documented targets | Define and document RTO ≤ 4h, RPO ≤ 1h |
| 11 | **Culling delete is permanent** | 🟡 Medium | `culling.ts` 91–98 uses `fs.unlinkSync` + `DELETE`; no soft-delete | Implement soft-delete or trash bin |
| 12 | **No photo-level cloud integrity check** | 🟡 Medium | After upload, no local record of remote ETag | Store remote checksum + verify periodically |

---

## 10. Open Questions

1. **Is `orphanRecovery.ts` planned or was it removed?** The task description references it, but the file does not exist in `apps/master/backend/`. Verify if it lives elsewhere or needs to be created.
2. **What is the actual `RETENTION_DAYS` behavior?** `cloudSyncService` loads from `moneytrash_settings`, but `runRetentionBatch` logic was truncated in the read; confirm whether it deletes local files after cloud upload or only marks status.
3. **Does `photos.sync_status` have any active consumers?** Migration 028 added the column, but `cloudSyncService` appears to ignore it in favor of `operation_logs`. Clarify if this is dead schema.
4. **How is the `watermarkWorker.js` built?** `gallery.ts` references `../workers/watermarkWorker.js`, but only `photoWorker.ts` was visible in source. Confirm build pipeline for worker JS.
5. **What is the `cloudGalleryUrl` upload target?** `uploadRetentionAsset` posts to `cloudGalleryUrl` (`gallery-backend.clickflash-office.workers.dev`), while chunked uploads go to `cloudApiUrl`. Are these the same backend or separate services?
6. **Is there a cron for `gallery_tokens` cleanup?** No evidence in routes or services; confirm if this is handled at the Hub level.
7. **What is the `DbWriteQueue` flush interval?** `collections.ts` 321–343 defers photo/album updates to `dbWriteQueue`, but flush semantics were not fully explored. Confirm durability guarantees.

---

## Appendix: Key File Index

| File | Lines | Role |
|---|---|---|
| `apps/master/backend/server.ts` | 1–883 | Bootstrap, service wiring, route mounting |
| `apps/master/backend/routes/collections.ts` | 1–1469 | Generic CRUD, multipart upload, batch updates, optimistic locking |
| `apps/master/backend/routes/files.ts` | 1–487 | Static file serving, smart resolution, range requests |
| `apps/master/backend/routes/gallery.ts` | 1–166 | Watermarked gallery export |
| `apps/master/backend/routes/galleryCheckout.ts` | 1–349 | Stripe checkout, webhook, receipt email |
| `apps/master/backend/routes/orders.ts` | 1–531 | Order CRUD, fulfillment push, print, asset proxy |
| `apps/master/backend/routes/culling.ts` | 1–112 | AI culling analysis, confirm, delete/archive |
| `apps/master/backend/routes/sync.ts` | 1–56 | HTTP fallback for WebSocket mutations |
| `apps/master/backend/shared/photoProcessor.ts` | 1–573 | Worker pool orchestration, safe move, duplicate check |
| `apps/master/backend/workers/photoWorker.ts` | 1–426 | Sharp-based hash, resize, watermark, edit, corrupt repair |
| `apps/master/backend/services/SyncManager.ts` | 1–402 | WebSocket sync, vector clocks, mutation acks |
| `apps/master/backend/services/cloudSyncService.ts` | 1–2415 | Cloud auth, chunked upload, order sync, retention, BI |
| `apps/master/backend/services/albumService.ts` | 1–397 | Album/photo registration, batch insert, face queue |
| `apps/master/backend/services/FaceIndexingWorker.ts` | 1–269 | Background face detection, descriptor storage |
| `apps/master/backend/services/BackupService.ts` | 1–196 | Zip export/restore of DB + uploads |
| `apps/master/backend/services/emailService.ts` | 1–209 | Hub relay + Resend fallback |
| `apps/master/backend/shared/validateImage.ts` | 1–140 | Magic bytes + sharp header validation |
| `apps/master/backend/middleware/mutationAudit.ts` | 1–66 | Express middleware for mutation logging |
| `apps/master/backend/shared/auditLogger.ts` | 1–127 | JSONL audit log writer with rotation |
| `apps/master/src/services/api/photoService.ts` | 1–439 | Frontend photo CRUD, batch save, blob fetch |
| `apps/master/src/constants/photoConstants.ts` | 1–31 | Edit defaults, categories |
| `apps/master/package.json` | 1–174 | Dependencies: `sharp`, `formidable`, `adm-zip`, `archiver` |

---

*End of Report*
