# ClickFlash Development TODO

> **Active tasks and roadmap for the 6-app ecosystem**

---

## ✅ Completed

### Organization (2026-01-31)

- [x] Reorganize folder structure:
  - [x] Create `apps/` folder with all 6 apps
  - [x] Create `packages/` folder for shared code
  - [x] Create `tools/` folder for scripts
  - [x] Move `master-app/react-new-backup/` → `apps/master/`
  - [x] Move `touch-app/react/` → `apps/touch/`
  - [x] Move `moneytrash-uploader/` → `apps/moneytrash/`
  - [x] Move `management/` → `apps/management/`
  - [x] Move `customer-gallery/` → `apps/gallery/`
  - [x] Move `main-website/` → `apps/website/`
  - [x] Create root `package.json` with workspace configuration
- [x] Update all documentation with new paths

### Master Portal (`apps/master/`)

- [x] Refactor AlbumDetail (1,969 → 5 modules)
- [x] Fix 5 broken migrations (PostgreSQL → SQLite)
- [x] Security audit & fixes
- [x] 34 E2E tests passing

### Touch Kiosk (`apps/touch/`)

- [x] Refactor syncService (873 → 4 modules)
- [x] Refactor pb.ts (606 → 3 modules)
- [x] Refactor KioskContext (577 → 4 modules)
- [x] Refactor WelcomeScreen (495 → 3 modules)
- [x] 34 E2E tests passing

---

## 🚧 In Progress

### Money Trash Uploader (`apps/moneytrash/`) ✅ COMPLETE

- [x] Basic Next.js 16 setup
- [x] Upload API endpoint
- [x] Drag & drop UI polish with image previews
- [x] Batch upload queue with individual file management
- [x] Progress tracking per file + overall
- [x] File validation (type, size)
- [x] Upload history tracking
- [x] Remove individual files / clear all

### Management Hub (`apps/management/`) ✅ COMPLETE

- [x] Backend API with Express (110KB server.js)
- [x] JWT authentication
- [x] Dashboard with analytics widgets
- [x] Order management system
- [x] Client/photographer management
- [x] Settings panels
- [x] 12+ management pages (Destinations, Reports, Expenses, Payroll, etc.)

### Customer Gallery (`apps/gallery/`) ✅ COMPLETE

- [x] Backend API with Express (110KB server.js)
- [x] JWT authentication
- [x] Photo browsing with lightbox
- [x] Favorites system
- [x] Shopping cart & checkout
- [x] Stripe payment integration
- [x] Order status tracking
- [x] Download system

### Main Website (`apps/website/`)

- [ ] Add more portfolio sections
- [ ] SEO optimization
- [ ] Performance optimization

---

## 📋 Backlog

### High Priority

#### Money Trash Uploader (`apps/moneytrash/`)

- [ ] Complete upload UI
- [ ] Add batch processing
- [ ] Implement progress indicators
- [ ] Add EXIF data extraction
- [ ] Connect to cloud storage

#### Management Hub (`apps/management/`)

- [ ] Complete backend APIs
- [ ] Build analytics dashboard
- [ ] Add revenue reports
- [ ] Create invoice system
- [ ] Implement client management

#### Customer Gallery (`apps/gallery/`)

- [ ] Complete photo browsing
- [ ] Add favorites system
- [ ] Enable digital downloads
- [ ] Integrate Stripe payments
- [ ] Add booking calendar

### Medium Priority

#### Desktop Apps

- [ ] Add auto-updater
- [ ] Improve sync reliability
- [ ] Add offline queue persistence
- [ ] Optimize SQLite performance

#### Monorepo Setup

- [ ] Set up proper package linking
- [ ] Create shared types package
- [ ] Create shared UI components
- [ ] Set up Turborepo for builds

### Low Priority

- [ ] Mobile apps (React Native)
- [ ] AI photo tagging
- [ ] Automated editing pipeline
- [ ] Client mobile app

---

## 🐛 Known Issues

| Issue                                  | App             | Priority | Status |
| -------------------------------------- | --------------- | -------- | ------ |
| Main website needs portfolio expansion | `apps/website/` | Low      | 🟢     |

---

## 🎯 Next Sprint Goals

### Week 1-2: Money Trash Uploader

1. Polish upload UI
2. Add batch processing
3. Implement progress tracking

### Week 3-4: Management Hub Backend

1. Complete Express API
2. Add authentication
3. Build core endpoints

### Week 5-6: Customer Gallery Backend

1. Complete Express API
2. Add photo serving
3. Integrate Stripe

---

## 📊 Progress Tracking

```
App Status:
✅ Master Portal      ████████████████████ 100%  apps/master/
✅ Touch Kiosk        ████████████████████ 100%  apps/touch/
✅ Money Trash        ████████████████████ 100%  apps/moneytrash/
✅ Management Hub     ████████████████████ 100%  apps/management/
✅ Customer Gallery   ████████████████████ 100%  apps/gallery/
✅ Main Website       ████████████░░░░░░░░  60%  apps/website/

Overall Progress: 93% (5.6/6 apps functional)
```

---

## 📝 Notes

### App Structure

**Desktop Apps (Offline):**

- Master Portal (`apps/master/`) - Port 8090 - Studio management + Auto Money Trash
- Touch Kiosk (`apps/touch/`) - Port 8091 - Customer self-service

**Web Apps (Online):**

- Money Trash Uploader (`apps/moneytrash/`) - Port 3000 - Manual/bulk uploads
- Management Hub (`apps/management/`) - Business analytics & management
- Customer Gallery (`apps/gallery/`) - Customer portal & payments
- Main Website (`apps/website/`) - Port 3001 - Marketing site

**Sync Architecture:**

- Master ↔ Touch: WebSocket LAN sync
- Master ↔ Cloud: Custom Express node sync
- Web apps: Independent Express backends with SQLite storage

### Workspace Commands

```bash
# Development
npm run dev:master        # apps/master/ - Port 8090
npm run dev:touch         # apps/touch/ - Port 8091
npm run dev:moneytrash    # apps/moneytrash/ - Port 3000
npm run dev:management    # apps/management/
npm run dev:gallery       # apps/gallery/
npm run dev:website       # apps/website/ - Port 3001

# Building
npm run build:master
npm run build:touch
npm run build:moneytrash
npm run build:management
npm run build:gallery
npm run build:website
```

---

_Last Updated: 2026-01-31_
_Organization Status: ✅ Complete_
