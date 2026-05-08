# ClickFlash File Census

> Complete inventory of all files in the ClickFlash ecosystem

---

## 1. Root Directory

### Root Files

| Category | Count |
|----------|-------|
| Config Files | 15 |
| Batch Scripts | 12 |
| Documentation (.md) | 50+ |
| Utility Scripts (.js/.ts) | 20+ |
| Patch Files | 3 |

### Root Batch Scripts

| File | Purpose |
|------|---------|
| `install-all.bat` | Install all dependencies |
| `start-all.bat` | Start all apps |
| `kill-all.bat` | Kill all processes |
| `clean-all.bat` | Clean build artifacts |
| `status.bat` | Check service status |
| `deploy_ecosystem.ps1` | Cloud deployment |
| `deploy-web.ps1` | Web deployment |
| `push_to_github.bat` | Git push |

---

## 2. apps/master/

### Backend Files

| Category | Count | Location |
|----------|-------|----------|
| Routes | 21 | `backend/routes/` |
| Services | 26 | `backend/services/` |
| Shared Modules | 20 | `backend/shared/` |
| Middleware | 5 | `backend/middleware/` |
| Migrations | 51 | `backend/migrations/` |
| Workers | 4 | `backend/workers/` |
| Scripts | 10 | `backend/scripts/` |
| Types | 3 | `backend/types/` |
| Schemas | 1 | `backend/schemas/` |
| Controllers | 1 | `backend/controllers/` |

### Frontend Files

| Category | Count | Location |
|----------|-------|----------|
| Root Components | 10+ | `src/components/` |
| Album Components | 40+ | `src/components/albums/` |
| Settings Components | 29 | `src/components/settings/` |
| Order Components | 11 | `src/components/orders/` |
| Modal Components | 11 | `src/components/modals/` |
| Dashboard Components | 18 | `src/components/dashboard/` |
| Photographer Components | 4 | `src/components/photographers/` |
| Product Components | 5 | `src/components/products/` |
| Marketing Components | 1 | `src/components/marketing/` |
| Common Components | 35+ | `src/components/common/` |
| Services | 40+ | `src/services/` |
| Hooks | 20+ | `src/hooks/` |
| Contexts | 3 | `src/context/` |
| Utils | 15+ | `src/utils/` |
| Types | 4 | `src/types/` |

### Backend Routes

| File | Purpose |
|------|---------|
| `auth.ts` | Authentication |
| ` collections.ts` | CRUD operations |
| `orders.ts` | Order management |
| `faces.ts` | Face recognition |
| `culling.ts` | AI culling |
| `gallery.ts` | Gallery config |
| `galleryPublic.ts` | Public access |
| `marketing.ts` | Campaigns |
| `analytics.ts` | Business metrics |
| `dashboard.ts` | Dashboard stats |
| `ledger.ts` | Financial ledger |
| `pairing.ts` | Kiosk pairing |
| `sync.ts` | Data sync |
| `realtime.ts` | WebSocket |
| `inventory.ts` | Stock management |
| `fulfillment.ts` | Order fulfillment |
| `retention.ts` | Data retention |
| `settings.ts` | App settings |
| `users.ts` | User management |
| `categories.ts` | Photo categories |
| `sessionTypes.ts` | Session types |

### Backend Services

| File | Purpose |
|------|---------|
| `SyncManager.ts` | Kiosk sync |
| `cloudSyncService.ts` | Cloud sync |
| `FaceService.ts` | Face recognition |
| `FulfillmentService.ts` | Order fulfillment |
| `QueueProcessor.ts` | Background jobs |
| `InventoryService.ts` | Stock management |
| `WatermarkService.ts` | Watermarks |
| `ThumbnailService.ts` | Thumbnails |
| `AnalyticsService.ts` | Metrics |
| `MarketingService.ts` | Campaigns |
| `LedgerService.ts` | Financial |
| `RetentionService.ts` | Data lifecycle |
| `VectorIndexService.ts` | Face vectors |

### Migrations

| Range | Count |
|-------|-------|
| 001-010 | 10 |
| 011-020 | 10 |
| 021-030 | 10 |
| 031-040 | 10 |
| 041-051 | 11 |
| **Total** | **51** |

---

## 3. apps/touch/

### Backend Files

| Category | Count | Location |
|----------|-------|----------|
| Routes | 8 | `backend/routes/` |
| Services | 3 | `backend/services/` |
| Shared Modules | 14 | `backend/shared/` |
| Migrations | 9 | `backend/migrations/` |

### Frontend Files

| Category | Count | Location |
|----------|-------|----------|
| Touch Screens | 15 | `src/components/touch/` |
| Common Components | 11 | `src/components/common/` |
| Settings Components | 4 | `src/components/settings/` |
| Services | 12 | `src/services/` |
| Hooks | 7 | `src/hooks/` |
| Context | 1 | `src/context/` |
| Utils | 2 | `src/utils/` |

### Touch Screens

| File | Purpose |
|------|---------|
| `WelcomeScreen.tsx` | Welcome interface |
| `AttractScreen.tsx` | Idle/attract mode |
| `PhotoSelectionScreen.tsx` | Photo browsing |
| `PhotoPreviewScreen.tsx` | Photo preview |
| `CheckoutScreen.tsx` | Checkout flow |
| `ThankYouScreen.tsx` | Thank you page |
| `FaceSearchModal.tsx` | Face search |
| `RoomNumberModal.tsx` | Room entry |
| `OnScreenKeyboard.tsx` | Virtual keyboard |
| `NumericKeypad.tsx` | Number pad |

---

## 4. apps/moneytrash/

### Structure

| Category | Count | Location |
|----------|-------|----------|
| React Components | 2 | `src/` |
| Next.js Pages | 2 | `src/app/` |
| API Routes | 3 | `src/app/api/` |
| Services | 3 | `src/services/` |
| Rust Commands | 2 | `src-tauri/src/` |
| Tauri Config | 1 | `src-tauri/` |

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/App.tsx` | 878 | Main Tauri app |
| `src-tauri/src/commands.rs` | 486 | Rust commands |
| `src/services/desktopBatchUploadService.ts` | 338 | Desktop uploads |
| `src/services/batchUploadService.ts` | 352 | Web uploads |
| `src/services/s3StorageService.ts` | 362 | S3 integration |

---

## 5. apps/management/

### Backend Files

| Category | Count | Location |
|----------|-------|----------|
| Server Files | 15 | `backend/src/` |
| Routes | 5 | `backend/routes/` |
| Services | 2 | `backend/services/` |
| Shared Modules | 9 | `backend/shared/` |
| Migrations | 10 | `backend/migrations/` |

### Frontend Files

| Category | Count | Location |
|----------|-------|----------|
| Management Components | 30+ | `src/components/management/` |
| Management Settings | 12 | `src/components/management/settings/` |
| Management Modals | 11 | `src/components/management/modals/` |
| Dashboard Widgets | 10 | `src/components/management/dashboard/widgets/` |
| Touch Preview | 22 | `src/components/touch/` |
| Order Components | 7 | `src/components/orders/` |
| Product Components | 5 | `src/components/products/` |
| Photographer Components | 6 | `src/components/photographers/` |
| Modal Components | 12 | `src/components/modals/` |
| Common Components | 17 | `src/components/common/` |
| Services | 20+ | `src/services/` |
| Hooks | 8 | `src/hooks/` |
| Utils | 7 | `src/utils/` |

---

## 6. apps/gallery/

### Backend Files

| Category | Count | Location |
|----------|-------|----------|
| Server Files | 14 | `backend/src/` |
| Routes | 4 | `backend/routes/` |
| Workers | 2 | `backend/workers/` |
| Migrations | 10 | `backend/migrations/` |

### Frontend Files

| Category | Count | Location |
|----------|-------|----------|
| Customer Components | 8 | `src/components/customer/` |
| Management Components | 25+ | `src/components/management/` |
| Touch Preview | 22 | `src/components/touch/` |
| Album Components | 6 | `src/components/albums/` |
| Order Components | 7 | `src/components/orders/` |
| Settings Components | 19 | `src/components/settings/` |
| Common Components | 18 | `src/components/common/` |
| Services | 15 | `src/services/` |

---

## 7. apps/website/

### Structure

| Category | Count | Location |
|----------|-------|----------|
| Pages | 14 | `src/app/` |
| Layout Components | 3 | `src/components/layout/` |
| Section Components | 12 | `src/components/sections/` |
| SEO Components | 1 | `src/components/seo/` |
| UI Components | 8 | `src/components/ui/` |
| Contexts | 1 | `src/contexts/` |
| Lib Files | 3 | `src/lib/` |

### Pages

| Path | Purpose |
|------|---------|
| `/` | Homepage |
| `/about` | About page |
| `/blog` | Blog listing |
| `/blog/[slug]` | Blog post |
| `/bookings` | Booking request |
| `/careers` | Careers page |
| `/clients` | Client portal |
| `/contact` | Contact page |
| `/faq` | FAQ page |
| `/portfolio` | Portfolio gallery |
| `/pricing` | Pricing packages |
| `/privacy` | Privacy policy |
| `/services` | Services overview |
| `/terms` | Terms of service |
| `/testimonials` | Testimonials |

---

## 8. Shared Infrastructure

### packages/

| Package | Files | Purpose |
|---------|-------|---------|
| `backup-service` | 3 | Automated backup |

### apps/shared/

| File | Lines | Purpose |
|------|-------|---------|
| `cloud-schema.sql` | 184 | Cloud DB schema |

### deployment/

| File | Purpose |
|------|---------|
| `nginx.conf` | Reverse proxy |
| `backup.sh` | Backup script |
| `pocketbase.service` | Systemd service |

### scripts/

| File | Purpose |
|------|---------|
| `generate_nodes.js` | Generate nodes |
| `ingest_nodes.js` | Ingest nodes |
| `verify_ingestion.js` | Verify ingestion |
| `cleanup-stale-queues.js` | Clean queues |

---

## 9. .agent/ Directory

### Structure

| Category | Count | Location |
|----------|-------|----------|
| Workflows | 1 | `workflows/` |
| Common Docs | 9 | `common/` |
| Agent Docs | 12 | `docs/` |
| Audit Reports | 3 | `audit_reports/` |
| Archived Files | 80+ | `archive/` |
| Skills | 254 | `skills/` |
| Scripts | 5 | `scripts/` |

### Skills Inventory

| Category | Count |
|----------|-------|
| Security/Pentesting | 35 |
| Frontend Development | 30 |
| Backend Development | 25 |
| Database | 15 |
| AI/ML | 20 |
| DevOps/Deployment | 20 |
| Testing/Quality | 15 |
| Marketing/Growth | 30 |
| General Development | 70 |
| **Total** | **284** |

---

## 10. docs/ Directory

| File | Lines | Purpose |
|------|-------|---------|
| `SALES_WORKFLOW.md` | 402 | Sales workflow |
| `manuals/master_app_manual.md` | 167 | Master manual |
| `manuals/touch_app_manual.md` | 63 | Touch manual |
| `manuals/management_app_manual.md` | 134 | Management manual |
| `manuals/customer_gallery_guide.md` | 63 | Gallery guide |
| `manuals/money_trash_manual.md` | - | MoneyTrash guide |
| `manuals/tech_ops_manual.md` | - | Tech ops |
| `plans/2026-01-26-scale-performance-design.md` | 49 | Performance spec |

---

## 11. Total Project Statistics

### File Counts

| Category | Count |
|----------|-------|
| TypeScript/TSX | 400+ |
| JavaScript | 100+ |
| SQL Migrations | 70+ |
| Markdown | 100+ |
| Config Files | 80+ |
| Batch Scripts | 70+ |
| Rust | 2 |
| **Total Files** | **900+** |

### Line Counts (Estimated)

| App | Backend | Frontend | Total |
|-----|---------|----------|-------|
| Master | ~15,000 | ~20,000 | ~35,000 |
| Touch | ~3,000 | ~8,000 | ~11,000 |
| MoneyTrash | ~500 | ~2,000 | ~2,500 |
| Management | ~2,000 | ~10,000 | ~12,000 |
| Gallery | ~2,000 | ~8,000 | ~10,000 |
| Website | - | ~5,000 | ~5,000 |
| **Total** | **~22,500** | **~53,000** | **~75,500** |

### Component Counts

| App | Components | Services | Hooks |
|-----|------------|----------|-------|
| Master | 100+ | 40+ | 20+ |
| Touch | 30+ | 12 | 7 |
| Management | 100+ | 20+ | 8 |
| Gallery | 80+ | 15 | - |
| Website | 25+ | - | - |

---

## 12. Batch Scripts Summary

### Per App

| App | Batch Scripts |
|-----|---------------|
| Master | 9 |
| Touch | 6 |
| Management | 8 |
| Gallery | 8 |
| MoneyTrash | 9 |
| Website | 8 |
| Root | 12 |
| **Total** | **60+** |

### Script Naming Convention

```
1_INSTALL.bat    - Install dependencies
2_BUILD.bat      - Build the project
3_START_DEV.bat  - Start development
4_START_PROD.bat - Start production
5_LINT.bat       - Run linter
6_CLEAN.bat      - Clean artifacts
```

---

*Generated: 2026-02-17*
*ClickFlash v4.2.0*
*Total Files: 900+*
