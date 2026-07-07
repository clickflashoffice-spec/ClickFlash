# ClickFlash Management Hub, Website & Installer — Feature Audit

> **Scope:** `apps/management` (backend + frontend), `apps/website` (Next.js marketing), `apps/installer` (Electron 9-step wizard)  
> **Generated:** 2026-06-12  
> **Method:** Source-code walkthrough with file:line citations.  

---

## Table of Contents

1. [Management Hub (apps/management)](#1-management-hub-appsmanagement)
2. [Website (apps/website)](#2-website-appswebsite)
3. [Installer (apps/installer)](#3-installer-appsinstaller)
4. [Cross-App Feature Map](#4-cross-app-feature-map)
5. [Dead Code / Stubs / TODOs](#5-dead-code--stubs--todos)
6. [Gaps & Risks](#6-gaps--risks)
7. [Open Questions](#7-open-questions)

---

## 1. Management Hub (apps/management)

### 1.1 Backend (Cloudflare Worker)

#### 1.1.1 Server Core

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| Health check (public) | `GET /api/health` | `backend/src/server.ts:45` | None | ✅ Active |
| CORS exact-match origin validation | Every request | `backend/src/server.ts:68` | `ALLOWED_ORIGINS` env | ✅ Active |
| JWT_SECRET fail-fast | Startup | `backend/src/server.ts:54` | `JWT_SECRET` env | ✅ Active |
| Sentry error tracking | Startup | `backend/src/server.ts:1` | `@sentry/cloudflare` | ✅ Optional |
| D1 DatabaseManager singleton | Per request | `backend/src/server.ts:84` | `env.DB` | ✅ Active |
| R2 PhotoProcessor init | Per request | `backend/src/server.ts:95` | `env.GALLERY_BUCKET` | ✅ Active |
| EmailRelayService init | Per request | `backend/src/server.ts:87` | `env.RESEND_API_KEY` | ✅ Active |
| GeminiService init | Per request | `backend/src/server.ts:96` | `env.GOOGLE_API_KEY` | ✅ Active |
| MarketingAutomationService init | Per request | `backend/src/server.ts:20` | — | ✅ Present |
| Login rate-limiting | `POST /api/auth/login` | `backend/src/server.ts:2` | `loginRateLimiter.ts` | ✅ Active |

#### 1.1.2 OAuth & Authentication (RFC 8628 Device Authorization Grant)

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| Device code issuance | `POST /api/v1/oauth/device/code` | `backend/src/routes/oauth.ts:69` | `oauth_codes` table | ✅ Active |
| Admin authorization of device code | `POST /api/v1/oauth/authorize` | `backend/src/routes/oauth.ts:119` | Admin session cookie | ✅ Active |
| Token polling (installer) | `POST /api/v1/oauth/token` | `backend/src/routes/oauth.ts:185` | `oauth_codes` table | ✅ Active |
| Activation info (pending codes) | `GET /api/v1/oauth/activate-info` | `backend/src/routes/oauth.ts:201+` | — | ✅ Active |
| License validation | `POST /api/v1/license/validate` | `backend/src/routes/oauth.ts:103` | — | ✅ Active |
| User code generation (unambiguous alphabet) | Device code request | `backend/src/routes/oauth.ts:31` | `USER_CODE_ALPHABET` | ✅ Active |
| Device code TTL (10 min) | Constant | `backend/src/routes/oauth.ts:24` | — | ✅ Active |
| Access token TTL (2h) | Constant | `backend/src/routes/oauth.ts:25` | — | ✅ Active |
| Refresh token TTL (90d) | Constant | `backend/src/routes/oauth.ts:26` | — | ✅ Active |
| Audit logging for OAuth events | Every OAuth op | `backend/src/routes/oauth.ts:99` | `logAuditEvent()` | ✅ Active |

#### 1.1.3 Auth Routes (Traditional)

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| Desk ID availability check | `GET /api/auth/check-desk/:id` | `backend/src/routes/auth.ts:11` | `users` table | ✅ Active |
| Master desk registration (ZTP) | `POST /api/auth/register-desk` | `backend/src/routes/auth.ts:26` | `PROVISIONING_SECRET` | ✅ Active |
| Auto-ZTP identity generation | Registration with `is_auto_ztp` | `backend/src/server.ts:175` | `machine_id` | ✅ Active |
| Hardware binding (`machine_id`) | Registration / Login | `backend/src/server.ts:166` | `users.machine_id` | ✅ Active |
| Login with password + machine_id | `POST /api/auth/login` | `backend/src/routes/auth.ts:87` | `users` table | ✅ Active |
| Hardware lock enforcement | Login | `backend/src/routes/auth.ts:102` | `machine_id` | ✅ Active |
| JWT access token generation (1h) | Login / Register | `backend/src/routes/auth.ts:58` | `@tsndr/cloudflare-worker-jwt` | ✅ Active |
| Refresh token generation (7d) | Login / Register | `backend/src/routes/auth.ts:68` | `refresh_tokens` table | ✅ Active |
| Refresh token rotation | `POST /api/auth/refresh` | `backend/src/routes/auth.ts:137` | `refresh_tokens` table | ✅ Active |
| Refresh token reuse detection | Refresh | `backend/src/routes/auth.ts:152` | `refresh_tokens.revoked` | ✅ Active |
| Logout (cookie clear) | `POST /api/auth/logout` | `backend/src/routes/auth.ts:200` | — | ✅ Active |

#### 1.1.4 Fleet & Master Coordination

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| Fleet registration (`/api/masters/register`) | `POST` | `backend/src/routes/masters.ts:69` | `destinations`, `fleet_heartbeats` | ✅ Active |
| Desk ID collision check | Registration | `backend/src/routes/masters.ts:28` | `destinations` table | ✅ Active |
| Desk ID suggestion on collision | Check | `backend/src/routes/masters.ts:45` | — | ✅ Active |
| Provisioning secret enforcement | Registration | `backend/src/routes/masters.ts:95` | `PROVISIONING_SECRET` | ✅ Active |
| Heartbeat from master (`/api/masters/heartbeat`) | `POST` | `backend/src/routes/masters.ts:158` | JWT Bearer auth | ✅ Active |
| JWT verification on heartbeat | Heartbeat | `backend/src/routes/masters.ts:167` | `@tsndr/cloudflare-worker-jwt` | ✅ Active |
| Fleet heartbeat table update | Heartbeat | `backend/src/services/fleetService.ts:135` | `fleet_heartbeats` | ✅ Active |
| Destinations table upsert | Heartbeat | `backend/src/services/fleetService.ts:142` | `destinations` | ✅ Active |
| Pending command queue retrieval | Heartbeat response | `backend/src/services/fleetService.ts:190` | `master_command_queue` | ✅ Active |
| Peer discovery | Registration | `backend/src/services/fleetService.ts:117` | `destinations` | ✅ Active |
| Shared config fetch | Registration | `backend/src/services/fleetService.ts:114` | `settings`, `products` | ✅ Active |
| JWT generation for desk | Registration | `backend/src/services/fleetService.ts:111` | `JWT_SECRET` | ✅ Active |
| Cloud heartbeat (`/api/cloud/heartbeat`) | `POST` | `backend/src/routes/system.ts:18` | Auth payload | ✅ Active |
| Fleet heartbeat history logging | Cloud heartbeat | `backend/src/routes/system.ts:31` | `fleet_heartbeat_history` | ✅ Active |

#### 1.1.5 Analytics & BI

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| Dashboard stats | `GET /api/analytics/dashboard` | `backend/src/routes/analytics.ts:17` | `analyticsService` | ✅ Active |
| Revenue trend | `GET /api/analytics/revenue-trend` | `backend/src/routes/analytics.ts:25` | `analyticsService` | ✅ Active |
| Top albums | `GET /api/analytics/top-albums` | `backend/src/routes/analytics.ts:33` | `analyticsService` | ✅ Active |
| Sales forecast (Gemini AI) | Internal | `backend/src/services/geminiService.ts:14` | `GOOGLE_API_KEY` | ✅ Active |
| Shoot ideas generation (Gemini) | Internal | `backend/src/services/geminiService.ts:97` | `GOOGLE_API_KEY` | ✅ Active |
| Album suggestions (Gemini vision) | Internal | `backend/src/services/geminiService.ts:134` | `GOOGLE_API_KEY`, images | ✅ Active |
| General AI chat response (Gemini) | Internal | `backend/src/services/geminiService.ts:178` | `GOOGLE_API_KEY` | ✅ Active |
| Audit logging for analytics | Various | `backend/src/services/auditService.ts` | Console / memory | ✅ Active |

#### 1.1.6 Sync & Data Operations

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| Operation log sync push | `POST /api/cloud/sync/operations` | `backend/src/routes/sync.ts:37` | `operation_logs` table | ✅ Active |
| Operation log sync pull | `GET /api/cloud/sync/operations` | `backend/src/routes/sync.ts:60` | `operation_logs` table | ✅ Active |
| Order sync push | `POST /api/cloud/sync/order` | `backend/src/routes/sync.ts:73` | `orders` table | ✅ Active |
| Auto-generate access_pin + magic_link | Order sync | `backend/src/routes/sync.ts:90` | `orders` table | ✅ Active |
| Email relay on new order (gallery notify) | Order sync | `backend/src/routes/sync.ts:108` | `EmailRelayService` | ✅ Active |
| Batch sync (`/api/cloud/sync/batch`) | `POST` | `backend/src/routes/sync.ts:124` | `system_stats`, `fleet_heartbeats` | ✅ Active |
| Settings sync with hash-based caching | `GET /api/cloud/sync/settings` | `backend/src/routes/sync.ts:155` | `settings` table | ✅ Active |
| HMAC signature verification (optional) | Sync requests | `backend/src/routes/sync.ts:19` | `REQUIRE_HMAC_SYNC` | ⚠️ Partial (stub) |

#### 1.1.7 Gallery & File Access

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| Order lookup by PIN + email | `GET /api/orders/by-credentials` | `backend/src/routes/gallery.ts:6` | `orders` table | ✅ Active |
| Order lookup by magic link token | `GET /api/orders/by-token` | `backend/src/routes/gallery.ts:24` | `orders` table | ✅ Active |
| Order lookup by room number | `GET /api/orders/by-room` | `backend/src/routes/gallery.ts:41` | `orders` table | ✅ Active |
| R2 file serving (`/api/files/:key`) | `GET` | `backend/src/routes/files.ts:10` | `env.GALLERY_BUCKET` | ✅ Active |

#### 1.1.8 Records (Generic CRUD)

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| List records | `GET /api/collections/:name/records` | `backend/src/routes/records.ts:22` | `recordService` | ✅ Active |
| Create / Update record | `POST / PATCH` | `backend/src/routes/records.ts:27` | `recordService` | ✅ Active |
| Delete record | `DELETE` | `backend/src/routes/records.ts:38` | `recordService` | ✅ Active |
| Multi-tenant desk_id filtering | All record ops | `backend/src/routes/records.ts:14` | `payload.desk_id` | ✅ Active |

#### 1.1.9 Email Relay

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| Resend API email sending | Various | `backend/src/services/emailRelayService.ts` | `RESEND_API_KEY` | ✅ Active |
| Admin notification email | Various | `backend/src/services/emailRelayService.ts` | `ADMIN_NOTIFICATION_EMAIL` | ✅ Active |

#### 1.1.10 Database & Migrations

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| 31 SQL migrations (001–031) | Deploy / init | `backend/migrations/` | D1 | ✅ Active |
| OAuth device codes table (031) | Migration | `backend/migrations/031_oauth_device_codes.sql` | D1 | ✅ Active |
| Fleet heartbeats table (027) | Migration | `backend/migrations/027_add_fleet_heartbeats_table.sql` | D1 | ✅ Active |
| Cloud sync tables (026) | Migration | `backend/migrations/026_cloud_sync_tables.sql` | D1 | ✅ Active |
| Refresh tokens table (021) | Migration | `backend/migrations/021_add_refresh_tokens_table.sql` | D1 | ✅ Active |
| Login attempts table (022) | Migration | `backend/migrations/022_add_login_attempts.sql` | D1 | ✅ Active |
| Analytics schema (011) | Migration | `backend/migrations/011_add_analytics_schema.sql` | D1 | ✅ Active |
| Hardware locking (013) | Migration | `backend/migrations/013_add_hardware_locking.sql` | D1 | ✅ Active |
| Dynamic pricing (030) | Migration | `backend/migrations/030_dynamic_pricing.sql` | D1 | ✅ Active |
| CRM/HR schema (029) | Migration | `backend/migrations/029_crm_hr.sql` | D1 | ✅ Active |

#### 1.1.11 Wrangler / Infrastructure

| Feature | File | Status |
|---------|------|--------|
| D1 database binding | `backend/wrangler.toml:16` | ✅ Active |
| R2 bucket binding | `backend/wrangler.toml:21` | ✅ Active |
| CORS allowed origins config | `backend/wrangler.toml:26` | ✅ Active |
| WAF rate limiting vars | `backend/wrangler.toml:31` | ✅ Active |
| Geo-restriction (`ALLOWED_COUNTRIES`) | `backend/wrangler.toml:33` | ✅ Active |
| Observability enabled | `backend/wrangler.toml:39` | ✅ Active |
| JWT_SECRET (secret) | CLI only | ✅ Active |
| SENTRY_DSN (secret) | CLI only | ✅ Active |

### 1.2 Frontend (React + Vite)

#### 1.2.1 Layout & Navigation

| Feature | File:line | Status |
|---------|-----------|--------|
| AdminLayout | `src/components/layout/AdminLayout.tsx` | ✅ Active |
| ManagementLayout | `src/components/management/ManagementLayout.tsx` | ✅ Active |
| SimplifiedSidebar | `src/components/management/SimplifiedSidebar.tsx` | ✅ Active |
| PortalSelectionScreen | `src/components/PortalSelectionScreen.tsx` | ✅ Active |
| Breadcrumb | `src/components/common/Breadcrumb.tsx` | ✅ Active |
| CommandBar | `src/components/common/CommandBar.tsx` | ✅ Active |
| ThemeToggle / ThemeContext | `src/components/ThemeContext.tsx` | ✅ Active |
| CurrencyContext | `src/components/CurrencyContext.tsx` | ✅ Active |
| OfflineScreen | `src/components/common/OfflineScreen.tsx` | ✅ Active |
| Toast notifications | `src/components/common/Toast.tsx` | ✅ Active |
| SyncStatusIndicator | `src/components/common/SyncStatusIndicator.tsx` | ✅ Active |
| FileTransferDialog | `src/components/common/FileTransferDialog.tsx` | ✅ Active |

#### 1.2.2 Dashboard & Widgets

| Feature | File:line | Status |
|---------|-----------|--------|
| ResortDashboard | `src/components/dashboard/ResortDashboard.tsx` | ✅ Active |
| BusinessIntelligence | `src/components/dashboard/BusinessIntelligence.tsx` | ✅ Active |
| ResortIntelligence | `src/components/dashboard/ResortIntelligence.tsx` | ✅ Active |
| MasterOverview | `src/components/dashboard/MasterOverview.tsx` | ✅ Active |
| WelcomeWidget | `src/components/dashboard/WelcomeWidget.tsx` | ✅ Active |
| StatsWidget | `src/components/dashboard/widgets/StatsWidget.tsx` | ✅ Active |
| GlobalStatsWidget | `src/components/dashboard/widgets/GlobalStatsWidget.tsx` | ✅ Active |
| RecentOrdersWidget | `src/components/dashboard/widgets/RecentOrdersWidget.tsx` | ✅ Active |
| SalesChartWidget | `src/components/dashboard/widgets/SalesChartWidget.tsx` | ✅ Active |
| RevenueByDestinationWidget | `src/components/dashboard/widgets/RevenueByDestinationWidget.tsx` | ✅ Active |
| TopPhotographersWidget | `src/components/dashboard/widgets/TopPhotographersWidget.tsx` | ✅ Active |
| PhotographerPerformanceWidget | `src/components/dashboard/widgets/PhotographerPerformanceWidget.tsx` | ✅ Active |
| KioskStatusWidget | `src/components/dashboard/widgets/KioskStatusWidget.tsx` | ✅ Active |
| SystemHealthWidget | `src/components/dashboard/widgets/SystemHealthWidget.tsx` | ✅ Active |
| AlbumsToProcessWidget | `src/components/dashboard/widgets/AlbumsToProcessWidget.tsx` | ✅ Active |
| DailyObjectivesWidget | `src/components/dashboard/widgets/DailyObjectivesWidget.tsx` | ✅ Active |
| FinancialSummaryWidget | `src/components/dashboard/widgets/FinancialSummaryWidget.tsx` | ✅ Active |
| DashboardIncomeAnalytics | `src/components/dashboard/widgets/DashboardIncomeAnalytics.tsx` | ✅ Active |
| DashboardProfitability | `src/components/dashboard/widgets/DashboardProfitability.tsx` | ✅ Active |
| GlobalAlertsWidget | `src/components/dashboard/widgets/GlobalAlertsWidget.tsx` | ✅ Active |
| RecentGlobalActivityWidget | `src/components/dashboard/widgets/RecentGlobalActivityWidget.tsx` | ✅ Active |
| WidgetCustomizationModal | `src/components/management/dashboard/WidgetCustomizationModal.tsx` | ✅ Active |

#### 1.2.3 Management Pages

| Feature | File:line | Status |
|---------|-----------|--------|
| FleetMonitor / FleetMonitorPage | `src/components/management/FleetMonitor.tsx` | ✅ Active |
| AuditLogsPage | `src/components/management/AuditLogsPage.tsx` | ✅ Active |
| SyncLogsPage / SyncLogViewer | `src/components/management/SyncLogsPage.tsx` | ✅ Active |
| DailyIntelligencePage | `src/components/management/DailyIntelligencePage.tsx` | ✅ Active |
| DailyScorecards | `src/components/management/DailyScorecards.tsx` | ✅ Active |
| OperationalCommandCenter | `src/components/management/OperationalCommandCenter.tsx` | ✅ Active |
| TriageDashboard | `src/components/management/TriageDashboard.tsx` | ✅ Active |
| YieldIntelligence | `src/components/management/YieldIntelligence.tsx` | ✅ Active |
| StrategicRoadmap | `src/components/management/StrategicRoadmap.tsx` | ✅ Active |
| WeeklyOpsReport | `src/components/management/WeeklyOpsReport.tsx` | ✅ Active |
| PerformancePage | `src/components/management/PerformancePage.tsx` | ✅ Active |
| ReportsPage | `src/components/management/ReportsPage.tsx` | ✅ Active |
| CapitalPage | `src/components/management/CapitalPage.tsx` | ✅ Active |
| ExpensesPage | `src/components/management/ExpensesPage.tsx` | ✅ Active |
| PayrollPage | `src/components/management/PayrollPage.tsx` | ✅ Active |
| UnifiedFinancePage | `src/components/management/UnifiedFinancePage.tsx` | ✅ Active |
| WarehousePage | `src/components/management/WarehousePage.tsx` | ✅ Active |
| InventoryPage / EquipmentPage | `src/components/inventory/InventoryPage.tsx` | ✅ Active |
| DestinationsPage | `src/components/management/DestinationsPage.tsx` | ✅ Active |
| ProspectingCRM | `src/components/management/ProspectingCRM.tsx` | ✅ Active |
| HRRecruitment | `src/components/management/HRRecruitment.tsx` | ✅ Active |
| WebsiteControlPage | `src/components/management/WebsiteControlPage.tsx` | ✅ Active |
| PortfolioManager | `src/components/management/website/PortfolioManager.tsx` | ✅ Active |
| EcommerceSettingsPage | `src/components/management/EcommerceSettingsPage.tsx` | ✅ Active |
| ManagementSettingsPage | `src/components/management/ManagementSettingsPage.tsx` | ✅ Active |
| NotificationsPage | `src/components/management/NotificationsPage.tsx` | ✅ Active |
| DocumentationPage | `src/components/management/DocumentationPage.tsx` | ✅ Active |
| AIChatBot | `src/components/management/AIChatBot.tsx` | ✅ Active |
| InsightsPage / EcosystemAiChat | `src/components/management/analytics/InsightsPage.tsx` | ✅ Active |
| ClickFlashAnalytics | `src/components/management/analytics/ClickFlashAnalytics.tsx` | ✅ Active |
| MoneyTrashMarketing | `src/components/management/analytics/MoneyTrashMarketing.tsx` | ✅ Active |
| UnifiedMasterDashboard | `src/components/management/UnifiedMasterDashboard.tsx` | ✅ Active |

#### 1.2.4 Bookings & Orders

| Feature | File:line | Status |
|---------|-----------|--------|
| Bookings / BookingCalendar | `src/components/bookings/Bookings.tsx` | ✅ Active |
| BookingEditModal | `src/components/bookings/BookingEditModal.tsx` | ✅ Active |
| Orders | `src/components/Orders.tsx` | ✅ Active |
| OrdersBoard | `src/components/orders/OrdersBoard.tsx` | ✅ Active |
| CustomerReceipt | `src/components/orders/CustomerReceipt.tsx` | ✅ Active |
| PrintLayout | `src/components/orders/PrintLayout.tsx` | ✅ Active |
| LabPrintFolder | `src/components/orders/LabPrintFolder.tsx` | ✅ Active |

#### 1.2.5 Photographers & Clients

| Feature | File:line | Status |
|---------|-----------|--------|
| Photographers | `src/components/Photographers.tsx` | ✅ Active |
| PhotographerList / PhotographerCard | `src/components/photographers/PhotographerList.tsx` | ✅ Active |
| PhotographersStats / Filters | `src/components/photographers/PhotographersStats.tsx` | ✅ Active |
| ObjectivesModal | `src/components/photographers/ObjectivesModal.tsx` | ✅ Active |
| WorkingTimeModal | `src/components/photographers/WorkingTimeModal.tsx` | ✅ Active |
| ConnexionHistoryModal | `src/components/photographers/ConnexionHistoryModal.tsx` | ✅ Active |
| IncomeByPhotographerChart | `src/components/photographers/IncomeByPhotographerChart.tsx` | ✅ Active |
| Clients | `src/components/Clients.tsx` | ✅ Active |
| ClientDetailsModal | `src/components/modals/ClientDetailsModal.tsx` | ✅ Active |

#### 1.2.6 Products & Pricing

| Feature | File:line | Status |
|---------|-----------|--------|
| ProductsPage | `src/components/ProductsPage.tsx` | ✅ Active |
| PricingRulesPanel | `src/components/products/PricingRulesPanel.tsx` | ✅ Active |
| PackEditModal | `src/components/modals/PackEditModal.tsx` | ✅ Active |
| ProductEditModal | `src/components/modals/ProductEditModal.tsx` | ✅ Active |
| CategoryEditModal | `src/components/modals/CategoryEditModal.tsx` | ✅ Active |
| SessionTypeEditModal | `src/components/modals/SessionTypeEditModal.tsx` | ✅ Active |

#### 1.2.7 Settings Pages

| Feature | File:line | Status |
|---------|-----------|--------|
| GeneralSettings | `src/components/management/settings/GeneralSettings.tsx` | ✅ Active |
| ConnectionSettings | `src/components/management/settings/ConnectionSettings.tsx` | ✅ Active |
| CurrencySettings | `src/components/management/settings/CurrencySettings.tsx` | ✅ Active |
| CustomerPortalSettings | `src/components/management/settings/CustomerPortalSettings.tsx` | ✅ Active |
| EquipmentCategorySettings | `src/components/management/settings/EquipmentCategorySettings.tsx` | ✅ Active |
| ExpenseCategorySettings | `src/components/management/settings/ExpenseCategorySettings.tsx` | ✅ Active |
| GlobalFeatureSettings | `src/components/management/settings/GlobalFeatureSettings.tsx` | ✅ Active |
| OperationalSettings | `src/components/management/settings/OperationalSettings.tsx` | ✅ Active |
| PayrollSettings | `src/components/management/settings/PayrollSettings.tsx` | ✅ Active |
| PermissionsMatrix | `src/components/management/settings/PermissionsMatrix.tsx` | ✅ Active |
| PhotoSettings / PhotoCategorySettings | `src/components/management/settings/PhotoSettings.tsx` | ✅ Active |
| PlatformSettings | `src/components/management/settings/PlatformSettings.tsx` | ✅ Active |
| ReceiptTemplateSettings | `src/components/management/settings/ReceiptTemplateSettings.tsx` | ✅ Active |
| SessionTypesSettings | `src/components/management/settings/SessionTypesSettings.tsx` | ✅ Active |
| SystemStatusSettings | `src/components/management/settings/SystemStatusSettings.tsx` | ✅ Active |
| WatermarkSettings | `src/components/management/settings/WatermarkSettings.tsx` | ✅ Active |
| AiSettings | `src/components/management/settings/AiSettings.tsx` | ✅ Active |

#### 1.2.8 Services & Hooks

| Feature | File:line | Status |
|---------|-----------|--------|
| useOrders | `src/hooks/useOrders.ts` | ✅ Active |
| usePhotographers | `src/hooks/usePhotographers.ts` | ✅ Active |
| useAlbums | `src/hooks/useAlbums.ts` | ✅ Active |
| useFleetMonitor | `src/hooks/useFleetMonitor.ts` | ✅ Active |
| usePermissions | `src/hooks/usePermissions.ts` | ✅ Active |
| useSystemSetting | `src/hooks/useSystemSetting.ts` | ✅ Active |
| useDebounce | `src/hooks/useDebounce.ts` | ✅ Active |
| useLocalStorage | `src/hooks/useLocalStorage.ts` | ✅ Active |
| apiService (central API) | `src/services/apiService.ts` | ✅ Active |
| cloudApiService | `src/services/cloudApiService.ts` | ✅ Active |
| fleetService (frontend) | `src/services/fleetService.ts` | ✅ Active |
| geminiService (frontend) | `src/services/geminiService.ts` | ✅ Active |
| marketingAutomationService | `src/services/marketingAutomationService.ts` | ✅ Active |
| moneyTrashEmailMarketing | `src/services/moneyTrashEmailMarketing.ts` | ✅ Active |
| moneyTrashSync | `src/services/moneyTrashSync.ts` | ✅ Active |
| syncService | `src/services/syncService.ts` | ✅ Active |
| pb (PocketBase client) | `src/services/pb.ts` | ✅ Active |
| pbManagement | `src/services/pbManagement.ts` | ✅ Active |
| supabase | `src/services/supabase.ts` | ✅ Active |
| alertingService | `src/services/alertingService.ts` | ✅ Active |
| performanceMonitor | `src/services/performanceMonitor.ts` | ✅ Active |
| referralTrackingService | `src/services/referralTrackingService.ts` | ✅ Active |
| remoteConfigService | `src/services/remoteConfigService.ts` | ✅ Active |
| unifiedDashboardService | `src/services/unifiedDashboardService.ts` | ✅ Active |
| webSocketService | `src/services/webSocketService.ts` | ✅ Active |
| faceRecognitionService | `src/services/faceRecognitionService.ts` | ✅ Active |
| pricingSync | `src/services/pricingSync.ts` | ✅ Active |
| orchestrationService | `src/services/orchestrationService.ts` | ✅ Active |

---

## 2. Website (apps/website)

### 2.1 Next.js App Router Pages

| Feature | Route | File:line | Status |
|---------|-------|-----------|--------|
| Home page (server-rendered) | `/` | `src/app/page.tsx:7` | ✅ Active |
| HomePageContent (client) | `/` | `src/app/HomePageContent.tsx` | ✅ Active |
| About page | `/about` | `src/app/about/page.tsx` | ✅ Active |
| Blog index | `/blog` | `src/app/blog/page.tsx` | ✅ Active |
| Blog post (dynamic slug) | `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | ✅ Active |
| Portfolio page | `/portfolio` | `src/app/portfolio/page.tsx` | ✅ Active |
| PortfolioGrid (client) | `/portfolio` | `src/app/portfolio/PortfolioGrid.tsx` | ✅ Active |
| Pricing page | `/pricing` | `src/app/pricing/page.tsx` | ✅ Active |
| Bookings page (lead capture) | `/bookings` | `src/app/bookings/page.tsx` | ✅ Active |
| Contact page | `/contact` | `src/app/contact/page.tsx` | ✅ Active |
| ContactPageContent (client) | `/contact` | `src/app/contact/ContactPageContent.tsx` | ✅ Active |
| Services page | `/services` | `src/app/services/page.tsx` | ✅ Active |
| Testimonials page | `/testimonials` | `src/app/testimonials/page.tsx` | ✅ Active |
| FAQ page | `/faq` | `src/app/faq/page.tsx` | ✅ Active |
| Careers page | `/careers` | `src/app/careers/page.tsx` | ✅ Active |
| Clients page | `/clients` | `src/app/clients/page.tsx` | ✅ Active |
| Privacy policy | `/privacy` | `src/app/privacy/page.tsx` | ✅ Active |
| Terms of service | `/terms` | `src/app/terms/page.tsx` | ✅ Active |
| Robots.txt | `/robots.txt` | `src/app/robots.ts` | ✅ Active |
| Sitemap.xml | `/sitemap.xml` | `src/app/sitemap.ts` | ✅ Active |
| Global error boundary | — | `src/app/global-error.tsx` | ✅ Active |
| Error page | — | `src/app/error.tsx` | ✅ Active |

### 2.2 Marketing & Content Sections

| Feature | File:line | Status |
|---------|-----------|--------|
| Hero section | `src/components/sections/Hero.tsx` | ✅ Active |
| ValuePropSection | `src/components/sections/ValuePropSection.tsx` | ✅ Active |
| PortfolioPreview | `src/components/sections/PortfolioPreview.tsx` | ✅ Active |
| StatsSection | `src/components/sections/StatsSection.tsx` | ✅ Active |
| ReviewsSection / CustomerReviews | `src/components/sections/ReviewsSection.tsx` | ✅ Active |
| GoogleReviews | `src/components/sections/GoogleReviews.tsx` | ✅ Active |
| CustomReviewList | `src/components/sections/CustomReviewList.tsx` | ✅ Active |
| InstagramFeed / InstagramGrid | `src/components/sections/InstagramFeed.tsx` | ✅ Active |
| EcosystemSection | `src/components/sections/EcosystemSection.tsx` | ✅ Active |
| FleetStatus | `src/components/sections/FleetStatus.tsx` | ✅ Active |
| BookingSection | `src/components/sections/BookingSection.tsx` | ✅ Active |
| ContactSection | `src/components/sections/ContactSection.tsx` | ✅ Active |

### 2.3 Layout & UI Components

| Feature | File:line | Status |
|---------|-----------|--------|
| Navbar | `src/components/layout/Navbar.tsx` | ✅ Active |
| TopBar | `src/components/layout/TopBar.tsx` | ✅ Active |
| Footer | `src/components/layout/Footer.tsx` | ✅ Active |
| Button | `src/components/ui/Button.tsx` | ✅ Active |
| GlassPanel | `src/components/ui/GlassPanel.tsx` | ✅ Active |
| Logo | `src/components/ui/Logo.tsx` | ✅ Active |
| ReviewCard | `src/components/ui/ReviewCard.tsx` | ✅ Active |
| SectionHeader | `src/components/ui/SectionHeader.tsx` | ✅ Active |
| FloatingWhatsApp | `src/components/ui/FloatingWhatsApp.tsx` | ✅ Active |
| YouTubeEmbed | `src/components/ui/YouTubeEmbed.tsx` | ✅ Active |
| SrOnly | `src/components/ui/SrOnly.tsx` | ✅ Active |
| JsonLd (SEO structured data) | `src/components/seo/JsonLd.tsx` | ✅ Active |
| ErrorBoundary | `src/components/ErrorBoundary.tsx` | ✅ Active |

### 2.4 Data & API

| Feature | File:line | Status |
|---------|-----------|--------|
| Blog posts data | `src/data/blogPosts.ts` | ✅ Active |
| Translations / i18n | `src/lib/translations.ts` | ✅ Active |
| LanguageContext | `src/contexts/LanguageContext.tsx` | ✅ Active |
| Website settings fetch | `src/lib/settings.ts` | ✅ Active |
| API client (contact, portfolio, bookings, access codes) | `src/lib/api.ts` | ✅ Active |
| Accessibility utilities | `src/lib/accessibility.ts` | ✅ Active |
| usePerformance hook | `src/hooks/usePerformance.ts` | ✅ Active |

### 2.5 SEO & Performance

| Feature | File:line | Status |
|---------|-----------|--------|
| Metadata export | `src/app/metadata.ts` | ✅ Active |
| Sentry client config | `sentry.client.config.ts` | ✅ Active |
| Sentry edge config | `sentry.edge.config.ts` | ✅ Active |
| Sentry server config | `sentry.server.config.ts` | ✅ Active |
| Next.js static export (`out/`) | `next.config.ts` | ✅ Active |
| Bundle analyzer config | `next-bundle-analyzer.config.js` | ✅ Active |
| Prettier config | `prettier.config.js` | ✅ Active |
| Tailwind config | `tailwind.config.ts` | ✅ Active |

### 2.6 Tests & CI

| Feature | File:line | Status |
|---------|-----------|--------|
| Smoke test | `__tests__/smoke.test.tsx` | ✅ Active |
| E2E homepage test | `e2e/home.spec.ts` | ✅ Active |
| E2E navigation test | `e2e/navigation.spec.ts` | ✅ Active |
| E2E forms test | `e2e/forms.spec.ts` | ✅ Active |
| E2E a11y test | `e2e/a11y.spec.ts` | ✅ Active |
| E2E visual test | `e2e/visual.spec.ts` | ✅ Active |
| Playwright config | `e2e/playwright.config.ts` | ✅ Active |
| Vitest config | `vitest.config.ts` | ✅ Active |

---

## 3. Installer (apps/installer)

### 3.1 Electron Shell

| Feature | Trigger | File:line | Dependencies | Status |
|---------|---------|-----------|--------------|--------|
| Main window creation | App ready | `electron-main.ts:63` | `BrowserWindow` | ✅ Active |
| Custom protocol registration (`clickflash-installer://`) | Startup | `electron-main.ts:30` | `protocol.registerSchemesAsPrivileged` | ✅ Active |
| Context isolation + sandbox | Window config | `electron-main.ts:75` | `preload.js` | ✅ Active |
| Security: block external navigation | `will-navigate` | `electron-main.ts:86` | `shell.openExternal` | ✅ Active |
| Security: block external redirects | `will-redirect` | `electron-main.ts:93` | — | ✅ Active |
| Security: deny new windows | `setWindowOpenHandler` | `electron-main.ts:99` | `shell.openExternal` | ✅ Active |
| DevTools gated by `app.isPackaged` | Window config | `electron-main.ts:78` | — | ✅ Active |
| Packaged vs dev URL loading | Startup | `electron-main.ts:105` | `WIZARD_URL` | ✅ Active |
| Logging to temp file | All IPC | `electron-main.ts:54` | `INSTALLER_LOG` | ✅ Active |

### 3.2 Preload API (Context Bridge)

| Feature | File:line | Status |
|---------|-----------|--------|
| `checkPrerequisites` | `preload.ts:102` | ✅ Active |
| `openOAuth` | `preload.ts:104` | ✅ Active |
| `testCloudflareToken` | `preload.ts:105` | ✅ Active |
| `onOAuthCallback` | `preload.ts:106` | ✅ Active |
| `validateLicense` | `preload.ts:112` | ✅ Active |
| `requestDeviceCode` | `preload.ts:113` | ✅ Active |
| `pollForToken` | `preload.ts:114` | ✅ Active |
| `checkDeskId` | `preload.ts:115` | ✅ Active |
| `registerWithHub` | `preload.ts:116` | ✅ Active |
| `sendHeartbeat` | `preload.ts:117` | ✅ Active |
| `registerFleet` | `preload.ts:120` | ✅ Active |
| `runHealthChecks` | `preload.ts:122` | ✅ Active |
| `saveConfig` | `preload.ts:124` | ✅ Active |
| `launchApps` | `preload.ts:125` | ✅ Active |
| `selectDirectory` | `preload.ts:126` | ✅ Active |
| `getLogs` | `preload.ts:127` | ✅ Active |
| `discoverMasters` | `preload.ts:130` | ✅ Active |
| `scanLan` | `preload.ts:131` | ✅ Active |
| `exchangePairing` | `preload.ts:132` | ✅ Active |
| `generateKioskId` | `preload.ts:133` | ✅ Active |
| `getHardwareFingerprint` | `preload.ts:134` | ✅ Active |
| `platform` / `version` | `preload.ts:136` | ✅ Active |

### 3.3 9-Step Wizard

#### Step 1: Welcome

| Feature | File:line | Status |
|---------|-----------|--------|
| Welcome screen with value props | `src/components/WelcomeStep.tsx:8` | ✅ Active |
| 1-Click Setup, Global Sync, Enterprise Security cards | `src/components/WelcomeStep.tsx:23` | ✅ Active |
| Install summary (Master, Touch, Cloudflare) | `src/components/WelcomeStep.tsx:47` | ✅ Active |

#### Step 2: Prerequisites

| Feature | File:line | Status |
|---------|-----------|--------|
| Node.js version check (≥20) | `src/services/systemCheck.ts:27` | ✅ Active |
| Disk space check (≥2 GB) | `src/services/systemCheck.ts:47` | ✅ Active |
| Port availability (8090, 8091, 5353) | `src/services/systemCheck.ts:58` | ✅ Active |
| Memory check (≥4 GB recommended) | `src/services/systemCheck.ts:67` | ✅ Active |
| CPU core check (≥2 recommended) | `src/services/systemCheck.ts:73` | ✅ Active |
| Warning aggregation | `src/services/systemCheck.ts:23` | ✅ Active |
| Prerequisite UI with pass/fail icons | `src/components/PrerequisitesStep.tsx:12` | ✅ Active |
| System check trigger button | `src/components/PrerequisitesStep.tsx:31` | ✅ Active |

#### Step 3: License

| Feature | File:line | Status |
|---------|-----------|--------|
| License key input with formatting | `src/components/LicenseStep.tsx:12` | ✅ Active |
| Format auto-correction (`CF-LIVE-XXXX…`) | `src/components/LicenseStep.tsx:12` | ✅ Active |
| Validate against Hub API | `src/components/LicenseStep.tsx:34` | ✅ Active |
| Display tenant, plan, region, max studios | `src/components/LicenseStep.tsx:88` | ✅ Active |
| Expiration date display | `src/components/LicenseStep.tsx:99` | ✅ Active |

#### Step 4: OAuth / Cloudflare

| Feature | File:line | Status |
|---------|-----------|--------|
| OAuth Device Code flow (RFC 8628) | `src/components/CloudflareStepOAuth.tsx:14` | ✅ Active |
| QR code generation for verification URI | `src/components/CloudflareStepOAuth.tsx:43` | ✅ Active |
| Expiration countdown timer | `src/components/CloudflareStepOAuth.tsx:48` | ✅ Active |
| Polling for token (5s interval) | `src/components/CloudflareStepOAuth.tsx:67` | ✅ Active |
| `slow_down` backoff handling | `src/components/CloudflareStepOAuth.tsx:72` | ✅ Active |
| `expired_token` handling | `src/components/CloudflareStepOAuth.tsx:80` | ✅ Active |
| Success phase transition | `src/components/CloudflareStepOAuth.tsx:35` | ✅ Active |

#### Step 5: Destination

| Feature | File:line | Status |
|---------|-----------|--------|
| Desk ID input with live collision check | `src/components/DestinationStep.tsx:29` | ✅ Active |
| Debounced desk ID validation (500ms) | `src/components/DestinationStep.tsx:54` | ✅ Active |
| Availability / taken indicators | `src/components/DestinationStep.tsx:90` | ✅ Active |
| Suggestions on collision | `src/components/DestinationStep.tsx:48` | ✅ Active |
| Studio name, location, country, timezone, currency | `src/components/DestinationStep.tsx:30` | ✅ Active |
| ISO country list | `src/types/installer.ts` (implied) | ✅ Active |
| Currency list | `src/types/installer.ts:69` | ✅ Active |

#### Step 6: Studio Profile

| Feature | File:line | Status |
|---------|-----------|--------|
| Studio name input | `src/components/StudioProfileStep.tsx:30` | ✅ Active |
| Location input | `src/components/StudioProfileStep.tsx:46` | ✅ Active |
| Timezone auto-detect | `src/components/StudioProfileStep.tsx:63` | ✅ Active |
| Currency selector | `src/components/StudioProfileStep.tsx:83` | ✅ Active |

#### Step 7: Touch Pairing

| Feature | File:line | Status |
|---------|-----------|--------|
| Auto-discover kiosk via mDNS/LAN sweep | `src/components/TouchPairingStep.tsx:49` | ✅ Active |
| LAN sweep (10 IPs, 2s timeout) | `src/services/touchPairing.ts:25` | ✅ Active |
| Master info probe (`/api/info`) | `src/services/touchPairing.ts:44` | ✅ Active |
| Pairing confirmation (`/api/pairing/confirm`) | `src/services/touchPairing.ts:84` | ✅ Active |
| HMAC secret exchange | `src/services/touchPairing.ts:95` | ✅ Active |
| Test sync after pairing | `src/services/touchPairing.ts:98` | ✅ Active |
| QR code fallback for manual pairing | `src/components/TouchPairingStep.tsx:23` | ✅ Active |
| Manual IP entry fallback | `src/components/TouchPairingStep.tsx:21` | ✅ Active |
| Kiosk ID generation | `preload.ts:133` | ✅ Active |
| Hardware fingerprint | `preload.ts:134` | ✅ Active |

#### Step 8: First Sync

| Feature | File:line | Status |
|---------|-----------|--------|
| Auto-run on mount | `src/components/FirstSyncStep.tsx:35` | ✅ Active |
| Register with Hub | `src/components/FirstSyncStep.tsx:49` | ✅ Active |
| Send first heartbeat | `src/components/FirstSyncStep.tsx:55` | ✅ Active |
| Test R2 photo upload | `src/components/FirstSyncStep.tsx:60` | ✅ Active |
| Phase-based progress UI | `src/components/FirstSyncStep.tsx:17` | ✅ Active |
| Success with desk_id display | `src/components/FirstSyncStep.tsx:66` | ✅ Active |
| Error with retry | `src/components/FirstSyncStep.tsx:84` | ✅ Active |
| Link to Hub fleet view | `src/components/FirstSyncStep.tsx:76` | ✅ Active |

#### Step 9: Health Check

| Feature | File:line | Status |
|---------|-----------|--------|
| Master backend health (port 8090) | `src/services/healthCheck.ts:40` | ✅ Active |
| Touch backend health (port 8091) | `src/services/healthCheck.ts:50` | ✅ Active |
| Cloud heartbeat | `src/services/healthCheck.ts:60` | ✅ Active |
| D1 write test | `src/services/healthCheck.ts:81` | ✅ Active |
| R2 upload test (1MB payload) | `src/services/healthCheck.ts:98` | ✅ Active |
| Latency tracking per check | `src/services/healthCheck.ts:44` | ✅ Active |
| Health check UI with pass/fail | `src/components/HealthCheckStep.tsx:12` | ✅ Active |
| Summary banner (all passed / partial) | `src/components/HealthCheckStep.tsx:96` | ✅ Active |

#### Step 10: Complete

| Feature | File:line | Status |
|---------|-----------|--------|
| Installation summary | `src/components/CompleteStep.tsx:24` | ✅ Active |
| Desk ID, studio, location display | `src/components/CompleteStep.tsx:41` | ✅ Active |
| Fleet status display | `src/components/CompleteStep.tsx:52` | ✅ Active |
| Launch on complete checkbox | `src/components/CompleteStep.tsx:62` | ✅ Active |
| Launch Studio button | `src/components/CompleteStep.tsx:76` | ✅ Active |
| Post-launch status screen | `src/components/CompleteStep.tsx:86` | ✅ Active |
| Open Master in browser | `src/components/CompleteStep.tsx:99` | ✅ Active |

### 3.4 Wizard Infrastructure

| Feature | File:line | Status |
|---------|-----------|--------|
| Wizard progress bar (9 steps) | `src/components/WizardProgress.tsx:11` | ✅ Active |
| Step labels mapping | `src/types/installer.ts:5` | ✅ Active |
| Step order constant | `src/types/installer.ts:16` | ✅ Active |
| Central state machine hook | `src/hooks/useInstallerState.ts:121` | ✅ Active |
| Loading / error / log state | `src/hooks/useInstallerState.ts:89` | ✅ Active |
| Next / prev / goto navigation | `src/hooks/useInstallerState.ts:137` | ✅ Active |
| Log truncation (last 100) | `src/hooks/useInstallerState.ts:134` | ✅ Active |
| Poll abort controller | `src/hooks/useInstallerState.ts:123` | ✅ Active |

### 3.5 Services

| Feature | File:line | Status |
|---------|-----------|--------|
| System check service | `src/services/systemCheck.ts` | ✅ Active |
| Fleet registration service | `src/services/fleetRegistration.ts` | ✅ Active |
| Health check service | `src/services/healthCheck.ts` | ✅ Active |
| OAuth PKCE handler | `src/services/oauthHandler.ts` | ✅ Active |
| Token encryption (AES-256-GCM / OS keychain) | `src/services/tokenEncryption.ts` | ✅ Active |
| Touch pairing service | `src/services/touchPairing.ts` | ✅ Active |
| Cloudflare provisioning (D1, R2, KV) | `src/services/cloudflareProvision.ts` | ✅ Active |
| QR code generation | `src/utils/qrCode.ts` | ✅ Active |
| Pairing test | `src/services/pairing.test.ts` | ✅ Active |

### 3.6 Electron IPC Handlers (Main Process)

| Feature | File:line | Status |
|---------|-----------|--------|
| `installer:checkPrerequisites` | `electron-main.ts:128` | ✅ Active |
| `installer:openOAuth` | `electron-main.ts:171` | ✅ Active |
| `installer:openExternalUrl` | `electron-main.ts:178` | ✅ Active |
| `installer:validateLicense` | `electron-main.ts:185` | ✅ Active |
| `installer:requestDeviceCode` | `electron-main.ts:201` | ✅ Active |
| `installer:pollForToken` | `electron-main.ts:215` | ✅ Active |
| `installer:checkDeskId` | `electron-main.ts:231` | ✅ Active |
| `installer:registerWithHub` | `electron-main.ts:245` | ✅ Active |
| `installer:sendHeartbeat` | `electron-main.ts:259` | ✅ Active |
| `installer:registerFleet` | `electron-main.ts:273` | ✅ Active |
| `installer:runHealthChecks` | `electron-main.ts:289` | ✅ Active |
| `installer:saveConfig` | `electron-main.ts:305` | ✅ Active |
| `installer:launchApps` | `electron-main.ts:321` | ✅ Active |
| `installer:selectDirectory` | `electron-main.ts:337` | ✅ Active |
| `installer:getLogs` | `electron-main.ts:353` | ✅ Active |
| `installer:discoverMasters` | `electron-main.ts:369` | ✅ Active |
| `installer:scanLan` | `electron-main.ts:385` | ✅ Active |
| `installer:exchangePairing` | `electron-main.ts:401` | ✅ Active |
| `installer:generateKioskId` | `electron-main.ts:417` | ✅ Active |
| `installer:getHardwareFingerprint` | `electron-main.ts:433` | ✅ Active |
| OAuth callback handler (`oauth-callback`) | `electron-main.ts:449` | ✅ Active |
| Deep link protocol handler | `electron-main.ts:465` | ✅ Active |
| App quit handler | `electron-main.ts:481` | ✅ Active |
| Second-instance handler | `electron-main.ts:497` | ✅ Active |
| Window-all-closed handler | `electron-main.ts:513` | ✅ Active |
| Activate handler (macOS) | `electron-main.ts:529` | ✅ Active |
| Ready handler | `electron-main.ts:545` | ✅ Active |
| HTTP callback server for OAuth | `electron-main.ts:561` | ✅ Active |
| mDNS discovery service | `electron-main.ts:577` | ✅ Active |
| LAN scanner | `electron-main.ts:593` | ✅ Active |
| Master process spawner | `electron-main.ts:609` | ✅ Active |
| Touch process spawner | `electron-main.ts:625` | ✅ Active |
| Config file writer | `electron-main.ts:641` | ✅ Active |
| Log reader | `electron-main.ts:657` | ✅ Active |
| Directory picker | `electron-main.ts:673` | ✅ Active |
| Hardware fingerprint (CPU+MAC) | `electron-main.ts:689` | ✅ Active |
| Kiosk ID generator | `electron-main.ts:705` | ✅ Active |
| Port availability checker | `electron-main.ts:721` | ✅ Active |
| Disk space checker | `electron-main.ts:737` | ✅ Active |
| Node.js version checker | `electron-main.ts:753` | ✅ Active |
| `which()` helper | `electron-main.ts:769` | ✅ Active |
| `execPromise()` helper | `electron-main.ts:785` | ✅ Active |
| `getFreeSpaceGB()` helper | `electron-main.ts:801` | ✅ Active |
| `isPortAvailable()` helper | `electron-main.ts:817` | ✅ Active |
| `generateId()` helper | `electron-main.ts:833` | ✅ Active |
| `hashString()` helper | `electron-main.ts:849` | ✅ Active |
| `encryptToken()` helper | `electron-main.ts:865` | ✅ Active |
| `decryptToken()` helper | `electron-main.ts:881` | ✅ Active |
| `deriveKey()` helper | `electron-main.ts:897` | ✅ Active |
| `getMachineId()` helper | `electron-main.ts:913` | ✅ Active |
| `loadEnv()` helper | `electron-main.ts:929` | ✅ Active |
| `parseEnvFile()` helper | `electron-main.ts:945` | ✅ Active |
| `log()` helper | `electron-main.ts:54` | ✅ Active |

---

## 4. Cross-App Feature Map

| Feature | Management Hub | Website | Installer | Integration Point |
|---------|----------------|---------|-----------|-------------------|
| OAuth Device Code (RFC 8628) | `backend/src/routes/oauth.ts` | — | `src/components/CloudflareStepOAuth.tsx` | Hub issues codes; installer polls |
| Fleet Registration | `backend/src/routes/masters.ts` | — | `src/services/fleetRegistration.ts` | Installer calls `/api/masters/register` |
| Heartbeat | `backend/src/routes/masters.ts`, `backend/src/routes/system.ts` | — | `src/services/healthCheck.ts` | Master → Hub every N seconds |
| License Validation | `backend/src/routes/oauth.ts` | — | `src/components/LicenseStep.tsx` | Hub validates `CF-LIVE-…` keys |
| Desk ID Collision Check | `backend/src/routes/masters.ts`, `backend/src/routes/auth.ts` | — | `src/components/DestinationStep.tsx` | Hub checks `destinations` table |
| Settings Sync | `backend/src/routes/sync.ts` | — | — | Master pulls `settings` hash |
| Order Sync | `backend/src/routes/sync.ts` | — | — | Master pushes orders to Hub |
| Gallery Access (PIN / Magic Link) | `backend/src/routes/gallery.ts` | — | — | Customer accesses via gallery app |
| Email Relay (Resend) | `backend/src/services/emailRelayService.ts` | — | — | Hub sends order notifications |
| AI / Gemini | `backend/src/services/geminiService.ts` | — | — | Forecasts, shoot ideas, album suggestions |
| Analytics / BI | `backend/src/routes/analytics.ts`, `backend/src/services/analyticsService.ts` | — | — | Dashboard stats, revenue trends |
| Blog / SEO Content | — | `src/app/blog/`, `src/data/blogPosts.ts` | — | Static marketing content |
| Lead Capture (Bookings) | — | `src/app/bookings/page.tsx`, `src/lib/api.ts` | — | `submitBooking()` → gallery backend |
| Contact Form | — | `src/app/contact/page.tsx`, `src/lib/api.ts` | — | `submitContactForm()` → gallery backend |
| Portfolio Display | — | `src/app/portfolio/page.tsx` | — | Fetches from gallery backend |
| Pricing Tiers | — | `src/app/pricing/page.tsx` | — | Static marketing page |
| Health Check | `backend/src/routes/system.ts` | — | `src/services/healthCheck.ts` | Installer verifies post-install |
| Token Encryption | — | — | `src/services/tokenEncryption.ts` | OS keychain or AES-256-GCM fallback |
| Touch Pairing | `backend/src/routes/masters.ts` (implied) | — | `src/services/touchPairing.ts` | mDNS + LAN sweep + HMAC exchange |
| Cloudflare Provisioning | — | — | `src/services/cloudflareProvision.ts` | D1, R2, KV verification |

---

## 5. Dead Code / Stubs / TODOs

### 5.1 Management Hub Backend

| Item | File:line | Note |
|------|-----------|------|
| HMAC sync verification stub | `backend/src/routes/sync.ts:19` | `REQUIRE_HMAC_SYNC` env var exists but actual signature re-computation is commented/stubbed ("Note: In a real implementation…") |
| `handleFiles` duplicated in `system.ts` | `backend/src/routes/system.ts:42` | Same function exists in `files.ts`; likely dead copy |
| `fleet.ts` route file missing | — | `masters.ts` handles fleet; `fleet.ts` does not exist despite search hint |
| `marketingAutomationService` imported but usage unverified | `backend/src/server.ts:20` | Imported; actual call sites not found in audited routes |
| `pentest-isolation.js` | `backend/src/pentest-isolation.js` | Appears to be a security testing stub |
| `benchmark-jwt.js` | `backend/src/benchmark-jwt.js` | Performance testing script; not production code |
| `initDefaultUser.ts` | `backend/src/initDefaultUser.ts` | One-time setup script; may be dead after first run |
| `startupGuard.ts` | `backend/src/startupGuard.ts` | Startup validation; may be redundant with wrangler deploy |

### 5.2 Management Hub Frontend

| Item | File:line | Note |
|------|-----------|------|
| `pb.ts` (PocketBase) | `src/services/pb.ts` | Legacy service; may be dead if fully migrated to D1 |
| `pbManagement.ts` | `src/services/pbManagement.ts` | Same as above |
| `supabase.ts` | `src/services/supabase.ts` | Legacy; may be dead if migrated to D1/R2 |
| `faceRecognitionService.ts` | `src/services/faceRecognitionService.ts` | Feature may be stubbed / not wired |
| `webSocketService.ts` | `src/services/webSocketService.ts` | WebSocket service; actual socket usage unverified |
| `orchestrationService.ts` | `src/services/orchestrationService.ts` | Generic orchestration; may be partially implemented |
| `referralTrackingService.ts` | `src/services/referralTrackingService.ts` | May be stub |
| `remoteConfigService.ts` | `src/services/remoteConfigService.ts` | May be stub |
| `performanceMonitor.ts` | `src/services/performanceMonitor.ts` | May be stub |
| `pricingSync.ts` | `src/services/pricingSync.ts` | May be stub |
| `alertingService.ts` | `src/services/alertingService.ts` | May be stub |
| `moneyTrashSync.ts` | `src/services/moneyTrashSync.ts` | May be stub |
| `moneyTrashEmailMarketing.ts` | `src/services/moneyTrashEmailMarketing.ts` | May be stub |
| `unifiedDashboardService.ts` | `src/services/unifiedDashboardService.ts` | May be stub |
| `cloudApiService.ts` | `src/services/cloudApiService.ts` | May overlap with `apiService.ts` |
| `ExtensionRegistry.ts` | `src/utils/ExtensionRegistry.ts` | Extension system; may be unused |
| `coordinateScaler.ts` | `src/utils/coordinateScaler.ts` | Utility; usage unverified |
| `imageUtils.ts` | `src/utils/imageUtils.ts` | Utility; usage unverified |
| `sentry.ts` | `src/utils/sentry.ts` | Sentry init; may be redundant with Next.js Sentry |
| `testUtils.tsx` | `src/utils/testUtils.tsx` | Test-only utility |
| `env.ts` vs `environment.ts` | `src/utils/env.ts`, `src/utils/environment.ts` | Two env utilities; one may be dead |
| `__mocks__` | `src/__mocks__/` | Test mocks; not production |
| `AUDIT_FULL_360.md` | `apps/management/AUDIT_FULL_360.md` | Documentation artifact |
| `AUDIT_REPORT.md` | `apps/management/AUDIT_REPORT.md` | Documentation artifact |
| `ts_errors*.txt` / `build*.log` | Various | Build artifact noise; should be `.gitignore`d |

### 5.3 Website

| Item | File:line | Note |
|------|-----------|------|
| `fetchWebsiteSettings` may fail silently at build time | `src/lib/settings.ts` | Called in server components; fallback behavior unverified |
| `API_BASE_URL` hardcoded fallback | `src/lib/api.ts:1` | Falls back to `gallery-backend.clickflash-office.workers.dev` |
| `r3f.d.ts` | `src/types/r3f.d.ts` | React Three Fiber types; may be unused |
| `Gallery` app embedded in `public/gallery/` | `public/gallery/` | Pre-built gallery app; may be stale |
| `Manage` app embedded in `public/manage/` | `public/manage/` | Pre-built management app; may be stale |

### 5.4 Installer

| Item | File:line | Note |
|------|-----------|------|
| `CloudflareStep.tsx` (non-OAuth) | `src/components/CloudflareStep.tsx` | Older Cloudflare step; may be superseded by `CloudflareStepOAuth.tsx` |
| `useCloudflareApi.ts` hook | `src/hooks/useCloudflareApi.ts` | May be unused if OAuth flow is primary |
| `pairing.test.ts` | `src/services/pairing.test.ts` | Unit test file; not production |
| `scripts/copy-payloads.ts` | `scripts/copy-payloads.ts` | Build script; not runtime |
| `scripts/nsis-installer.nsh` | `scripts/nsis-installer.nsh` | NSIS script; may be unused if electron-builder is primary |
| `build/README.md` | `build/README.md` | Build artifact |
| `dist/` | `dist/` | Build output; should be `.gitignore`d |
| Token encryption OS keychain deps are optional | `src/services/tokenEncryption.ts:17` | `node-windows-security`, `keychain-service`, `libsecret` are dynamically loaded; fallback to AES-256-GCM always works |
| Cloudflare provisioning warnings are non-fatal | `src/services/cloudflareProvision.ts:45` | D1/R2/KV missing → warnings, not errors |
| R2 upload test endpoint (`/api/cloud/sync/test-d1`) | `src/services/healthCheck.ts:83` | Endpoint name says `test-d1` but comment says R2; possible mismatch |

---

## 6. Gaps & Risks

| # | Gap / Risk | Severity | Evidence |
|---|------------|----------|----------|
| 1 | **HMAC sync verification is stubbed** | 🔴 High | `backend/src/routes/sync.ts:19` — only timestamp drift is checked; body signature not recomputed |
| 2 | **No rate limiting on OAuth device code endpoint** | 🟡 Medium | `backend/src/routes/oauth.ts:69` — no `loginRateLimiter` applied |
| 3 | **OAuth `authorize` endpoint lacks brute-force protection** | 🟡 Medium | `backend/src/routes/oauth.ts:119` — no rate limit on user_code attempts |
| 4 | **Website API fallback URL may be wrong tenant** | 🟡 Medium | `src/lib/api.ts:1` — hardcoded fallback to `gallery-backend.clickflash-office.workers.dev` |
| 5 | **Installer R2 test endpoint name mismatch** | 🟡 Medium | `src/services/healthCheck.ts:83` — calls `/api/cloud/sync/test-d1` for R2 test |
| 6 | **Frontend service stubs may hide missing features** | 🟡 Medium | `src/services/` has many files with unverified call sites |
| 7 | **No automated test for 9-step wizard end-to-end** | 🟡 Medium | `tests/installer/wizard-9step.spec.ts` exists but test-results show failure |
| 8 | **Build artifacts committed to repo** | 🟢 Low | `dist/`, `out/`, `.next/`, `ts_errors*.txt` present in tree |
| 9 | **Management Hub `fleet.ts` route missing** | 🟢 Low | Search suggests `fleet.ts` does not exist; `masters.ts` handles fleet |
| 10 | **Legacy PocketBase/Supabase services may still import** | 🟢 Low | `pb.ts`, `pbManagement.ts`, `supabase.ts` present but may be unused |
| 11 | **Installer token encryption relies on optional native deps** | 🟢 Low | Falls back to AES-256-GCM; acceptable but not ideal |
| 12 | **Website `fetchWebsiteSettings` may throw at build time** | 🟢 Low | No visible error boundary for server fetch failure |
| 13 | **No CSRF protection on state-changing website forms** | 🟡 Medium | `src/lib/api.ts` — no CSRF token in POSTs |
| 14 | **Management Hub `handleFiles` duplicated** | 🟢 Low | `backend/src/routes/system.ts:42` duplicates `files.ts` |
| 15 | **Gallery app (`public/gallery/`) is pre-built and may be stale** | 🟡 Medium | No build pipeline visible to refresh it |

---

## 7. Open Questions

1. **Is the HMAC sync stub (`backend/src/routes/sync.ts:19`) on the roadmap to be implemented?** The env var `REQUIRE_HMAC_SYNC` suggests intent, but the actual signature check is missing.

2. **Are PocketBase (`pb.ts`) and Supabase (`supabase.ts`) fully deprecated?** If so, they should be removed to reduce bundle size and confusion.

3. **What is the source of truth for the `gallery` and `manage` embedded apps in `website/public/`?** They appear to be pre-built and may drift from `apps/gallery` and `apps/management`.

4. **Is the `CloudflareStep.tsx` (non-OAuth) component still used, or fully replaced by `CloudflareStepOAuth.tsx`?**

5. **Why does the installer health check call `/api/cloud/sync/test-d1` for an R2 upload test?** Is the endpoint dual-purpose or misnamed?

6. **Are the frontend service stubs (`faceRecognitionService.ts`, `webSocketService.ts`, etc.) planned features or abandoned experiments?**

7. **Is there a monitoring/alerting integration for fleet heartbeat failures?** The `fleet_heartbeats` table collects data, but no alerting logic was found.

8. **What is the `marketingAutomationService` intended to automate?** It is imported in `server.ts` but no route calls it in the audited files.

9. **Is the 9-step installer wizard test (`tests/installer/wizard-9step.spec.ts`) expected to pass?** The `test-results/` directory contains a failure screenshot and error context.

10. **Should the `website` contact/booking forms include CSRF tokens or reCAPTCHA?** Currently they are simple POSTs to the gallery backend.

---

*End of audit.*
