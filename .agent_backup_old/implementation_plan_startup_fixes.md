# Implementation Plan: Resolve Startup Failures

This plan addresses several critical issues identified in the Master app startup logs:
1. `cloudflared` dependency failures (missing from PATH).
2. Watermark generation failures due to placeholder URLs in the database.
3. Campaign scheduler warnings due to unconfigured email services.

## Proposed Changes

### [Component] Tunnel Infrastructure

#### [MODIFY] [TunnelManager.ts](file:///E:/ClickFlash/apps/master/backend/services/TunnelManager.ts)
- Add defensive check to prevent crash loops when `cloudflared` is not found.
- Implement a "Disabled" state if binary is missing.

### [Component] Photo Processing Logic

#### [MODIFY] [photoWorker.ts](file:///E:/ClickFlash/apps/master/backend/workers/photoWorker.ts)
- Add a guard to skip watermarking/processing for files that look like remote URLs (e.g., matching `https://`).
- Log a warning instead of a critical error for these cases.

### [Component] Marketing & Email

#### [MODIFY] [campaignScheduler.ts](file:///E:/ClickFlash/apps/master/backend/services/campaignScheduler.ts)
- Reduce log level for "Email service not configured" from `WARN` to `INFO` if it's an expected development state, or add a configuration flag to explicitly disable it.

## Verification Plan

### Automated Tests
- Run `npm test` in `apps/master` to ensure no regressions in backend services.
- Execute a custom verification script (using `run_command`) to simulate the `TunnelManager` startup and confirm it doesn't crash without `cloudflared`.

### Manual Verification
- Restart the Master App and verify that the logs no longer show `ERROR` for placeholder watermarks.
- Check that `cloudflared` crash-restart loops are resolved.
- Verify that the Dashboard loads correctly despite the tunnel being offline.
