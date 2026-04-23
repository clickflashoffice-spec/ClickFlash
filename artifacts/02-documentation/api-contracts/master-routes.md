# API Contracts - Master Portal

**Version:** 1.0  
**Date:** 2026-04-08  
**App:** Master Portal  
**Routes:** 21 confirmed  

---

## API Route Inventory

| Route | Method | Handler | Validation | Auth | Status |
|-------|--------|---------|------------|------|--------|
| `/api/auth/login` | POST | AuthController | Zod | None | Active |
| `/api/auth/logout` | POST | AuthController | - | Session | Active |
| `/api/auth/session` | GET | AuthController | - | Session | Active |
| `/api/auth/signup` | POST | AuthController | Zod | None | Active |
| `/api/collections` | GET | CollectionsController | - | Session | Active |
| `/api/collections/:type` | GET | CollectionsController | - | Session | Active |
| `/api/collections/:type/:id` | GET | CollectionsController | - | Session | Active |
| `/api/collections/:type/:id` | POST | CollectionsController | Zod | Session | Active |
| `/api/collections/:type/:id` | PUT | CollectionsController | Zod | Session | Active |
| `/api/collections/:type/:id` | DELETE | CollectionsController | - | Session | Active |
| `/api/cloud/status` | GET | CloudController | - | Session | Active |
| `/api/cloud/sync` | POST | CloudController | - | Session | Active |
| `/api/orders` | GET | OrdersController | - | Session | Active |
| `/api/orders/:id` | GET | OrdersController | - | Session | Active |
| `/api/orders/:id` | POST | OrdersController | Zod | Session | Active |
| `/api/orders/:id` | PUT | OrdersController | Zod | Session | Active |
| `/api/orders/:id/export` | POST | OrdersController | - | HMAC | Active |
| `/api/faces/search` | POST | FacesController | Zod | Session | Active |
| `/api/faces/reindex` | POST | FacesController | - | Session | Active |
| `/api/culling/analyze` | POST | CullingController | Zod | Session | Active |
| `/api/pairing/initiate` | POST | PairingController | - | None | Active |
| `/api/pairing/confirm` | POST | PairingController | - | HMAC | Active |
| `/api/sync/push` | POST | SyncController | - | HMAC | Active |
| `/api/sync/pull` | GET | SyncController | - | HMAC | Active |
| `/api/files/upload` | POST | FilesController | Multipart | Session | Active |
| `/api/files/:id` | GET | FilesController | - | Session | Active |
| `/api/system/health` | GET | SystemController | - | None | Active |
| `/api/system/info` | GET | SystemController | - | Session | Active |
| `/api/realtime/events` | GET | RealtimeController | - | Session | Active |

---

## Authentication Methods

| Method | Usage | Apps |
|--------|-------|------|
| JWT + Express Sessions | Master Portal | Master |
| HMAC-SHA256 Request Signing | Touch-Master communication | Touch |
| RS256 JWT | Management Hub | Management |
| Token-based | Per-order access | Gallery |

---

## Request Validation

| Route Category | Validation | Schema |
|---------------|------------|--------|
| Auth | Zod | `authSchema` |
| Collections | Zod | `collectionSchema` |
| Orders | Zod | `orderSchema` |
| Files | Multipart | File type/size checks |
| Faces | Zod | `faceSearchSchema` |
| Sync | HMAC | Timestamp + signature |

---

## Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 5 | per minute |
| `/api/files/upload` | 20 | per minute |
| `/api/orders` | 100 | per minute |

---

## Health Check

| Endpoint | Response |
|----------|----------|
| `/api/system/health` | `{ "status": "ok", "uptime": seconds }` |

---

**Document Control:**
- Version: 1.0
- Created: 2026-04-08
- Source: Code review of `apps/master/backend/routes/`
