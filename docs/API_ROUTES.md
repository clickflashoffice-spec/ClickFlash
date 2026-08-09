# ClickFlash v2.0 — Master API Route Inventory

> Auto-generated 2026-08-07 from live codebase scan
> **Total routes**: 130+ endpoints across Master, Touch, Workers

---

## Authentication Model

### Global Middleware Chain
1. **Express Session Cookie** (`req.session.user`)
2. **Bearer Token (JWT)** (`Authorization: Bearer <token>`) validated against `JWT_SECRET`
3. **Service Token** (`x-service-token: <SERVICE_SECRET>`) for internal file routes

### Public API Exemptions
The following prefixes bypass global auth (route-level auth still applies):
- `/api/auth/*` — Login, QR session, PIN verify, magic link
- `/api/health/*` — Health check & federated diagnostics
- `/api/gallery-auth/*` — Gallery client authentication
- `/api/gallery-checkout/*` — Checkout, Stripe webhooks, cash payments
- `/api/gallery/*` — Watermarked gallery serving & exports
- `/api/pairing/*` & `/api/v1/pairing/*` — Kiosk pairing handshakes
- `/api/v1/kiosks/*` — Auto-register kiosks
- `/api/v1/mobile-capture/*` — Route-level HMAC verification
- `/api/assistance/*` — Kiosk → Master assistance calls
- `/api/notification/*` — Kiosk → Master notifications

### RBAC Roles
| Role | Permissions |
|------|------------|
| CEO | All permissions |
| Manager | Most except system admin |
| Team Leader | Albums, photos, orders, analytics |
| Photographer | Photos, own analytics |
| Admin | System admin, settings |

---

## Master Station Routes (100+)

### A. Auth & Sessions (`/api/auth`)
| Method | Path | Auth | Protection |
|--------|------|------|-----------|
| POST | `/api/auth/login` | Public | Rate limited |
| POST | `/api/auth/login-pin` | Public | Rate limited |
| POST | `/api/auth/verify-pin` | Public | Strict rate limiter |
| POST | `/api/auth/logout` | Session | — |
| GET | `/api/auth/me` | Session | — |
| DELETE | `/api/auth/me` | Session | — |
| POST | `/api/auth/me/export` | Session | — |
| GET | `/api/auth/sessions` | Session | — |
| DELETE | `/api/auth/sessions/:id` | Session | — |
| DELETE | `/api/auth/sessions` | Session | — |

### B. Albums (`/api/collections/albums/records`)
| Method | Path | Auth | Permission |
|--------|------|------|-----------|
| POST | `/` | Auth | `album:create` |
| PATCH | `/:id` | Auth | `album:edit` |
| GET | `/:id/inspiration` | Auth | `album:edit` |
| DELETE | `/:id` | Auth | `album:delete` |

### C. Photos (`/api/collections/photos/records`)
| Method | Path | Auth | Permission |
|--------|------|------|-----------|
| POST | `/` | Auth | `photo:upload` |
| PATCH | `/:id` | Auth | `photo:edit` |
| POST | `/:id/auto-edits` | Auth | — |
| GET | `/:id/coach` | Auth | `photo:upload` |
| POST | `/:id/upscale` | Auth | `photo:edit` |
| DELETE | `/:id` | Auth | `photo:delete` |

### D. Orders Engine (`/api/orders`)
| Method | Path | Auth | Protection |
|--------|------|------|-----------|
| GET | `/` | Auth | — |
| POST | `/` | Auth | Strict rate limiter |
| GET | `/by-credentials` | Auth | — |
| POST | `/:id/fulfillment/push` | Auth | Strict rate limiter |
| POST | `/:id/print` | Auth | Strict rate limiter |
| GET | `/:id/assets` | Auth | — |
| PATCH | `/:id/status` | Auth | — |
| POST | `/:id/slip` | Auth | Strict rate limiter |
| POST | `/kiosk/orders` | Auth | Strict rate limiter |

### E. Face Recognition (`/api/faces`)
| Method | Path | Auth | Permission |
|--------|------|------|-----------|
| POST | `/login` | Auth | Strict rate limiter |
| POST | `/register` | Auth | `photo:view` + rate limit |
| POST | `/search` | Auth | `photo:view` + rate limit |
| POST | `/search-vector` | Auth | `photo:view` + rate limit |
| POST | `/consumer-search` | Auth | Strict rate limiter |
| POST | `/reindex` | Auth | `system:admin` + rate limit |

### F. AI Culling (`/api/culling`)
| Method | Path | Auth | Permission |
|--------|------|------|-----------|
| POST | `/analyze/:albumId` | Auth | `photo:edit` + rate limit |
| GET | `/results/:albumId` | Auth | `photo:view` |
| POST | `/confirm/:albumId` | Auth | `photo:edit` + rate limit |

### G. Cloud Sync & DLQ (`/api/cloud`)
| Method | Path | Auth | Protection |
|--------|------|------|-----------|
| GET | `/status`, `/stats`, `/dlq`, `/candidates` | Auth | — |
| POST | `/queue/pause`, `/resume`, `/purge` | Auth | Strict rate limiter |
| POST | `/dlq/replay` | Auth | Strict rate limiter |
| DELETE | `/dlq/:id` | Auth | Strict rate limiter |
| POST | `/sync`, `/heartbeat` | Auth | Strict rate limiter |
| POST | `/sync/payroll`, `/expenses`, `/inventory` | Auth | Strict rate limiter |

### H. Analytics (`/api/analytics`)
| Method | Path | Auth | Permission |
|--------|------|------|-----------|
| GET | `/summary`, `/hourly`, `/photographers` | Auth | `analytics:view` |
| GET | `/albums/:id`, `/photos/:id` | Auth | `analytics:view` |
| POST | `/track` | Auth | `photo:view` + rate limit |

### I. Mobile Capture (`/api/v1/mobile-capture`)
| Method | Path | Auth | Protection |
|--------|------|------|-----------|
| POST | `/pair` | Public | Strict rate limiter |
| GET | `/sync` | HMAC | Route-level signature |
| PUT | `/upload` | HMAC | Route-level signature |
| GET | `/photographers` | Auth | Admin routes |
| GET | `/devices`, `/health` | Auth | Admin routes |
| POST | `/pairing-codes` | Auth | Strict rate limiter |
| DELETE | `/devices/:deviceId` | Auth | Strict rate limiter |

### J. Gallery & Checkout (Public)
| Method | Path | Auth | Protection |
|--------|------|------|-----------|
| POST | `/api/gallery/export` | Public | — |
| POST | `/api/gallery/sign-urls` | Public | — |
| POST | `/api/gallery-auth/order-login` | Public | Strict rate limiter |
| POST | `/api/gallery-auth/generate-magic-link` | Public | Strict rate limiter |
| GET | `/api/gallery-auth/:token/verify` | Token | — |
| GET | `/api/gallery-auth/:token/photos` | Token | — |
| POST | `/api/gallery-checkout/:token/create` | Token | Strict rate limiter |
| POST | `/api/gallery-checkout/:token/cash` | Token | Strict rate limiter |
| GET | `/api/gallery-checkout/:token/order/:orderId` | Token | — |

### K. Pairing (`/api/pairing`)
| Method | Path | Auth | Protection |
|--------|------|------|-----------|
| POST | `/validate` | Public | — |
| POST | `/register` | Public | — |
| GET | `/active` | Public | — |
| GET | `/v1/pairing/challenge` | Public | — |
| POST | `/v1/pairing/exchange` | Public | Strict rate limiter |

### L. System & Maintenance (`/api/system/*`)
| Method | Path | Auth | Permission |
|--------|------|------|-----------|
| GET | `/health`, `/ip`, `/kiosk-sessions` | Auth | — |
| POST | `/maintenance/cleanup`, `/vacuum` | Auth | `system:admin` + rate limit |
| POST | `/maintenance/backup`, `/reset` | Auth | `system:admin` + rate limit |
| GET | `/maintenance/logs`, `/db-stats`, `/backups` | Auth | — |
| POST | `/ops/data/refresh` | Auth | Rate limiter |
| GET/POST | `/ops/settings/:namespace` | Auth | `settings:edit` |
| POST | `/ops/erase-customer-data` | Auth | `system:admin` |

---

## Touch Kiosk IPC Channels

### Exposed via `window.electron` (preload.ts)
- `exitKiosk(password)`, `enterKiosk()`, `getAppVersion()`, `restartApp()`
- `kiosk.authenticate(password)`, `kiosk.unlock(pin)`, `kiosk.lock()`
- `printing.getPrinters()`, `printing.print(options)`
- `updater.check()`, `.download()`, `.install()`, `.getStatus()`
- Status listeners: `onChecking`, `onAvailable`, `onNotAvailable`, `onProgress`, `onDownloaded`, `onError`

### Main Process IPC Handlers
- Kiosk: `exit-kiosk`, `enter-kiosk`, `kiosk:authenticate`, `kiosk:unlock`, `kiosk:lock`
- Printing: `printing:getPrinters`, `printing:print`
- Updater: `updater:check`, `updater:download`, `updater:install`, `updater:status`

---

## Gallery API Call Patterns

### Base URL
Configured via `import.meta.env.VITE_API_URL` or `CLOUD_API_URL` (`https://management-hub.clickflash-office.workers.dev`)

### Service Endpoints
- `cloudApiService.ts`: `/api/gallery-auth/login`, `/api/photos`, `/api/qr/validate`, `/api/checkout/sessions/:sessionId`
- `moneytrashService.ts`: `/api/galleries/:code`, `/api/gallery-checkout`, `/api/gallery-checkout/sessions/:sessionId`
- `useCartSync.ts`: `/api/cart/snapshot`, `/api/cart/recovered`

---

## Security Summary Matrix

| Domain | Base Path | Auth | Key Protection |
|--------|-----------|------|---------------|
| Auth & Sessions | `/api/auth` | Mixed | Rate limiting for login |
| Albums | `/api/collections/albums` | Authenticated | RBAC permissions |
| Photos | `/api/collections/photos` | Authenticated | RBAC permissions |
| Orders | `/api/orders` | Authenticated | Rate limiting |
| Face Search | `/api/faces` | Authenticated | RBAC + rate limiting |
| Cloud Sync | `/api/cloud` | Authenticated | Rate limiting |
| Analytics | `/api/analytics` | Authenticated | `analytics:view` |
| System | `/api/system/*` | Authenticated | `system:admin` |
| Pairing | `/api/pairing` | Public | Setup-only |
| Mobile Capture | `/api/v1/mobile-capture` | HMAC | Route-level signatures |
| Gallery | `/api/gallery-*` | Token | Magic-link auth |
