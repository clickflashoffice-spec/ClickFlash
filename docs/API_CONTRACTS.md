# ClickFlash — API Contracts

Last updated: 2026-04-08

All backends return `Content-Type: application/json`. Auth is via `Authorization: Bearer <jwt>` unless noted.

---

## Master Backend — Port 8090

### Auth
| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| POST | `/api/auth/login` | — | `{email, password}` | `{token, user}` |
| POST | `/api/auth/logout` | Yes | — | `204` |
| GET | `/api/auth/qr-session` | — | — | `{sessionId, qrUrl}` |
| POST | `/api/auth/magic-link` | — | `{email}` | `{sent: true}` |

### Collections (generic CRUD)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/collections/:collection/records` | Yes | List records (supports `?filter=`, `?sort=`, `?page=`) |
| POST | `/api/collections/:collection/records` | Yes | Create record |
| GET | `/api/collections/:collection/records/:id` | Yes | Get one record |
| PATCH | `/api/collections/:collection/records/:id` | Yes | Update record |
| DELETE | `/api/collections/:collection/records/:id` | Yes | Delete record |

Collections: `orders`, `photos`, `albums`, `customers`, `bookings`, `kiosks`, `products`, `settings`

### Files / Media
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/files` | Yes | Upload file (multipart) → `{fileId, url}` |
| GET | `/api/files/:id` | — | Serve file (watermarked for gallery JWT) |
| GET | `/api/gallery/:token/:photoId` | Gallery JWT | Serve photo to customer browser |

### Sync
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/sync/mutation` | Kiosk token | Push order/photo from Touch kiosk |
| GET | `/api/sync/status` | Yes | Sync queue status |
| POST | `/api/cloud/sync` | Yes | Trigger push to gallery + management |
| GET | `/api/cloud/status` | Yes | Cloud sync health |

### Analytics & Dashboard
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analytics/summary` | Yes | Revenue, orders, prints by date range |
| GET | `/api/analytics/events` | Yes | Event-level breakdown |
| GET | `/api/dashboard/health` | Yes | System health (disk, DB, printers) |

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | `{status: "ok", uptime}` |
| GET | `/api/ip` | — | `{ip, interfaces[]}` |
| POST | `/api/pairing` | Kiosk token | Register kiosk pairing |
| POST | `/api/notification` | Kiosk token | Send notification to Master UI |
| POST | `/api/assistance` | — | Customer requests assistance |
| GET | `/api/export/law14` | Yes | GDPR Art.20 data export ZIP |
| POST | `/api/system/erase-customer-data` | Yes | GDPR Art.17 erasure `{email}` |

### Faces
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/faces/search` | Yes | Search by face descriptor |
| POST | `/api/faces/reindex` | Yes | Rebuild face index |

---

## Touch Backend — Port 8091

### Auth
| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| POST | `/api/auth/login` | — | `{email, password}` | `{token, user}` |

### Collections
Same generic CRUD as Master at `/api/collections/:collection/records`.

Local collections: `orders`, `photos`, `albums`, `settings`, `products`

### Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | Yes | Create order, sync to Master |
| GET | `/api/orders` | Yes | List orders |
| POST | `/api/orders/:id/print` | Yes | Send to receipt printer |
| GET | `/api/orders/:id/status` | Yes | Order status |

### Files
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/files` | Yes | Upload photo (multipart) |
| GET | `/api/files/:id` | Yes | Serve photo |

### Faces
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/faces/search` | Yes | Match face for login |
| POST | `/api/faces/reindex` | Yes | Rebuild local face index |

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | `{status: "ok"}` |
| GET | `/api/ip` | — | `{ip}` |
| GET | `/api/system/info` | Yes | Disk, memory, CPU stats |
| GET | `/api/realtime` | Yes | SSE stream — live metrics |

---

## Gallery Backend — Port 8080

### Auth
| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| POST | `/api/auth/login` | — | `{orderRef, code}` | `{token, orderId}` |

### Orders / Photos
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/orders/by-credentials` | Gallery JWT | Customer's order + photos |
| GET | `/api/collections/orders/records` | Yes | List orders (operator) |
| PATCH | `/api/collections/orders/records/:id` | Yes | Update order |

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | `{status: "ok"}` |
| GET | `/api/ip` | — | Network info |
| POST | `/api/init/default-user` | — | Bootstrap admin user |
| POST | `/api/data/refresh` | Sync token | Master → Gallery push (bulk upsert) |
| POST | `/api/system/erase-customer-data` | Yes | GDPR erasure `{email}` |

---

## Management Backend — Port 8085

All Gallery endpoints, plus:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/mode` | — | `{mode: "master"}` |
| GET | `/api/sync/status` | Yes | Per-kiosk sync status |
| GET | `/api/collections/bookings/records` | Yes | List bookings |
| POST | `/api/collections/bookings/records` | Yes | Create booking |
| GET | `/api/analytics/summary` | Yes | Revenue summary |
| POST | `/api/system/erase-customer-data` | Yes | GDPR erasure `{email}` |

---

## Common Response Shapes

### Success list
```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "perPage": 50
}
```

### Success single
```json
{ "id": "uuid", ...fields }
```

### Error
```json
{ "error": "Human readable message", "code": "OPTIONAL_CODE" }
```

HTTP status codes: `200` success, `201` created, `204` no content, `400` bad request, `401` unauthorized, `403` forbidden, `404` not found, `500` server error.

---

## Inter-service Auth

Touch → Master sync uses a shared `KIOSK_TOKEN` (UUID) established at pairing time. Included as `X-Kiosk-Token: <uuid>` header on sync mutations.

Master → Gallery/Management sync uses a server-to-server `SYNC_SECRET` set in each app's environment.
