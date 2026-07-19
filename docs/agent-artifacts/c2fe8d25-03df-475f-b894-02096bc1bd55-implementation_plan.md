# Finalize ClickFlash Ecosystem — Implementation Plan

Based on the full ecosystem audit, here are the concrete gaps and proposed changes.

## Key Findings

- **9 TODO comments** across the codebase
- **Billing/Subscription, Referrals, White-Label**: Completely absent from management backend
- **4 MLWorker stubs** in master-cpp (auto-culling, face detection, model training, similarity search)
- **5 header-only controllers** in master-cpp with no .cpp implementations
- **3 personalization TODOs** in master app

---

## Track 1: Monetization & Growth (Management Backend)

### [NEW] Schema additions to `apps/management/backend/schema.sql`
- Add `billing_tier`, `usage_limits`, `billing_period_start/end` columns to `desks` table
- Add `referral_code`, `referred_by`, `referral_credits` columns to `desks` table
- Add `white_label_config` column to `desks` table
- Create `billing_events` table (studio usage tracking)
- Create `billing_invoices` table (invoice generation)
- Create `referral_events` table (referral tracking)

### [NEW] `apps/management/backend/services/billingService.ts`
- Pricing tier definitions (Free / Pro / Enterprise)
- Usage limit checking, usage recording, invoice generation
- Overage calculation

### [NEW] `apps/management/backend/services/referralService.ts`
- Referral code generation, signup tracking, commission calculation

### [NEW] `apps/management/backend/services/whiteLabelService.ts`
- White-label config CRUD, branding application

### [NEW] `apps/management/backend/routes/billing.ts`
- `GET /api/billing/tier` — current tier + limits
- `GET /api/billing/usage` — usage report
- `GET /api/billing/invoices` — invoice history
- `POST /api/billing/upgrade` — tier upgrade

### [NEW] `apps/management/backend/routes/referrals.ts`
- `GET /api/referrals/stats` — referral dashboard data
- `POST /api/referrals/track-signup` — track referral signup
- `GET /api/referrals/code` — get/generate referral code

### [NEW] `apps/management/backend/routes/whitelabel.ts`
- `GET /api/whitelabel/config` — get white-label config
- `PUT /api/whitelabel/config` — update config

### [MODIFY] `apps/management/backend/server.ts`
- Wire up new billing, referral, and white-label route modules

---

## Track 2: ML Services Integration (master-cpp)

### [MODIFY] `apps/master-cpp/src/http/CullingController.cpp`
- L188: Implement `autoCull()` using MLWorker's `analyzePhotoQuality()` + `autoCullAlbum()`

### [MODIFY] `apps/master-cpp/src/http/FacesController.cpp`
- L35: Implement `detectFaces()` using FaceWorker
- L139: Implement `trainModel()` trigger via MLWorker
- L158: Implement `getSimilar()` using VectorIndexService

### [MODIFY] `apps/master-cpp/src/workers/MLWorker.cpp`
- Implement `trainModel()` (currently empty placeholder)

### [NEW] .cpp implementations for 5 header-only controllers
- `AnalyticsController.cpp`
- `CloudController.cpp`
- `LedgerController.cpp`
- `MarketingController.cpp`
- `SessionTypesController.cpp`

---

## Track 3: Ecosystem Polish

### [MODIFY] `apps/master/src/services/personalizationService.ts`
- L96: Implement ML-based send-time optimization
- L140: Implement engagement event database update
- L156: Implement collaborative filtering algorithm

### [MODIFY] `apps/management/src/constants.ts`
- L90: Remove legacy views and the legacy map

### [MODIFY] `apps/website/src/components/ErrorBoundary.tsx`
- L58: Integrate Sentry error tracking

---

## Verification Plan

### Automated Tests
- `npm run lint:all` — 0 errors
- `npm run typecheck:all` — 0 errors
- `npm run test:all` — all tests pass

### Manual Verification
- Inspect new billing/referral/white-label routes respond correctly
- Verify master-cpp controllers compile and respond to API calls
