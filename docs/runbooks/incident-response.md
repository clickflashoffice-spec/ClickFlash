# Incident Response Runbook

## 1. Edge Node Recovery Procedure
- Check power and physical network connectivity.
- Restart the `Master OS` process via system services or PM2.
- Inspect `logs/master.log` for out-of-memory or database lock errors.
- If SQLite database is corrupted, restore from the latest `data/master.backup.db`.

## 2. Camera Tether Drop Troubleshooting
- Ensure USB/Wireless tether is securely connected.
- Restart the `Mobile Pro` app or photographer Edge portal.
- Verify Rust core logs for USB communication failures.
- If physical cable is damaged, fallback to SD card offline transfer to Master OS.

## 3. Database Migration Rollback Steps
- In the event of a botched schema update on Edge:
  1. Stop `Master OS`.
  2. Restore the pre-migration snapshot.
  3. Restart `Master OS` and verify schema integrity.
- For Cloudflare D1:
  1. Use `wrangler d1 backup restore` to apply the most recent hour's backup.
  2. Invalidate CDN cache to prevent stale data reading.

## 4. Cloudflare Worker Deployment Rollback
- If a new Worker release causes elevated 5xx errors:
  1. Login to Cloudflare Dashboard or use CLI.
  2. Run `wrangler rollback <DEPLOYMENT_ID>`.
  3. Monitor error rates in Sentry to confirm resolution.

## 5. Master OS Crash Recovery
- Often caused by out-of-memory errors from excessive photo ingestion.
- **Action**: Restart Node process. Apply a temporary rate limit to the `DbWriteQueue`.
- Investigate `AIWorker` container logs to ensure ONNX model didn't leak memory.
