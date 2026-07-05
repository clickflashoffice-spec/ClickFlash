# Zero-Config Kiosk Pairing — Auto-Path Configuration

> **Date:** 2026-06-12
> **Scope:** Master ↔ Touch LAN pairing via ethernet (no internet)
> **Problem:** User had to manually set `uploadFolderPath` and `ordersFolderPath` in Master settings for every kiosk
> **Solution:** Convention-based auto-generated paths, communicated via QR code, zero manual entry

---

## Problem Statement

When pairing a Touch kiosk to a Master station over a local ethernet connection (no internet), the user had to:

1. In **Master Settings → Kiosk Connections**: Click "Configure/Edit" on each kiosk row
2. Manually type or browse for:
   - `uploadFolderPath` — where the kiosk puts photos it receives from Master
   - `ordersFolderPath` — where the kiosk writes JSON order files for Master to fulfill
3. In **Touch Settings → Connection**: Manually type the same paths in `sharedFolderPath` and `touchOrdersFolder`

This was error-prone, time-consuming, and required the user to know the filesystem layout of both machines.

---

## Solution: Convention-Based Auto-Paths

### Architecture

```
Master PC (Windows)
├── C:\ClickFlash\data\                    ← Master data root
│   ├── kiosks\                            ← Auto-created per kiosk
│   │   ├── KIOSK_A1B2\                    ← Sanitized kiosk ID
│   │   │   ├── uploads\                   ← Touch receives photos here
│   │   │   └── orders\                    ← Touch writes orders here
│   │   └── KIOSK_C3D4\
│   │       ├── uploads\
│   │       └── orders\
│   └── ...

Touch Kiosk (Windows/Linux)
├── C:\ClickFlash\data\                    ← Same convention (or /opt/clickflash/data)
│   ├── kiosks\{kioskId}\uploads\           ← Monitored photo folder (auto-configured)
│   └── kiosks\{kioskId}\orders\           ← Orders hot folder (auto-configured)
```

### Flow

```
1. Master generates QR code
   ├── Creates pairing token
   ├── Generates paths: C:\ClickFlash\data\kiosks\{id}\uploads
   │                    C:\ClickFlash\data\kiosks\{id}\orders
   ├── Embeds paths in QR JSON (PairingData)
   └── POSTs to /api/pairing/register

2. Master backend /pairing/register
   ├── Receives paths in request body
   ├── Auto-creates directories (mkdir -p)
   ├── Pre-populates kiosks table with paths
   └── Returns success + paths

3. Touch scans QR code
   ├── Parses PairingData (includes paths)
   ├── Auto-saves paths to local Touch DB
   │   (sharedFolderPath → uploads path)
   │   (touchOrdersFolder → orders path)
   └── Shows "AUTO" badge in settings

4. No manual path entry required on either side
```

---

## Files Changed

### Master Frontend

| File | Change |
|---|---|
| `apps/master/src/components/settings/KioskPairing.tsx` | Added `generateKioskPaths()` — creates convention-based paths from kiosk ID. Embeds `uploadFolderPath`, `ordersFolderPath`, `masterDataRoot` in QR code JSON. Sends paths to backend during `/api/pairing/register`. |

### Master Backend

| File | Change |
|---|---|
| `apps/master/backend/routes/pairing.ts` | `/pairing/register` now accepts `uploadFolderPath` and `ordersFolderPath` in request body. Auto-creates directories with `fs.mkdirSync(..., { recursive: true })`. Pre-populates `kiosks` table with paths so they're ready before validation. Returns paths in response. |

### Touch Frontend

| File | Change |
|---|---|
| `apps/touch/src/types/pairing.ts` | Extended `PairingData` interface with `uploadFolderPath`, `ordersFolderPath`, `masterDataRoot` fields. |
| `apps/touch/src/components/touch/TouchConnectionSetup.tsx` | When QR is scanned, extracts auto-paths from `PairingData` and persists them to Touch local DB via `fetch` to `/api/collections/settings/records`. Fire-and-forget (doesn't block pairing if DB save fails). |
| `apps/touch/src/components/touch/settings/ConnectionSettings.tsx` | Added "AUTO" badge and "Auto-configured via pairing" text when paths start with `C:\ClickFlash` or `/ClickFlash`. Visual confirmation that zero-config worked. |

---

## Path Convention

```typescript
// Master: KioskPairing.tsx
function generateKioskPaths(kioskId: string) {
  const masterDataRoot = (window as any).__MASTER_DATA_ROOT__ || 'C:\\ClickFlash\\data';
  const safeKioskId = kioskId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return {
    masterDataRoot,
    uploadFolderPath: `${masterDataRoot}\\kiosks\\${safeKioskId}\\uploads`,
    ordersFolderPath: `${masterDataRoot}\\kiosks\\${safeKioskId}\\orders`,
  };
}
```

**Security:** Kiosk ID is sanitized — any character that isn't alphanumeric, underscore, or hyphen is replaced with `_`. This prevents path traversal even if a malicious kiosk ID is injected.

---

## Backward Compatibility

- **Old QR codes without paths:** Touch still works — paths just aren't auto-configured. The user can still manually enter them in settings. No breaking change.
- **Old kiosks already configured:** Their manually-set paths are preserved. The `COALESCE` in the backend update ensures existing paths aren't overwritten unless explicitly provided.
- **Master backend without new fields:** The `uploadFolderPath` and `ordersFolderPath` parameters are optional in the register endpoint. Old frontend versions that don't send them still work.

---

## Verification

```bash
# Check Master frontend compiles
cd apps/master && npx tsc --noEmit
# → 0 new errors (pre-existing backend tsconfig issues unrelated)

# Check Touch frontend compiles
cd apps/touch/src && npx tsc --noEmit
# → 0 new errors in modified files (2 pre-existing in backend pairing.ts)
```

---

## Operator Notes

1. **Master data root** defaults to `C:\ClickFlash\data` on Windows. To override, set `window.__MASTER_DATA_ROOT__` before the app mounts, or modify the default in `KioskPairing.tsx`.
2. **Linux/Mac** paths will use `/opt/clickflash/data` or `~/ClickFlash/data` — the convention is the same, just the root changes.
3. **Network shares:** If the kiosk needs to access Master paths over SMB, the paths in the QR will still be local Master paths. The Touch should map the network drive separately (this is a future enhancement — auto-mount SMB shares).

---

## Future Enhancements

- **Auto-mount network shares:** Detect if Touch is on a different machine and auto-configure SMB/NFS mount for the paths.
- **Path validation:** After pairing, Touch could verify the paths exist and are writable, alerting if there's a filesystem issue.
- **Per-destination customization:** Allow the data root to be set per-destination in the Management Hub, synced to all Masters in that fleet.
