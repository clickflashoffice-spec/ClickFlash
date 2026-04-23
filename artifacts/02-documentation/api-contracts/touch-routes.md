# API Contracts - Touch Kiosk

**Version:** 1.0  
**Date:** 2026-04-08  
**App:** Touch Kiosk  
**Routes:** 8 confirmed  

---

## API Route Inventory

| Route | Method | Handler | Validation | Auth | HMAC | Status |
|-------|--------|---------|------------|------|------|--------|
| `/api/auth/login` | POST | AuthController | Zod | None | No | Active |
| `/api/auth/verify` | GET | AuthController | - | Token | No | Active |
| `/api/collections/:type` | GET | CollectionsController | - | Token | No | Active |
| `/api/orders` | GET | OrdersController | - | Token | No | Active |
| `/api/orders` | POST | OrdersController | Zod | Token | No | Active |
| `/api/orders/:id` | GET | OrdersController | - | Token | No | Active |
| `/api/orders/:id/export-to-master` | POST | OrderExport | Zod | HMAC | Yes | Active |
| `/api/sync/push` | POST | SyncController | - | HMAC | Yes | Active |
| `/api/sync/pull` | GET | SyncController | - | HMAC | Yes | Active |

---

## HMAC Signature Requirements

Touch Kiosk → Master communication requires HMAC-SHA256 signing:

| Header | Description |
|--------|-------------|
| `X-Kiosk-ID` | Unique kiosk identifier |
| `X-Timestamp` | Unix timestamp (ms) |
| `X-Signature` | HMAC-SHA256(kiosk_id + timestamp + body) |

**Replay Prevention:** 5-minute timestamp window

---

## Local vs Master Routes

### Local-Only Routes (No HMAC)

- Authentication (local session)
- Data viewing (collections, orders)
- Cart operations

### Master-Synced Routes (HMAC Required)

- Order export to Master
- Sync push/pull

---

## Request Validation

| Route Category | Validation | Schema |
|---------------|------------|--------|
| Auth | Zod | `authSchema` |
| Orders | Zod | `orderSchema` |
| Sync | HMAC | Timestamp + signature |

---

## Offline Behavior

| Feature | Implementation |
|---------|----------------|
| Queue Orders | `OfflineQueueV2.ts` |
| Sync on Reconnect | `syncService.ts` |
| Conflict Resolution | Last-write-wins with timestamp |

---

## Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "offline": true
  }
}
```

---

## Health Check

| Endpoint | Response |
|----------|----------|
| `/api/system/health` | `{ "status": "ok", "offline": boolean }` |

---

**Document Control:**
- Version: 1.0
- Created: 2026-04-08
- Source: Code review of `apps/touch/backend/routes/`
