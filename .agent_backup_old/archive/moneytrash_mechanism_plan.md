# Moneytrash Mechanism Plan: "Resort Retention Model"

This document details the implementation of the Retention Marketing System for ClickFlash Resorts.

## 1. Business Context

* **Operations**: Photographers capture photos daily at Resorts, Waterparks, and Attractions.
* **Infrastructure**: Each location has a local **Master App** (Desktop) acting as the server.
* **Product Standard**: **High Resolution Only**. We strictly deliver original, print-quality files to paid customers. We NEVER sell low-res downloads.
* **The "Moneytrash" Concept**: Unsold photos are not "trash"—they are "pending opportunities." They are watermarked low-res previews used exclusively for marketing.

## 2. The Workflow (Lifecycle)

### Phase 1: Local Capture (Day 0-7)

* **Architecture**: Distributed Network (100+ Desk Masters globally).
* **Action**: Photographers import photos to the Master App.
* **Storage**: Photos reside LOCALLY on the Master App hard drive.
* **Sales**: Guests view and buy at local Kiosks/TVs.

### Phase 2: Retention Batch (Immediate / End of Stay)

* **Trigger**: "Album Finalized" or "Desk Session Ended".
* **Logic**: The Sync Agent identifies all photos that are:
    1. Status = `Unsold`
    2. Sync Status = `Pending`
* **Action**:
    1. Generates `_moneytrash.webp` (1200px, Watermarked).
    2. Uploads these previews to the **Cloud Server**.
    3. Tags with `DESK_ID` to maintain unique origin.
    4. Links them to the Customer Email (captured locally).

### Phase 3: The "Second Chance" Campaign

* **Action**: The Cloud Server detects the new batch.
* **Marketing**: Emails the customer: *"We found your photos from [Resort Name]! They will be deleted in 48 hours. Buy High-Res Code now."*
* **User Interface**: Customer clicks link -> specific simplified gallery -> sees watermarked previews.

### Phase 4: Fulfillment (The Unlock)

* **Purchase**: Customer pays online.
* **Cloud State**: Updates Order to `Paid`.
* **Master App**:
    1. Polls for `Paid` orders.
    2. Uploads the **Original High-Res** file (which was sitting offline until now).
    3. Cloud delivers the secure download link.

## 3. Technical Implementation

### 3.1 Data Model Adjustments

* **Global Identity**: Each Master Node has a unique `DESK_ID` (e.g., `RESORT_A_MASTER_1`).
* **Metadata**: Ensure `customer_email` is legally attached to `Album`.

### 3.2 Sync Service (`CloudSyncService.ts`)

* **`runRetentionBatch()`**: The core function.
  * Iterates unsold local photos for `Finalized` albums.
  * Checks `if sync_status == 'synced': continue`.
  * Uploads `preview_file` = Watermarked WebP.
  * Appends `desk_id` to payload.
  * Appends `desk_id` to payload.
  * **CRITICAL**: `highres_file` is ALWAYS null during this phase.

### 3.3 Verified Order Split Logic

When a local order is validated (Status: `Verified`):

1. **Identify**: Master compares `Album.photos` vs `Order.selected_photos`.
2. **Split**:
    * **Selected** (Sold) -> Queue for Fulfillment Logic (Upload High-Res).
    * **Unselected** (Moneytrash) -> Queue for Retention Batch Logic (Upload Watermarked Preview).
3. **Execution**: The `OrderValidationService` triggers this split immediately upon order confirmation.

## 4. Security & Quality

* **Watermark**: Baked-in visual obstruction.
* **No "Preview" Sales**: The system prevents purchasing of the preview file itself; it sells the *license* to trigger the High-Res upload.

verify: [Confirm Resort Retention Model Compliance]?
