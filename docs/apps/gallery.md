# Forensic Architecture Report: `apps/gallery/` — Customer Gallery Portal

> Generated: 2026-06-22 | Scope: React 19 + Vite frontend, Cloudflare Worker backend, Stripe payments, R2/D1 storage

## 1. Overview & Stats

| Attribute | Value |
|-----------|-------|
| **App name** | `star-master-customer` (Customer Gallery Portal) |
| **Version** | 4.2.0 |
| **Frontend stack** | React 19.2, TypeScript 5.9, Vite 7.3, Tailwind CSS 3.4 |
| **Backend stack** | Cloudflare Worker (Wrangler 3.x), TypeScript, D1 (SQLite), R2 |
| **Deployment target** | Frontend -> Vercel/static; Backend -> Cloudflare Workers (`gallery-backend`) |
| **Package manager** | pnpm 10.28.2 |
| **TS/TSX files** | 287 |
| **Component files** | 223 |
| **Test files** | 11 |
| **Key dependencies** | `@stripe/react-stripe-js`, `@tanstack/react-query`, `zustand`, `dexie`, `jose`, `lucide-react`, `qrcode`, `react-window`, `zod` |

**Entry flow**: `src/main.tsx` -> `src/App.tsx` (`CustomerPortal`). Default `mode=customer` injected into URL. Supports magic-link, QR, PIN+email, and MoneyTrash-archive login.

## 2. Folder/File Tree

```
apps/gallery/
├── src/
│   ├── App.tsx                 # CustomerPortal shell
│   ├── main.tsx                # React root, QueryClient, providers
│   ├── components/
│   │   ├── customer/           # Gallery, cart, checkout, lightbox, share
│   │   ├── common/             # Modal, Spinner, Skeleton, Toast, OfflineScreen
│   │   ├── touch/              # Kiosk/touch UI
│   │   ├── management/         # Embedded mini-management views (legacy)
│   │   ├── settings/           # Kiosk/settings pages
│   │   ├── albums/             # Albums list/detail, tether import
│   │   ├── bookings/           # Booking calendar & editor
│   │   ├── orders/             # Orders board/list, receipt/print/lab-folder
│   │   ├── photos/             # Photo grid
│   │   ├── products/           # Stock/inputs/outputs/sales
│   │   ├── photographers/      # Income charts, objectives
│   │   ├── dashboard/          # Widgets
│   │   ├── modals/             # Entity editors
│   │   └── PortalSelectionScreen.tsx  # Legacy launchpad
│   ├── hooks/                  # useAlbums, useOrders, usePhotographers, useCartSync, etc.
│   ├── services/               # cloudApiService, apiService, stripeService, syncService, AI/face rec
│   ├── stores/                 # useCartStore (Zustand + persist)
│   ├── utils/                  # logger, imageUtils, galleryHelpers
│   ├── types.ts                # Domain types
│   └── constants.ts            # Timing, permissions
├── backend/
│   ├── src/server.ts           # ~1,471-line Cloudflare Worker router
│   ├── src/db.ts               # D1 wrapper
│   ├── src/photoProcessor.ts   # R2 upload/resize/watermark
│   ├── src/auth.ts / jwt.ts    # bcrypt + jose JWT
│   ├── src/loginRateLimiter.ts # Brute-force protection
│   ├── src/tenantIsolation.ts  # Desk scoping
│   ├── src/validation.ts       # Zod login schema
│   ├── src/services/r2SignedUrlService.ts
│   └── wrangler.toml
├── tests/e2e/customer-journey.spec.ts
└── package.json
```

## 3. Screens / Pages / Routes

### Frontend (conditional shell)
- `OfflineScreen` when offline
- Loading spinner while auth resolves
- `CustomerLogin` when unauthenticated
- `CustomerLayout` when authenticated

**Auth entry methods** (URL params, cleaned after success):
- `?token=<magic>` -> `/api/orders/by-token`
- `?token=<qr>&session=<id>` -> Touch API QR validation
- `?pin=<pin>&email=<email>` -> `/api/orders/by-credentials`

### Backend routes
- `GET /api/health`
- `POST /api/checkout` — Stripe Checkout (rate-limited)
- `POST /api/webhook` — Stripe webhook with idempotency
- `GET /api/moneytrash/gallery/:code`
- `GET /api/website/portfolio`
- `POST /api/website/access-code`
- `POST /api/cart/snapshot`
- `GET /api/files/:id/:filename` — R2 signed URLs
- `GET /api/orders/by-credentials|by-token|by-room`
- Generic CRUD `/api/:collection`

## 4. UI Component Inventory

### Customer components
`CustomerLayout`, `CustomerGallery`, `CustomerSettings`, `FavoritesPage`, `StorePage`, `CheckoutScreen`, `PaymentForm`, `OrderStatusPage`, `DownloadPage`, `EnhancedLightbox`, `PhotoCard`, `PhotoMetadata`, `ShareModal`, `ProofingModal`, `AddToCartModal`, `MoneyTrashGallery`, `MoneyTrashBadge`.

### Common primitives
`Modal`, `ConfirmationModal`, `Toast`, `Spinner`, `Skeleton`, `AccessDenied`, `ErrorBoundary`, `VirtualGrid`, `VirtualList`, `NetworkStatusProvider`, `OfflineScreen`, `SyncStatusIndicator`.

### Touch/kiosk
`WelcomeScreen`, `AttractScreen`, `BookingScreen`, `PhotoSelectionScreen`, `OrderConfigurationScreen`, `CheckoutScreen`, `OnScreenKeyboard`, `NumericKeypad`, `FaceSearchModal`, `PairingCodeModal`, `KioskSettingsModal`.

### Modals/editors
`PhotoEditModal`, `AlbumPhotosModal`, `CreateAlbumModal`, `ImportAlbumModal`, `ClientDetailsModal`, `OrderEditModal`, `ProductEditModal`, `PackEditModal`, `UserEditModal`, `KioskEditModal`, `SessionTypeEditModal`, `CategoryEditModal`, `TransferCategoryModal`.

### States
- Loading: `Spinner` / `Skeleton`
- Empty: inline messages
- Error: `ErrorBoundary`, `AccessDenied`
- Offline: full-screen `OfflineScreen`

### ARIA / responsive / keyboard
- Dark mode via `ThemeContext`
- Touch targets sized for kiosk
- Lightbox likely supports arrow keys
- Skip link absent

## 5. Features & User Journeys

1. **Customer purchase**: login -> browse -> favorite -> add products -> Stripe checkout -> download
2. **MoneyTrash archive**: access code -> browse discounted archive -> purchase
3. **Kiosk self-service**: welcome -> room/QR -> browse -> configure order -> pay
4. **Favorites/proofing**: select favorites -> share to photographer

### Sub-features
- Zustand-persisted cart + abandoned-cart snapshot
- Stripe Checkout + webhook fulfillment (server-side price verification)
- R2 signed-URL downloads
- Face search, AI ideas/search
- Offline gate (`navigator.onLine`)
- Service worker asset caching

## 6. State Management

| Layer | Tech | Usage |
|-------|------|-------|
| Server cache | `@tanstack/react-query` | Configured; data fetching wrapped in services |
| Global client | Zustand + persist | `useCartStore` |
| Context | React Context | `ThemeContext`, `CurrencyContext`, `NetworkStatusProvider`, `BulkSelectionProvider` |
| Persistence | `localStorage` | Cart, theme, branding, kiosk settings |
| Local DB | Dexie | Offline/cache DB |

## 7. API / Backend

**Worker**: `gallery-backend`.

**Bindings**: `GALLERY_DB`, `WEBSITE_DB`, `GALLERY_BUCKET`.

**Secrets**: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `RESEND_API_KEY`, `SENTRY_DSN`.

**Integrations**: Stripe Checkout + webhook, Resend email, local Touch API QR validation, website portfolio/access-code endpoints.

**Security**: exact-origin CORS, geo-restriction, per-IP rate limiting, JWT auth, tenant isolation.

## 8. Database

### gallery DB

Key tables (from migrations):
- `albums`, `album_photos`, `photos`
- `orders`, `order_items`
- `products`, `packs`, `pack_items`
- `carts`, `cart_items`, `favorites`
- `customers`, `guests`, `photographers`
- `touch_devices`, `touch_sessions`
- `events`, `sessions`, `session_types`
- `categories`, `transfers`, `transfer_categories`
- `settings`, `webhook_events`, `email_logs`

### website DB

Tables related to portfolio and access codes, e.g. `portfolio_items`, `access_codes`, `settings`.

### Migrations

Located in `apps/gallery/backend/migrations/`, ordered numerically (e.g. `0001_initial.sql`, `0002_add_photos.sql` ... `0011_alter_orders_add_settings.sql`).

## 9. Security Surface

| Area | Status | Notes |
|------|--------|-------|
| CORS | exact origin | fail-closed but no `Access-Control-Allow-Credentials` explicit confirmation |
| Auth | JWT | signed, expires likely 1y for stations |
| Rate limiting | IP-based | enabled on checkout and webhooks |
| Stripe | server price verification | prices fetched from DB before session creation |
| Webhook idempotency | UNIQUE on `stripe_event_id` | safe against replay |
| R2 | signed URLs | time-bounded |
| Geo | optional env flag | restricts to Morocco/Tunisia/France/US |
| XSS | relies on React | no explicit CSP in static index |
| Input validation | Zod schemas | present in `validation` package |
| SQL injection | not applicable | D1 via parameterized queries |

## 10. Testing

- `apps/gallery/src/**/*.test.{ts,tsx}` — 11 test files (~50 tests)
- `gallery.spec.ts` E2E covering customer purchase and admin album flow
- Vitest config present; mocks for services and MSW-like handlers

### Observed gaps
- No backend worker unit tests
- Limited offline behaviour tests
- No visual regression suite

## 11. Architecture / Performance / Design System

- **Monorepo package** `@clickflash/ui` is intended for shared components; `gallery` may still have local duplicates
- **Build**: Vite; very fast HMR
- **Bundle risks**: full `recharts` and `lucide-react` import if not tree-shaken; large photo assets
- **Performance**: virtualized grid, lazy routes, `React.lazy`, image skeletons
- **Design system**: Tailwind; CSS variables for brand colors
- **PWA / offline**: service worker registered; Dexie for cache; offline screen blocks usage

## 12. Concrete Improvement Proposals

1. **Add strict frontend Content-Security-Policy** in `index.html` meta tag to mitigate XSS.
2. **Refactor shared components** into `@clickflash/ui` to reduce gallery/management duplication.
3. **Replace broad `any` types** in `services/` and `utils/` with generated D1 row types.
4. **Tree-shake icon imports** from `lucide-react` (named imports only).
5. **Add backend Vitest suite** for worker routes using Miniflare.
6. **Standardize CORS headers** across apps in a shared middleware.
7. **Instrument web-vitals** and add budget checks in CI for bundle size.
