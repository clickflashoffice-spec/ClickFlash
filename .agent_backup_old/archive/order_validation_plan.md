# Implementation Plan - Order Validation Service (Backend)

# Goal

Implement the `OrderValidationService` in the Master App (Node.js) to handle the "Split Logic" when an order is verified. This ensures that Sold photos are queued for fulfillment and Unsold photos are queued for the "Moneytrash" retention batch.

## User Review Required
>
> [!NOTE]
> This service acts as the **bridge** between the Local POS (Touch App) and the Cloud Sync. It is triggered when an order status changes to `Verified` (Paid/Confirmed).

## Proposed Changes

### [Backend] Master App (Node.js)

#### [NEW] [backend/shared/migrations/001_add_queues.sql](file:///e:/ClickFlash/master-app/react-new/backend/shared/migrations/001_add_queues.sql)

- **Table**: `fulfillment_queue`
  - Columns: `id` (INTEGER PK), `order_id` (TEXT), `asset_id` (TEXT), `status` (TEXT: 'pending', 'processing', 'completed', 'failed'), `created_at` (DATETIME)
- **Table**: `retention_queue`
  - Columns: `id` (INTEGER PK), `album_id` (TEXT), `asset_id` (TEXT), `status` (TEXT: 'pending', 'processing', 'completed', 'failed'), `created_at` (DATETIME)

#### [NEW] [src/services/OrderValidationService.ts](file:///e:/ClickFlash/master-app/react-new/src/services/OrderValidationService.ts)

- **Functions**:
  - `validateOrder(orderId: string)`: Main entry point.
  - `splitAssets(orderId: string)`:
      1. Query `photos` table where `albumId` matches Order's Album.
      2. Get `Order.items` (Selected IDs).
      3. Identify `Unselected` = All Photos - Selected Photos.
      4. Result: `moneytrash_ids` (Unselected) vs `sold_ids` (Selected).
  - `queueFulfillment(assetIds: string[])`: Inserts into `fulfillment_queue`.
  - `queueRetention(assetIds: string[])`: Inserts into `retention_queue`.

#### [MODIFY] [src/services/OrderService.ts](file:///e:/ClickFlash/master-app/react-new/src/services/OrderService.ts)

- Integrate `OrderValidationService.validateOrder()` into the `updateStatus` workflow.

## Verification Plan

### Automated Tests

- Create a unit test mock for `splitAssets` ensuring arrays are correctly separated.

### Manual Verification

1. Create a dummy order in SQLite.
2. Manually trigger `validateOrder`.
3. Check `fulfillment_queue` table for sold assets.
4. Check `retention_queue` table for unsold assets.
