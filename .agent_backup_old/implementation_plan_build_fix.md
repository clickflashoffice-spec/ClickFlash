# Implementation Plan - Management Portal Build Fixes

This plan outlines the fixes required to resolve production build errors in the Management Portal, specifically addressing Node.js-specific module dependencies and inconsistent library exports.

## User Review Required

> [!IMPORTANT]
> **Custom EventEmitter**: The Node.js `events` module is not available in the browser. I have implemented a custom `EventEmitter` utility that mimics the core functionality to ensure compatibility.

> [!NOTE]
> **react-window Imports**: Standardized imports to use an ESM-safe pattern to avoid "module is not a function" errors during Rollup bundling.

## Proposed Changes

### 1. Utilities

#### [NEW] [EventEmitter.ts](file:///e:/ClickFlash/apps/management/src/utils/EventEmitter.ts)

- Created a custom event emitter class for browser environments.

---

### 2. Services (EventEmitter & Type Fixes)

#### [MODIFY] [orchestrationService.ts](file:///e:/ClickFlash/apps/management/src/services/orchestrationService.ts)

#### [MODIFY] [alertingService.ts](file:///e:/ClickFlash/apps/management/src/services/alertingService.ts)

#### [MODIFY] [marketingAutomationService.ts](file:///e:/ClickFlash/apps/management/src/services/marketingAutomationService.ts)

#### [MODIFY] [referralTrackingService.ts](file:///e:/ClickFlash/apps/management/src/services/referralTrackingService.ts)

#### [MODIFY] [moneyTrashSync.ts](file:///e:/ClickFlash/apps/management/src/services/moneyTrashSync.ts)

#### [MODIFY] [moneyTrashEmailMarketing.ts](file:///e:/ClickFlash/apps/management/src/services/moneyTrashEmailMarketing.ts)

- Replaced Node.js `EventEmitter` with custom utility.
- Replaced `NodeJS.Timeout` with `any` for browser compatibility.

---

### 3. UI Components (Standardization)

#### [MODIFY] [Photographers.tsx](file:///e:/ClickFlash/apps/management/src/components/Photographers.tsx)

#### [MODIFY] [Orders.tsx](file:///e:/ClickFlash/apps/management/src/components/Orders.tsx)

#### [MODIFY] [Clients.tsx](file:///e:/ClickFlash/apps/management/src/components/Clients.tsx)

#### [MODIFY] [VirtualList.tsx](file:///e:/ClickFlash/apps/management/src/components/common/VirtualList.tsx)

#### [MODIFY] [VirtualGrid.tsx](file:///e:/ClickFlash/apps/management/src/components/common/VirtualGrid.tsx)

- Standardized `react-window` imports.
- Fixed destructuring syntax in `VirtualGrid.tsx`.

## Verification Plan

### Automated Tests

- **Build Check**: Run `npm run build` in `apps/management` to ensure all Rollup errors are resolved.

### Manual Verification

- **Runtime Check**: Verify services initialize correctly in the browser without "Node module not found" or "TypeError" errors.
