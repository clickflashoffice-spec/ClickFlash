# ClickFlash Ecosystem — Final Integration & QA Gauntlet Plan

We are now transitioning into the final phases of the ClickFlash ecosystem roadmap. Having completed the mobile applications and the master registration flow, we will now finalize the remaining features across the monorepo and run the 9-layer Production QA Gauntlet.

## User Review Required

> [!WARNING]
> This is a massive sweep across multiple applications. To maintain stability, we will execute this in **two major phases**: Feature Finalization, then QA Gauntlet. Please confirm if you agree with the scope and sequence.

## Proposed Changes

### Phase 1: Feature Finalization

#### 1. `apps/touch` (Customer Kiosk)
- **Feature**: Offline Authentication
- **Changes**: Add an RFID/Wristband tap listener and a facial recognition login stub that interfaces with the offline SQLite database synced from the master.

#### 2. `apps/management` (Cloud Hub)
- **Feature**: Command Palette & Fleet Monitor
- **Changes**: Implement a `Cmd+K` global command palette for quick navigation and a Fleet Monitor dashboard component that pings the registered Master nodes (from our previous Worker implementation) to show Online/Offline status.

#### 3. `apps/gallery` (Client Portal)
- **Feature**: Stripe Checkout & Magic Links
- **Changes**: We already have the Magic Link auto-login logic in `App.tsx`. We will implement the custom Stripe Elements checkout flow for purchasing digital packages.

#### 4. `apps/moneytrash` (RAW Ingestor)
- **Feature**: SD Card Ingestion UI
- **Changes**: The Tauri backend (`src-tauri`) is already fully implemented with chunked upload and checksum capabilities. We will finalize the Next.js frontend to hook into these Tauri commands and display granular progress bars for the ingestion pipeline.

---

### Phase 2: The 9-Layer QA Gauntlet

Once the final features are implemented, we will run the ecosystem through the QA Gauntlet.

1. **Unit & API Validation**: Run `pnpm test:all` to ensure `packages/validation` and `apps/touch` maintain 100% coverage.
2. **Web E2E**: Execute Playwright tests against `apps/management` and `apps/gallery`.
3. **Desktop E2E**: Verify Electron IPC channels in `apps/master` and `apps/touch`.
4. **Cross-App Sync Gauntlet**: Test LAN WebSocket order propagation from Master to Touch.
5. **Load & Stress**: Simulate offline SQLite transaction batching.
6. **Security Check**: Verify zero third-party SaaS leaks and Ed25519 tamper-proofing.
7. **Visual Regression**: Confirm responsive Tailwind dark mode across viewports.
8. **Accessibility**: Audit ARIA labels and contrast ratios.
9. **Chaos & Recovery**: Test SQLite transaction rollbacks upon simulated network loss.

## Verification Plan

### Automated Tests
- `npm run test:all` in the root monorepo.
- `npx playwright test` in respective web apps.

### Manual Verification
- Deploying the `moneytrash` app to ingest a mock SD card folder.
- Simulating an RFID tap in the `touch` kiosk.
- Viewing a mock master node go offline in the `management` Fleet Monitor.
