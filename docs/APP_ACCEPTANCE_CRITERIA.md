# ClickFlash v2.0 Application Acceptance Criteria

This document outlines the strict acceptance criteria and dependencies for each workstream in the ClickFlash ecosystem.

## 1. Master (`apps/master`)
- **Dependencies:** `@clickflash/types`, `@clickflash/validation`, `@clickflash/logger`
- **Acceptance Criteria:**
  - Must run offline without degradation (Zero-Paid SaaS compliance).
  - Event Ledger (`PhotographerEventLedgerService`) must be append-only and block conflicting hashes.
  - WebSocket sync server must correctly broadcast events to paired Touch instances.
  - Automatic Editor must process incoming JPEGs non-destructively and apply D7000 calibration.

## 2. Touch Kiosk (`apps/touch`)
- **Dependencies:** Master (via WebSocket LAN Sync), `@clickflash/ui`
- **Acceptance Criteria:**
  - Must enforce strict Kiosk policy (blocking Alt+Tab, Esc, etc.).
  - Must function fully offline using synced data from Master.
  - RFID authentication must grant session access reliably.

## 3. Mobile Photographer (`apps/mobile-photographer`)
- **Dependencies:** Master (via authenticated sync), Android PTP module
- **Acceptance Criteria:**
  - Must detect and ingest photos from Nikon D7000 via USB PTP reliably.
  - Quick Edit pipeline must run on-device and append events to local OfflineQueue.
  - Sync queue must flush reliably to Master when connected.

## 4. Cloud Backend (`apps/cloud-backend`)
- **Dependencies:** Stripe API, Cloudflare D1/R2
- **Acceptance Criteria:**
  - Stripe Webhooks must be verified using Stripe signatures.
  - Must provide zero-SaaS Magic Link authentication for Gallery users.
  - Must securely issue temporary R2 download links for purchased photos.

## 5. Gallery (`apps/gallery`)
- **Dependencies:** Cloud Backend, `@clickflash/ui`
- **Acceptance Criteria:**
  - Must fetch products and create Stripe checkout sessions securely.
  - Must support abandoned cart recovery via snapshot restoration.
  - No local state (IndexedDB) for core e-commerce or security operations.

## 6. Management (`apps/management`)
- **Dependencies:** Cloud Backend, `@clickflash/ui`
- **Acceptance Criteria:**
  - Dashboard must fetch D1 projection models for reports.
  - Fleet monitor must correctly display the heartbeat status of Studio Masters.

---
*Generated during Phase 1 Execution Ledger automated reconciliation.*
