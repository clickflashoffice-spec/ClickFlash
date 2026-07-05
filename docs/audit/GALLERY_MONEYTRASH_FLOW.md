# Gallery & MoneyTrash Photo Flow Audit

**Date:** 2026-06-12
**Auditor:** AI Code Assistant
**Scope:** `apps/gallery` (Frontend + Cloudflare Worker Backend) and `apps/moneytrash` (Tauri Desktop Uploader)

---

## 1. Gallery Customer Journey

### 1.1 Public Endpoints (No Auth Required)
The Gallery backend (`apps/gallery/backend/src/server.ts`) exposes several public endpoints for the customer-facing purchase flow:

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/api/health` | GET | Health check | None |
| `/api/checkout` | POST | Stripe Checkout session creation | 10/min per IP (D1-backed) |
| `/api/webhook` | POST | Stripe webhook handler | None (signature verified) |
| `/api/cart/snapshot` | POST | Abandoned cart persistence | 30/min per IP |
| `/api/cart/recovered` | POST | Mark cart recovered | None |
| `/api/pricing` | GET | Dynamic pricing resolution | None |
| `/api/moneytrash/gallery/:accessCode` | GET | Archived photos for customer | None |
| `/api/website/portfolio` | GET | Public portfolio | None |
| `/api/website/access-code` | POST | Access code validation | None |
| `/api/website/contact` | POST | Contact form | 5 per 10 min per IP |
| `/api/website/bookings` | POST | Booking requests | 3 per 10 min per IP |

### 1.2 Customer Purchase Flow
1. **Browse Gallery** — Customer accesses photos via access code (`/api/website/access-code`).
2. **Add to Cart** — Frontend cart state managed by `useCartStore.ts`.
3. **Checkout** — Frontend calls `/api/checkout` with `items`, `customerEmail`, `albumId`, and `currency`.
4. **Stripe Session** — Backend validates prices server-side from D1 `products` table or album-level pricing, then creates a Stripe Checkout Session.
5. **Payment** — Customer pays on Stripe-hosted page.
6. **Webhook** — `checkout.session.completed` triggers order creation in D1 (`orders` table).
7. **Download** — Customer navigates to `DownloadPage.tsx` which offers individual photo downloads or a bulk ZIP.

**Citations:**
- `apps/gallery/backend/src/server.ts` lines 115-289 (checkout flow)
- `apps/gallery/backend/src/server.ts` lines 292-349 (webhook handler)
- `apps/gallery/src/components/customer/CheckoutScreen.tsx` lines 38-59 (order placement)
- `apps/gallery/src/components/customer/DownloadPage.tsx` lines 15-65 (download UX)

---

## 2. Gallery Storage Topology

### 2.1 R2 Bucket Configuration
From `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "GALLERY_BUCKET"
bucket_name = "clickflash-gallery-assets"
```

**Bucket name:** `clickflash-gallery-assets`
**Binding:** `GALLERY_BUCKET`
**Region:** Not explicitly configured in wrangler.toml (uses Cloudflare default edge locations).

### 2.2 Lifecycle Policies
There is **no R2 lifecycle policy** defined in the codebase. The "delete after X" mechanism for MoneyTrash is implemented at the **application layer** via D1 triggers and scheduled jobs, not via R2 lifecycle rules.

**Citations:**
- `apps/gallery/backend/wrangler.toml` lines 26-28
- `apps/gallery/backend/legacy/migrations/050_moneytrash_support.sql` lines 117-125 (D1 trigger for marking expired)

### 2.3 Photo Storage Paths
From `photoProcessor.ts`:
- Storage key format: `{albumId}/{photoId}.{ext}`
- High-res access path: `{albumId}/highres/{photoId}.jpg`
- Thumbnail/preview path: `{albumId}/thumbs/{photoId}_preview_wm.webp`

**Citations:**
- `apps/gallery/backend/src/photoProcessor.ts` lines 32-35
- `apps/gallery/backend/src/server.ts` lines 891-949 (high-res access control)

---

## 3. Gallery Stripe Integration

### 3.1 Checkout Session Creation
- **Endpoint:** `POST /api/checkout`
- **Server-side price validation:** Yes. The backend queries D1 `products` table and album-level pricing (`price_single`, `price_full`) to build verified line items. Client-submitted prices are **never trusted**.
- **Currency support:** `eur`, `usd`, `gbp`, `tnd` (default: `eur`)
- **Success URL:** `https://gallery.clickflash.com/success?session_id={CHECKOUT_SESSION_ID}`
- **Cancel URL:** `https://gallery.clickflash.com/cancel`

### 3.2 Webhook Handler (`/api/webhook`)
- **Signature verification:** Yes, using `stripe.webhooks.constructEventAsync(body, sigHeader, env.STRIPE_WEBHOOK_SECRET)`.
- **Idempotency:** **NOT implemented.** The webhook handler does not check `event_id` against a processed-events table before acting. It blindly inserts an order on every `checkout.session.completed` event.
- **Order creation:** Inserts into `orders` table with `status='paid'`, `stripe_session_id`, `albumId`, `totalAmount`.
- **Email:** **No post-webhook email is sent.** The webhook only creates the D1 order record.

### 3.3 Refund / Chargeback Flow
- **Schema support:** The `orders` table has `refund_status`, `refund_amount`, `refunded_at` columns (migration `008_add_payments_and_webhooks.sql`).
- **Implementation:** There is **no active refund or chargeback handler** in the current `server.ts`. The legacy `stripeService.js` had a `refunds.create()` method, but the current Cloudflare Worker backend does not expose a refund endpoint.
- **Webhook types tracked:** `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `checkout.session.completed`, etc. (defined in `payment.ts` schema) — but the actual handler only processes `checkout.session.completed`.

**Citations:**
- `apps/gallery/backend/src/server.ts` lines 115-289 (checkout)
- `apps/gallery/backend/src/server.ts` lines 292-349 (webhook)
- `apps/gallery/backend/legacy/migrations/008_add_payments_and_webhooks.sql` lines 54-61
- `apps/gallery/src/schemas/payment.ts` lines 220-296

---

## 4. Gallery Download Delivery

### 4.1 Signed URL Pattern
The R2 Signed URL Service (`r2SignedUrlService.ts`) implements **HMAC-SHA256 signed URLs**:
- **URL format:** `/{SIGNED_URL_VERSION}/{storageKey}?e={expires}&s={signature}`
- **Signature:** `HMAC-SHA256(secret, path + ":" + expires)`
- **Default TTL:** 1 hour (`3600` seconds)
- **Max TTL:** 7 days (`604800` seconds)
- **Single-use:** **No.** The URL is time-bound but not single-use. No IP binding.
- **Validation:** Constant-time string comparison to prevent timing attacks.

### 4.2 High-Res Access Control
When a request hits `/api/files/{albumId}/highres/{photoId}.jpg`:
1. Backend checks D1 for purchase status:
   - `moneytrash_purchases` table (`photo_id = ?`)
   - `orders` table with `json_each(orders.items)` where `status = 'completed' OR 'paid'`
2. If **not purchased** → returns `402 Payment Required` or falls back to a watermarked preview (`_preview_wm.webp`).
3. If **purchased** → serves the R2 object directly with `Cache-Control: public, max-age=31536000, immutable`.

### 4.3 Download Experience (Frontend)
- **Individual download:** Direct `<a href={photo.url} download>` click.
- **Bulk download:** `DownloadPage.tsx` calls `/api/download/bulk-zip/{orderId}` for a ZIP file.
- **Watermark:** Watermarked previews are served at `.../thumbs/..._preview_wm.webp` when high-res is unauthorized.
- **Sizes offered:** "Web Optimized" (preview) and "High-Resolution".

**Citations:**
- `apps/gallery/backend/src/services/r2SignedUrlService.ts` lines 1-163
- `apps/gallery/backend/src/server.ts` lines 890-974 (file serving logic)
- `apps/gallery/src/components/customer/DownloadPage.tsx` lines 15-65

---

## 5. Gallery MFA & Security

### 5.1 Customer MFA
**There is no MFA for customers.** The customer journey is entirely public (no account creation, no login). Access is gated by:
- Access codes (`/api/website/access-code`)
- Room numbers (in kiosk/touch flow)
- Stripe payment completion

### 5.2 Admin/Photographer Auth
- **Login:** `POST /api/auth/login` with email + password.
- **Password hashing:** `bcrypt` with 12 salt rounds (`auth.ts`).
- **Rate limiting:** D1-backed login rate limiter:
  - Per-email: 5 failed attempts within 15 minutes → 429 for 15 minutes
  - Per-IP: 20 failed attempts within 15 minutes → 429 for 15 minutes
- **JWT:** HS256, 24-hour expiry (`jwt.ts`).
- **Tenant isolation:** `tenantIsolation.ts` enforces `destinationId` scoping on all protected routes.

### 5.3 Geo-Restriction
From `server.ts` lines 77-96 and `wrangler.toml`:
- **Enabled when:** `GEO_RESTRICTED="true"` AND `ALLOWED_COUNTRIES` is set.
- **Mechanism:** Reads `request.cf.country` (Cloudflare auto-populated field).
- **Allowed countries:** `MA,TN,FR,US` (Morocco, Tunisia, France, United States).
- **Bypass:** `/api/health` is exempt for uptime monitors.
- **Fail mode:** Returns `403` with `"Service not available in your region."`

### 5.4 CORS & Security Headers
- **CORS:** Exact-match origin validation (no wildcards). Falls back to empty string (fail-closed).
- **Security headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `HSTS`, `Permissions-Policy`, `CSP`.

### 5.5 File Size / Upload Limits
- **Upload endpoint:** `/api/cloud/upload-photo` (multipart/form-data)
- **Max file size:** Not explicitly enforced in the current Worker backend. The `photoProcessor.ts` accepts any `ArrayBuffer`.
- **Legacy limits:** The MoneyTrash uploader enforces 50MB per file (`MAX_FILE_SIZE = 50 * 1024 * 1024`) and 500MB max for chunked uploads.
- **Gallery frontend dropzone:** `maxSize: 50 * 1024 * 1024` (50MB).

**Citations:**
- `apps/gallery/backend/src/server.ts` lines 77-96 (geo-restriction)
- `apps/gallery/backend/src/loginRateLimiter.ts` lines 13-15
- `apps/gallery/backend/src/auth.ts` lines 3-47
- `apps/gallery/backend/src/jwt.ts` lines 14-23
- `apps/gallery/backend/wrangler.toml` lines 36-37
- `apps/moneytrash/src/app/api/upload/chunk/route.ts` line 54
- `apps/moneytrash/src/components/Uploader.tsx` line 186

---

## 6. MoneyTrash Mechanism

### 6.1 "Delete After X" Architecture
MoneyTrash is a **two-tier system**:

1. **Master App (Automatic Retention):** Unsold photos from finalized albums are automatically archived after a retention period.
2. **MoneyTrash Uploader (Manual Gateway):** A Tauri desktop app that allows photographers to upload batches of photos marked as `"moneytrash"` or `"sold"`.

### 6.2 Database Schema
From `050_moneytrash_support.sql`:
- **`archived_photos`** table: Stores archived photos with `expires_at`, `status` (`available` | `purchased` | `expired`), `discount_percentage` (default 50%), `price`.
- **`moneytrash_purchases`** table: Logs purchases from trash with `download_count`, `last_download_at`.
- **`moneytrash_sync_queue`** table: Sync queue for integration with the Master app.
- **Default retention:** 30 days (`retentionDays: 30` in `gallery_settings` JSON).
- **Auto-delete expired:** `autoDeleteExpired: true` in config.

### 6.3 Expiration Trigger
A D1 trigger (`trg_mark_expired_photos`) runs `AFTER INSERT` on `archived_photos` to mark any photo where `expires_at < datetime('now')` as `expired`. However, there is **no automatic R2 deletion** trigger — the status changes to `expired` in D1, but the actual R2 object may persist until manually cleaned.

### 6.4 MoneyTrash Uploader (Tauri App)
- **Modes:**
  - `moneytrash`: Photos are uploaded as archived/unsold with a discount.
  - `sold`: Photos are uploaded as backup/sold gallery.
- **Chunked upload:** 5MB chunks via Tauri Rust commands (`upload_file_chunk`, `finalize_upload`).
- **Resumable:** Upload sessions are persisted to IndexedDB and localStorage. Interrupted uploads resume on app restart.
- **Offline queue:** `uploadQueue.ts` manages pending uploads with automatic retry (exponential backoff, base 5s).
- **Bandwidth scheduler:** `bandwidthScheduler.ts` adjusts upload speed based on time-of-day (business hours = 512 KB/s, night = 10 MB/s) and network latency.

### 6.5 What MoneyTrash Actually Deletes
- **D1 record:** Status changes to `expired`.
- **R2 object:** **NOT automatically deleted** by the current codebase. The `autoDeleteExpired: true` flag exists in `gallery_settings` but no background worker or cron job actually performs R2 deletion.
- **Local files:** The Tauri app cleans up temp chunk files after finalization.
- **Thumbnails:** Same as originals — no explicit deletion logic found.

**Citations:**
- `apps/gallery/backend/legacy/migrations/050_moneytrash_support.sql` lines 1-126
- `apps/moneytrash/src/services/resumableUploadService.ts` lines 1-510
- `apps/moneytrash/src/services/uploadQueue.ts` lines 1-671
- `apps/moneytrash/src/services/bandwidthScheduler.ts` lines 1-375
- `apps/moneytrash/src/App.tsx` lines 45-63 (mode switching)

---

## 7. MoneyTrash Security

### 7.1 File System Security (Tauri Rust Backend)
From `ARCHITECTURE.md` and `tauri.conf.json`:
- **Path traversal prevention:** `..` and `~` blocked in file selection commands.
- **File size limits:** 500MB max per file.
- **Extension validation:** Whitelist for images (JPEG, PNG, HEIC, WebP, RAW).
- **No execution:** Uploaded files are never executed.

### 7.2 Upload Security
- **Chunk integrity:** Each chunk is written to a temp directory (`uploads/temp/{sessionId}/chunk-{index}`). Finalization reassembles via streams.
- **Session expiry:** Upload sessions auto-clean after 24 hours (`setTimeout(() => cleanupSession(sessionId), 24 * 60 * 60 * 1000)`).
- **Sanitization:** Access codes are sanitized (`[^a-zA-Z0-9-_]` replaced). Filenames are sanitized (`[^a-zA-Z0-9.-]` replaced with `_`).
- **No auth on upload endpoint:** The chunked upload API (`/api/upload/chunk`) does **not** require authentication. It relies on session IDs for isolation.

### 7.3 Cloud API Security
- `cloudApiService.ts` uses `Bearer` token auth after office verification (`/api/office/verify`).
- `X-Desk-Id` header is sent with all requests.
- **No HTTPS enforcement check** in the frontend code (relies on browser/Tauri defaults).

### 7.4 S3 Storage (Optional)
- `s3StorageService.ts` supports AWS S3 and compatible services (MinIO, DigitalOcean Spaces).
- Signed URLs for S3 are generated with 24-hour expiry (`expiresIn: 86400`).
- **No server-side encryption** configuration visible in the code.

**Citations:**
- `apps/moneytrash/ARCHITECTURE.md` lines 404-418
- `apps/moneytrash/src/app/api/upload/chunk/route.ts` lines 54, 92
- `apps/moneytrash/src/app/api/upload/route.ts` lines 43, 90
- `apps/moneytrash/src/services/s3StorageService.ts` lines 1-401

---

## 8. Gaps & Risks

| # | Risk | Severity | Evidence |
|---|------|----------|----------|
| 1 | **Webhook idempotency missing** | **High** | `server.ts` lines 323-337: No `event_id` deduplication before order insertion. Duplicate webhooks = duplicate orders. |
| 2 | **No R2 lifecycle / auto-deletion** | **High** | `050_moneytrash_support.sql` marks `expired` in D1, but no code deletes the actual R2 object. Storage costs grow indefinitely. |
| 3 | **No refund/chargeback handler** | **Medium** | `payment.ts` defines `charge.refunded` and `charge.dispute.created` webhook types, but `server.ts` only handles `checkout.session.completed`. |
| 4 | **Upload endpoint unauthenticated** | **Medium** | `/api/upload/chunk` and `/api/cloud/upload-photo` have no auth check. Anyone with a session ID can upload. |
| 5 | **No MFA for admin/photographers** | **Medium** | Login is email+password only. No TOTP or WebAuthn. |
| 6 | **Cart expiration not enforced** | **Low** | `abandoned_carts` table tracks `updated_at`, but there is no cron or cleanup job to purge old carts. Recovery emails run hourly. |
| 7 | **Geo-restriction bypass risk** | **Low** | `request.cf.country` can be absent or spoofed in some edge cases. No secondary IP-based geolocation. |
| 8 | **Signed URLs not single-use** | **Low** | `r2SignedUrlService.ts` URLs are time-bound but can be shared/used multiple times within the TTL window. |
| 9 | **No email on payment success** | **Low** | Webhook creates the order but does not send a confirmation email to the customer. Resend API key exists but is only used for bookings/contact. |
| 10 | **MoneyTrash uploader lacks auth on local API** | **Low** | The local Next.js API routes (`/api/upload`) accept uploads without verifying a desk token. |

---

## 9. Open Questions

1. **R2 Deletion Policy:** Is there an external cron or worker (not in this repo) that deletes `expired` archived photos from R2? If not, storage costs will grow unbounded.
2. **Webhook Replay Protection:** Should `stripe_webhook_events` table be used to deduplicate `event_id`? The schema exists but is unused in the current handler.
3. **Customer Accounts:** Are there plans to add customer accounts (with MFA) instead of access-code-only gating?
4. **Refund API:** Is the refund endpoint intentionally omitted from the Cloudflare Worker, or should it be ported from the legacy `stripeService.js`?
5. **ZIP Generation:** The frontend references `/api/download/bulk-zip/{orderId}`, but this endpoint is **not implemented** in the current `server.ts`. Where does ZIP assembly happen?
6. **MoneyTrash Originals:** When a photo is "deleted" after expiration, are the original high-res files, thumbnails, and watermarked previews all removed, or only the D1 record is updated?
7. **S3 vs R2:** MoneyTrash has an `s3StorageService.ts` but the Gallery backend uses R2. Are these two separate storage backends, or is S3 a fallback?
8. **Encryption at Rest:** Are R2 objects encrypted at rest? No SSE configuration is visible in the code.

---

*End of Audit Report*
