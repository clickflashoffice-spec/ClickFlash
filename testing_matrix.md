# ClickFlash Testing Matrix & Strategy

> **V5 Quality Gates and Coverage Grid**

## 1. Unit Testing
- **Framework**: Vitest (`vitest.config.ts`) across all packages.
- **Coverage Target**: 85% business logic, 95% utility/math/crdt logic.
- **Rust Core**: Native `cargo test` for hash collisions and vector math.

## 2. Integration Testing
- **Edge Sync**: RxDB CRDT replication multi-peer tests via WebSockets (`SyncManager.test.ts`).
- **Database**: SQLite WAL and hardware DPAPI decryption paths (`db.test.ts`).
- **Cloud Backend**: Hono Request/Response testing with Miniflare/Wrangler.

## 3. End-to-End (E2E) Testing
- **Framework**: Playwright (`playwright.config.ts`) on Desktop & Kiosk.
- **Scenarios**:
  1. Guest Kiosk Selfie Link -> Photo Purchase -> Stripe Checkout.
  2. Mobile Pro Field Upload -> Rust Hash -> Sync to Master Node.
  3. Master Node Offline Mode -> Reconnect -> Cloud Replication.

## 4. Property-based & Chaos Testing
- **Chaos Scenarios**: Disconnect WebSockets mid-transaction, simulated OOM in photo processing.
- **Property Testing**: Arbitrary sync payloads into RxDB CRDT to verify convergence.
