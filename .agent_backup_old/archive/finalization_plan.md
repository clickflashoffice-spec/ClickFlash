# Deep Finalization Plan: "The Last Mile"

> **Status**: APPROVED
> **Target Version**: v5.0 "Star Master Intelligence"
> **Objective**: Complete the "Moneytrash" integration, harden the architecture, and prepare for global deployment.

---

## 📅 Part 1: The "Moneytrash" Integration (Immediate)

**Goal**: Enforce the "Master Authority" rule where the Master App determines what is Sold vs. Unsold.

- [ ] **Data Schema**:
  - [x] Create `fulfillment_queue` table (High-Res Uploads).
  - [x] Create `retention_queue` table (Watermarked Previews).
- [ ] **Logic Core (`OrderValidationService.ts`)**:
  - [x] Implement `splitAssets` (Compare Album Photos vs Order Items).
  - [x] Integrate into `OrderWatcher.ts` (Trigger on 'Paid' import).
  - [x] Integrate into `collections.ts` (Trigger on API Status Update).
- [ ] **Cloud Sync Agent**:
  - [ ] **Fulfillment Worker**: Watch `fulfillment_queue` -> Upload High-Res -> Update Cloud Order.
  - [ ] **Retention Worker**: Watch `retention_queue` -> Upload Preview WM -> Update Cloud Asset.

## 📅 Part 2: Architecture Hardening (Reliability)

**Goal**: Fix the "Deep Dive" gaps to ensure 99.9% reliability in offline/hybrid scenarios.

- [ ] **Idempotent Transaction Bridge**:
  - [ ] Update Touch App to generate UUID v4 for Orders.
  - [ ] Implement Retry Logic on Touch (until 201 Created).
- [ ] **Unified Storage Adapter**:
  - [ ] Refactor `services/*` to use `IStorageAdapter`.
  - [ ] Implement `SQLiteAdapter` (Master) and `PocketBaseAdapter` (Cloud).
- [ ] **Async Indexing**:
  - [ ] Move `face-api` to a Child Process or Worker Thread.

## 📅 Part 3: The "Unified Gallery" (Frontend)

**Goal**: Ensure the Customer Experience matches the "Luxury" promise.

- [ ] **Integration Verification**:
  - [ ] Test `useGallery` Hook with real Cloud API.
  - [ ] Verify Watermark Overlay rendering.
  - [ ] Test Stripe Checkout Mock -> Order Creation.
- [ ] **Manual User Journey**:
  - [ ] Complete full loop: QR Scan -> Mobile View -> Selection -> Buy -> Email Received.

## 📅 Part 4: Release & Deployment

**Goal**: Package the system for "Store #1".

- [ ] **Documentation**:
  - [ ] Update `PRODUCTION_DEPLOYMENT_GUIDE.md` with React-specific steps.
  - [ ] Create "Operator Manual" (PDF/MD).
- [ ] **Build Pipeline**:
  - [ ] Verify `electron-builder` config for Windows (NSIS).
  - [ ] Verify `next build` for Unified Gallery (Vercel/Netlify).

---

## 📝 "The Loop" Verification

Before marking any task complete:

1. **Separation**: Did I mix Master/Touch logic?
2. **Local**: Is heavy index done on Master?
3. **Offline**: Does it break if I pull the ethernet?
4. **License**: Are we strictly verifying High-Res ownership?

---

**Next Step**: Complete Part 1 (Cloud Sync Agent Workers).
