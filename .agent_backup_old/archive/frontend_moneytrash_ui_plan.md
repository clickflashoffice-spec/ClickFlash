# Moneytrash Frontend UI Implementation Plan

**Goal**: Implement the "Manual Configuration" UI for Moneytrash (Retention Marketing) in the Master App.

## 1. Component: `src/components/settings/CloudSettings.tsx`

### Current State

* Has a mock "Retention Policy" section.
* Uses local state `config` (structure inferred).

### Proposed Changes

1. **State Management**:
    * Extend `config` state to include `moneytrash`:

        ```typescript
        interface MoneytrashConfig {
            enabled: boolean;
            retentionDays: number;
            price: string;
        }
        ```

2. **Data Fetching**:
    * On mount, fetch `/api/network-settings`.
    * Populate `config.moneytrash` from response.
3. **UI Implementation**:
    * Replace hardcoded "Immediate Flush" section with:
        * **Toggle**: Enable Retention Marketing.
        * **Input**: Retention Period (Days).
        * **Input**: Price per Photo ($).
4. **Persistence**:
    * Update `handleSave` to POST the updated `config` (including `moneytrash`) to `/api/network-settings`.

## 2. API Integration

* Use `fetch('/api/network-settings')` directly or via a service helper.
* Ensure payload structure matches Backend expectation:

    ```json
    {
      ...otherSettings,
      "moneytrash": { "enabled": true, "retentionDays": 7, "price": "15.00" }
    }
    ```

## 3. Verification

* **Visual Check**: Verify UI elements appear correct.
* **Functional Check**: Save settings, reload page to verify persistence.
* **End-to-End**: Verify Backend `CloudSyncService` logs show loaded config on restart (or hot reload).
