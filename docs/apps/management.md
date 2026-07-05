# Forensic Architecture Report: `apps/management/` — Management Hub

> Generated: 2026-06-22 | Scope: Vite + React 19 SPA (basename `/manage`), Cloudflare Worker backend, D1/R2, JWT auth

## 1. Overview & Stats

| Attribute | Value |
|-----------|-------|
| **App name** | `clickflash-management-hub` |
| **Version** | 4.2.0 |
| **Frontend stack** | React 19.2, TypeScript 5.9, Vite 7.3, Tailwind CSS 3.4, Recharts |
| **Backend stack** | Cloudflare Worker (Wrangler 3.x), D1 (SQLite), R2 |
| **Deployment target** | Frontend -> Cloudflare Pages / Vercel with `/manage` path; Backend -> Cloudflare Workers (`management-backend`) |
| **Package manager** | pnpm 10.28.2 |
| **TS/TSX files** | 281 |
| **Component files** | 175 |
| **Test files** | 16 |
| **Key dependencies** | `@tanstack/react-query`, `recharts`, `lucide-react`, `zod`, `jose`, `date-fns`, `bcryptjs`, `@clickflash/logger`, `@clickflash/types`, `@clickflash/ui` |

**Entry flow**: `src/main.tsx` mounts `<BrowserRouter basename="/manage"><App /></BrowserRouter>`. `App.tsx` is a shell with sidebar navigation, auth gate, and page routing. Authentication is desk-based: a workstation is provisioned via a provisioning secret and bound to a `machine_id`, then JWT tokens are issued.

## 2. Folder/File Tree

```
apps/management/
├── src/
│   ├── App.tsx                 # Shell: auth gate, sidebar, page routing
│   ├── main.tsx                # React root with basename /manage
│   ├── components/
│   │   ├── layout/             # Sidebar, TopBar, PageWrapper
│   │   ├── dashboard/          # Executive dashboard widgets
│   │   ├── fleet/              # Multi-master / station monitor
│   │   ├── orders/             # Orders board, timeline, detail
│   │   ├── finance/            # Invoices, expenses, payroll, treasury
│   │   ├── hr/                 # Employees, attendance, payroll items
│   │   ├── inventory/          # Stock, suppliers, transfers
│   │   ├── analytics/          # Charts, reports, AI chatbot
│   │   ├── settings/           # Studio, users, roles, integrations
│   │   ├── auth/               # Login, register desk, OAuth device flow
│   │   ├── common/             # Modal, Table, Toast, Spinner
│   │   └── modals/             # Entity editors (users, roles, etc.)
│   ├── hooks/                  # useAuth, useOrders, useFleet, useAnalytics
│   ├── services/               # apiService, cloudApiService, authService
│   ├── stores/                 # small Zustand slices
│   ├── utils/                  # logger, permissions, formatting
│   ├── types.ts                # Domain types
│   └── constants.ts            # Navigation, permissions
├── backend/
│   ├── src/
│   │   └── server.ts           # Worker router
│   ├── migrations/             # D1 schema migrations
│   ├── wrangler.toml           # D1 / R2 bindings
│   └── package.json
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

## 3. Screens / Pages / Routes

### Frontend (basename `/manage`)
- `/` — Executive dashboard
- `/orders` — Orders board
- `/fleet` — Station/fleet monitor
- `/finance` — Finance hub
- `/inventory` — Inventory
- `/hr` — HR / payroll
- `/analytics` — Reports + AI chatbot
- `/settings` — Studio settings, users, roles
- `/login`, `/register-desk` — Auth flows

### Backend routes
- `GET /api/health`
- `POST /api/auth/register-desk` — Provisioning + hardware binding
- `POST /api/auth/login` — bcrypt + hardware lock
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/oauth/device/code` — OAuth device-code start
- `POST /api/auth/oauth/device/token` — OAuth device-code poll
- `GET /api/auth/me`
- Generic `/api/:collection` CRUD for most entities
- Analytics aggregation endpoints

## 4. UI Component Inventory

### Layout / shell
`Sidebar`, `TopBar`, `PageWrapper`, `ProtectedRoute`, `AuthLayout`.

### Dashboard / analytics
`DashboardPage`, `StatCards`, `RevenueChart`, `OrderVolumeChart`, `AiChatbotPanel`.

### Fleet / orders
`FleetPage`, `StationCard`, `StationStatusBadge`, `OrdersBoard`, `OrderTimeline`, `OrderDetailModal`.

### Finance / HR
`FinancePage`, `InvoiceList`, `ExpenseForm`, `PayrollTable`, `EmployeeCard`, `AttendanceCalendar`.

### Inventory / settings
`InventoryPage`, `StockTable`, `TransferModal`, `SettingsPage`, `UserManagement`, `RoleEditor`, `StudioSettingsForm`.

### Common / feedback
`Modal`, `Toast`, `Spinner`, `DataTable`, `DateRangePicker`, `ConfirmationDialog`, `ErrorBoundary`.

### States
- Loading: `Spinner`, skeleton table rows
- Empty: empty-state illustrations
- Error: `ErrorBoundary`, toast notifications
- Auth failure: redirected to `/manage/login`

## 5. Features & User Journeys

1. **Desk provisioning**: install wizard opens -> registers `machine_id` with provisioning secret -> auto-login
2. **Daily login**: user opens `/manage` -> JWT validation -> dashboard
3. **Order management**: view board -> filter/status change -> print receipt / lab folder
4. **Fleet monitor**: list all master/touch stations -> view health/status/version
5. **Payroll**: attendance -> generate payroll -> export
6. **AI chatbot**: ask natural-language questions over analytics data

### Sub-features
- Role-based access control (RBAC)
- Multi-currency / multi-studio settings
- Dark mode
- CSV/PDF export
- Real-time-ish status via polling

## 6. State Management

| Layer | Tech | Usage |
|-------|------|-------|
| Server cache | `@tanstack/react-query` | Orders, fleet, analytics, finance data |
| Global client | Zustand | Auth state, sidebar, notifications |
| Context | React Context | Theme, currency, RBAC permissions |
| Persistence | `localStorage` | Theme, collapsed sidebar, auth tokens |

## 7. API / Backend

**Worker**: `management-backend`.

**Bindings**: `DB` (D1), `GALLERY_BUCKET` (R2), optional KV/cache.

**Secrets**: `JWT_SECRET`, `PROVISIONING_SECRET`, `ALLOWED_ORIGINS`, `RESEND_API_KEY`, `GOOGLE_API_KEY`, optional `SENTRY_DSN`.

**Integrations**: Resend email, Google APIs (maps/calendar), OAuth device-code flow, generic CRUD engine.

**Security**: exact-origin CORS, bcrypt password hashing, login rate limiting, hardware/machine_id binding, JWT auth.

## 8. Database

Key D1 tables (from migrations):
- `users`, `roles`, `permissions`
- `desks` / `stations` (hardware binding)
- `orders`, `order_items`, `invoices`, `payments`
- `employees`, `attendance`, `payrolls`, `payroll_items`
- `expenses`, `treasury`, `accounts`
- `inventory`, `suppliers`, `transfers`
- `analytics_events`, `sync_logs`
- `settings`, `studios`

### Migrations

`apps/management/backend/migrations/` contains numbered SQL migrations.

## 9. Security Surface

| Area | Status | Notes |
|------|--------|-------|
| CORS | exact origin | similar to gallery |
| Auth | JWT + bcrypt | 1-year station tokens observed in sibling app |
| Hardware lock | `machine_id` | desk login enforces hardware binding |
| Provisioning | `PROVISIONING_SECRET` | prevents rogue desk registration |
| Rate limiting | IP + username | login attempts throttled |
| RBAC | present | roles/permissions tables |
| Input validation | Zod | shared `validation` package |
| SQL injection | mitigated | D1 parameterized |
| Secrets | env bindings | good for Worker |

## 10. Testing

- `apps/management/src/**/*.test.{ts,tsx}` — 16 unit tests
- `management.spec.ts` E2E covering login and dashboard
- Vitest + React Testing Library

### Observed gaps
- Backend worker tests absent
- RBAC matrix not exhaustively tested
- No fleet-status contract tests

## 11. Architecture / Performance / Design System

- **Shared packages**: imports `@clickflash/logger`, `@clickflash/types`, `@clickflash/ui`
- **Bundle risks**: `recharts` full import; large icon imports
- **Performance**: polling for fleet/analytics; no WebSocket
- **Design system**: Tailwind; shared CSS variables; dark mode class
- **Routing**: React Router with basename

## 12. Concrete Improvement Proposals

1. **Add backend test harness** (Miniflare) for `server.ts`.
2. **Replace `recharts` full import** with tree-shaken submodules or `@clickflash/ui` chart wrapper.
3. **Add RBAC enforcement middleware** and audit log table.
4. **Introduce WebSocket / Durable Object** for real-time fleet status instead of polling.
5. **Standardize date/currency formatting** through a shared hook in `@clickflash/ui`.
6. **Move generic CRUD engine** into a shared package to avoid duplication with gallery backend.
