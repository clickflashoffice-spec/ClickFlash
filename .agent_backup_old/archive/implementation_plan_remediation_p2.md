# Remediation Phase 2: Cloud Sync Bridge

Bridge the "Offline Island" (Master App) with the "Management Portal" (PocketBase) to resolve the Cloud Sync Gap.

## User Review Required
>
> [!IMPORTANT]
> **Database Migration**: This phase requires adding `sync_status` and `sync_id` columns to the `orders`, `photos`, and `albums` tables. I will use the existing `migrate_db.py` tool to perform this safely.

## Proposed Changes

### [Component] Master App (Data Schema)

#### [MODIFY] [models.py](file:///e:/ClickFlash/master-app/python/backend/models.py)

- Add `sync_status = Column(String, default="pending")` and `sync_id = Column(String, nullable=True)` to `Order`, `Photo`, and `Album` classes.

#### [MODIFY] [migrate_db.py](file:///e:/ClickFlash/master-app/python/backend/migrate_db.py)

- Add migration steps to append these new columns to existing SQLite tables.

---

### [Component] Master App (Backend Services)

#### [NEW] [pb_sync_service.py](file:///e:/ClickFlash/master-app/python/backend/services/pb_sync_service.py)

- **Features**:
  - Authenticate with remote PocketBase via `aiohttp`.
  - **Order Sync**: Monitor local `orders` table and push records to PB.
  - **Photo Sync**: Sync photo records (Tier 0 metadata) to PB.
  - **Heartbeat**: Sync Kiosk statuses collected in the local `Kiosk` table to the cloud dashboard.
  - **Retry Logic**: Robust handling for intermittent internet connectivity.

#### [MODIFY] [main.py](file:///e:/ClickFlash/master-app/python/backend/main.py)

- Initialize and start `pb_sync_service` in the main event loop.

---

### [Component] Master App (UI)

#### [MODIFY] [settings.py](file:///e:/ClickFlash/master-app/python/backend/ui/pages/settings.py)

- Update `save_cloud_settings` to restart the sync service when credentials change.
- Add a "Force Sync" button to the Cloud tab.

## Verification Plan

### Automated Tests

- Mock PocketBase API responses and verify the `pb_sync_service` correctly handles success/failure states.
- Run `migrate_db.py` in a test environment to confirm schema upgrades.

### Manual Verification

- Log in to the Management App and verify that orders created on a Touch Kiosk (and synced to Master) appear in the Cloud Dashboard.
- Verify that Kiosk "Online/Offline" status reflects real-time Master App data in the Cloud.
