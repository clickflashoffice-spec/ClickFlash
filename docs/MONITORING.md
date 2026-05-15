# Production Monitoring & Observability

## Overview

ClickFlash runs across 6 apps in 3 Tunisian hotels. This guide covers every observability surface, what to watch, and how to respond.

---

## Sentry Integration

| App | Package | DSN env var |
|-----|---------|-------------|
| Master (Electron) | `@sentry/react` + `@sentry/node` | `VITE_SENTRY_DSN` |
| Touch (Electron) | `@sentry/react` | `VITE_SENTRY_DSN` |
| Gallery (CF Worker) | `@sentry/cloudflare` | `SENTRY_DSN` (wrangler secret) |
| Management (CF Worker) | `@sentry/cloudflare` | `SENTRY_DSN` (wrangler secret) |
| Website (Next.js) | `@sentry/react` | `NEXT_PUBLIC_SENTRY_DSN` |
| MoneyTrash (Tauri) | `@sentry/react` | `VITE_SENTRY_DSN` |

### Key Sentry alerts to configure

1. **Error spike** -- >10 errors/hour on any app
2. **New issue** -- first occurrence of unhandled exception
3. **Payment webhook failure** -- filter by `stripe` or `webhook` tags
4. **Sync failure** -- filter by `cloud-sync` tag on master

---

## Health Endpoints

| App | Endpoint | Port | Expected |
|-----|----------|------|----------|
| Master backend | `GET /api/health` | 8090 | `{ "status": "ok" }` |
| Touch backend | `GET /api/health` | 8091 | `{ "status": "ok" }` |
| Gallery Worker | `GET /api/health` | -- (CF edge) | `{ "status": "ok" }` |
| Management Worker | `GET /api/health` | -- (CF edge) | `{ "status": "ok" }` |

### Recommended polling

```bash
# Cron every 60s on each hotel server
curl -sf http://localhost:8090/api/health || echo "MASTER DOWN" | send-alert
curl -sf http://localhost:8091/api/health || echo "TOUCH DOWN"  | send-alert
```

---

## Cloudflare Worker Analytics

Gallery and Management Workers expose built-in analytics via the Cloudflare dashboard:

- **Requests** -- total, cached vs. uncached, error rate
- **CPU time** -- per-invocation wall time (should stay under 30ms for reads)
- **Observability** -- enabled via `[observability] enabled = true` in `wrangler.toml`

Check: Cloudflare Dashboard > Workers & Pages > (app) > Analytics

---

## Audit Logs (Master & Touch)

Both Electron apps use `AuditLogger` (`backend/shared/auditLogger.ts`):

- **Location**: `<dataDir>/audit_logs/audit-YYYY-MM-DD.log`
- **Rotation**: 30-day retention, 50 MB max per daily file
- **Format**: JSON lines (timestamp, action, userId, details)

To tail live:
```bash
tail -f "C:\ProgramData\ClickFlash\audit_logs\audit-$(date +%Y-%m-%d).log"
```

---

## What to Monitor (3-Hotel Deployment)

### Critical (page immediately)

| Signal | Source | Meaning |
|--------|--------|---------|
| Master `/api/health` fails | Cron poll | Backend crashed or DB locked |
| Touch `/api/health` fails | Cron poll | Kiosk backend down -- guests can't browse |
| Sentry: unhandled Stripe error | Sentry alert | Payment processing broken |
| Sync queue depth > 500 | `GET /api/cloud/stats` | Upload backlog -- possible network issue |

### Warning (check within 1 hour)

| Signal | Source | Meaning |
|--------|--------|---------|
| Disk usage > 80% on master | OS monitoring | Photo storage filling up |
| Audit log file > 40 MB | File size check | Unusually high activity |
| CF Worker error rate > 1% | Cloudflare analytics | Possible D1/R2 issue |
| Sentry: new issue type | Sentry alert | New bug introduced |

### Informational (check weekly)

- CF Worker request volume trends
- Sentry issue backlog count
- Audit log patterns (unusual login times, bulk operations)
- Database file size growth on master SQLite

---

## Log Locations Summary

| App | Log Type | Location |
|-----|----------|----------|
| Master | Audit logs | `<dataDir>/audit_logs/` |
| Master | Application logs | Electron `stdout` / Sentry |
| Touch | Audit logs | `<dataDir>/audit_logs/` |
| Touch | Application logs | Electron `stdout` / Sentry |
| Gallery | Worker logs | Cloudflare Dashboard > Logs |
| Management | Worker logs | Cloudflare Dashboard > Logs |
| Website | Application logs | Vercel / Sentry |
| MoneyTrash | Application logs | Tauri `stdout` / Sentry |
