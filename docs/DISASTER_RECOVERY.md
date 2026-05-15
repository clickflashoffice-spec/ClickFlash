# Disaster Recovery & Rollback

## Overview

ClickFlash operates across on-premise Electron apps (master, touch) and cloud services (CF Workers, D1, R2). This guide covers recovery procedures for every failure scenario in the 3-hotel deployment.

---

## RTO / RPO Targets

| Component | RPO (max data loss) | RTO (max downtime) |
|-----------|--------------------|--------------------|
| Master SQLite | Last backup (daily) | 30 minutes |
| Touch kiosk | Zero (stateless — syncs from master) | 15 minutes |
| D1 database | 30 seconds (CF time-travel) | 5 minutes |
| R2 photo storage | Zero (immutable objects) | 5 minutes |
| CF Workers | Zero (code is versioned) | 2 minutes |

---

## Scenario 1: Master Server Dies

The master Electron app runs on a dedicated PC at each hotel.

### Symptoms
- `/api/health` on port 8090 unreachable
- Touch kiosks show "Cannot connect to master"
- No new photos being ingested

### Recovery steps

1. **Restart the app** -- close and reopen ClickFlash Master from desktop shortcut
2. **If app won't start** -- check Windows Event Viewer for crash details
3. **If DB is corrupted**:
   ```bash
   # Stop the app
   # Copy backup (stored in <dataDir>/backups/)
   copy "C:\ProgramData\ClickFlash\backups\latest.sqlite" ^
        "C:\ProgramData\ClickFlash\database.sqlite"
   # Restart the app
   ```
4. **If hardware failure** -- install on replacement PC using deployment package, restore from latest backup

### Backup schedule

Master runs automatic SQLite backups:
- **Daily** backup to `<dataDir>/backups/`
- **Pre-update** backup before any Electron auto-update
- **Manual** backup available via Settings > Data Management > Backup

---

## Scenario 2: Touch Kiosk Dies

Touch kiosks are stateless — they fetch all data from the master over LAN.

### Recovery steps

1. **Restart the app** -- close and reopen ClickFlash Touch
2. **If app won't start** -- reinstall from the deployment `.exe` package
3. **Re-pair with master** -- open Settings on the kiosk, enter master IP and pairing code

No data loss is possible since touch kiosks don't store persistent data.

---

## Scenario 3: Network Outage (Hotel LAN)

### Symptoms
- Touch kiosks can't reach master
- Cloud sync queue starts growing
- Guests can still browse cached photos on kiosks (offline mode via Dexie)

### Recovery steps

1. Fix network hardware (router, switch, cables)
2. Master will automatically resume cloud sync when connectivity returns
3. Touch kiosks will reconnect automatically via retry logic
4. Check sync queue depth: `GET http://localhost:8090/api/cloud/stats`

---

## Scenario 4: D1 Database Issue (Gallery/Management)

### Using Cloudflare Time Travel

D1 supports point-in-time recovery up to 30 days:

```bash
# List available bookmarks
wrangler d1 time-travel info clickflash-gallery-db

# Restore to a specific point
wrangler d1 time-travel restore clickflash-gallery-db --timestamp "2026-05-14T12:00:00Z"
```

### Full D1 backup

```bash
# Export current state
wrangler d1 export clickflash-gallery-db --output backup.sql

# Import to restore
wrangler d1 execute clickflash-gallery-db --file backup.sql
```

---

## Scenario 5: R2 Photo Storage Issue

R2 objects are immutable once written. Deletion is the only risk.

### If photos are accidentally deleted

- R2 does not have built-in versioning enabled by default
- Recovery depends on whether the master still has the original files locally
- Re-run the photo ingestion pipeline from master to re-upload

### Prevention

- Never grant `delete` permissions to the gallery Worker's R2 binding
- Master retains all original photos locally as the source of truth

---

## Scenario 6: CF Worker Deployment Goes Bad

### Instant rollback

```bash
# Gallery
wrangler rollback --name clickflash-gallery

# Management
wrangler rollback --name clickflash-management
```

This reverts to the previous deployment within seconds.

### Manual redeploy from known-good version

```bash
git checkout <known-good-tag>
cd apps/gallery && wrangler deploy
cd apps/management && wrangler deploy
```

---

## Scenario 7: Electron Auto-Update Breaks App

### Recovery steps

1. The pre-update backup was created automatically in `<dataDir>/backups/`
2. Uninstall the broken version via Windows Add/Remove Programs
3. Install the previous version from the `release/` archive
4. Restore the pre-update backup if the DB schema changed

### Prevention

- Test auto-updates on a staging kiosk before rolling out to all hotels
- Keep the previous 2 installer versions in the release archive

---

## Contact & Escalation

| Level | Who | When |
|-------|-----|------|
| L1 | Hotel IT staff | App restart, network check |
| L2 | ClickFlash admin | DB restore, Worker rollback |
| L3 | Developer | Code-level investigation |
