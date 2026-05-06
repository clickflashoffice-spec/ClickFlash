# Moneytrash Configuration Implementation Plan

**Goal**: Enable users to manually configure "Moneytrash" (Retention Marketing) settings.

## 1. Requirements

* **Toggle**: Enable/Disable Moneytrash Sync globally.
* **Retention Period**: Number of days to keep unsold assets before syncing (or deletion). Default: 7 days.
* **Pricing**: Set the price for unsold "Retention" photos (e.g., $15.00 vs $20.00).

## 2. Database Schema

* We will use the existing `settings` table (key-value store).
* **New Keys**:
  * `moneytrash_settings`: JSON string containing:

        ```json
        {
          "enabled": true,
          "retentionDays": 7,
          "price": "15.00"
        }
        ```

## 3. Backend Changes

### A. `CloudSyncService.ts`

* **Remove Constants**: `RETENTION_DAYS`, `HARDCODED_PRICE`.
* **Add Dynamic Config**:
  * Read `moneytrash_settings` from DB on `start()`.
  * Reload config periodically or on triggers.
* **Logic Updates**:
  * `uploadRetentionAsset`: Use configured `price`.
  * `runRetentionBatch`: Use configured `retentionDays`.

### B. `backend/routes/system.ts`

* **Update `GET /network-settings`**: Include `moneytrash_settings`.
* **Update `POST /network-settings`**: Allow saving `moneytrash_settings`.

## 4. Frontend Changes (`start-master-client`)

* **New Section**: In "Clouds" or "Network" settings page.
* **Fields**:
  * Switch: "Enable Retention Marketing"
  * Input: "Retention Period (Days)"
  * Input: "Price per Photo ($)"

## 5. Implementation Steps

1. **Backend**: Modify `CloudSyncService` to accept and use config.
2. **Backend**: Update API to persist settings.
3. **Frontend**: Add UI for these settings. (If frontend is in scope, assume user is checking backend first).

**Note**: User asked "I want to be able to Manuel configure money trash". I will focus on the Backend Mechanism first, as the Frontend UI might be a separate "React" codebase task. I will implement the Backend support now.
