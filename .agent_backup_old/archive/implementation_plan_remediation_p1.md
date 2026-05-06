# Remediation Phase 1: Critical Fixes

Address critical architectural violations and functional bugs identified during the ecosystem audit.

## User Review Required
>
> [!IMPORTANT]
> **Law 11 Alignment**: I am mirroring all current task and plan artifacts to `e:\ClickFlash\.agent` to ensure they are accessible across different environments as per project requirements.

## Proposed Changes

### [Component] Touch App (Backend)

#### [MODIFY] [ingest.py](file:///e:/ClickFlash/touch-app/python/backend/services/ingest.py)

- **RCA**: The ingest service currently ignores face descriptors in `metadata.json`.
- **Fix**: Update the `IngestService` to iterate through the `faces` property of photos in the metadata and save them to the local `Face` table.

---

### [Component] Master App (Backend)

#### [MODIFY] [kiosk_sync_service.py](file:///e:/ClickFlash/master-app/python/backend/services/kiosk_sync_service.py)

- **RCA**: `sync_album` copies original photo files directly.
- **Fix**: Modify logic to check for the existence of `{filename}_preview.jpg` or `{filename}_tiny.webp`. If they exist, sync those to the Touch shared folder instead of the high-res original.

---

### [Component] Project Hygiene

#### [NEW] [.agent/remediation_task.md](file:///e:/ClickFlash/.agent/remediation_task.md)

#### [NEW] [.agent/implementation_plan_remediation_p1.md](file:///e:/ClickFlash/.agent/implementation_plan_remediation_p1.md)

- **Fix**: Move project-specific tracking to the root `.agent` folder to comply with Law 11.

## Verification Plan

### Automated Tests

- Run `touch-app` unit tests for ingestion.
- Trigger a sync in `master-app` and verify the file size/extension on the destination path.

### Manual Verification

- Verify that Face Search on the Touch App now returns matches for a synced album.
- Check that the `.agent` folder contains the latest project state.
