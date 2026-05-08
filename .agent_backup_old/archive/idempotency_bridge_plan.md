# Idempotent Transaction Bridge (Ghost Order Fix)

## Goal

Eliminate "Ghost Orders" (orders that are partially synced, duplicated, or lost) by enforcing strict clinical handover between Touch-App and Master-App using UUIDs and atomic file operations.

## User Review Required
>
> [!IMPORTANT]
> This change introduces a strict "Atomic Swap" pattern for the shared Ethernet bridge. Master-App will now ignore `.tmp` files in the orders folder until they are renamed to `.json`.

## Proposed Changes

### [Touch-App] Order Export Reliability

Improve the `orderExport.ts` logic to ensure that file-based handover is atomic and HTTP synchronization is properly tracked.

#### [MODIFY] [orderExport.ts](file:///e:/ClickFlash/touch-app/react/backend/routes/orderExport.ts)

- Implement **Atomic Handover**: Write the order JSON to a `.tmp` file in the Master's shared folder first, then use `fs.renameSync` to change it to `.json`.
- Ensure `orderId` is ALWAYS treated as the primary idempotency key.

### [Master-App] Idempotent Watcher

Refine how the Master App consumes incoming orders to prevent processing partial or duplicate files.

#### [MODIFY] [OrderWatcher.ts](file:///e:/ClickFlash/master-app/react-new/backend/services/orderWatcher.ts)

- **Filter `.tmp` files**: Explicitly ignore any files ending in `.tmp` during directory scanning.
- **Improved Duplicate Check**: Log clearly when a duplicate UUID is ignored to assist in debugging sync issues.
- **Status Reinforcement**: Ensure that `OrderValidationService` is ONLY triggered after successful insertion to prevent "Phantom Validations".

### [Shared] Database Schema

Verify and enforce that `orders.id` is a UUID v4.

## Verification Plan

### Automated Tests

- **Simulated Network Interruption**: Manually kill the server mid-write and verify that no partial `.json` file exists on the Master side.
- **Duplicate Injection**: Manually place two identical UUID `.json` files in the shared folder and verify that Master only imports one and renames both to `.processed`.

### Manual Verification

- Perform a test checkout on Touch-App and monitor the shared folder to see the `.tmp` -> `.json` transition.
- Verify on Master Dashboard that the order appears exactly once.
