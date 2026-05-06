# Master React - Next Steps & Priorities

**Last Updated**: 2026-01-18 14:03 CET

---

## Immediate Priorities (This Week)

### 1. Gallery Watermark System (NEW)

**Priority**: HIGH  
**Effort**: 2-3 hours

**Context**: Watermarks removed from import workflow (speed optimization). Need separate on-demand watermark generation for gallery/moneytrash feature.

**Tasks**:

- [ ] Create `/api/gallery/export` endpoint
- [ ] Implement on-demand watermark generator (Sharp)
- [ ] Store watermarked photos in separate `gallery/watermarked/` folder
- [ ] Update gallery export to trigger watermark generation
- [ ] Add watermark customization (text, opacity, rotation)

**Files to modify**:

- Create `backend/routes/gallery.ts`
- Create `backend/workers/watermarkWorker.ts`
- Update `backend/routes/collections.ts` (export endpoint)

**Verification**:

- Export album to gallery
- Verify watermarked photos generated in separate folder
- Confirm original photos untouched
- Test moneytrash display with watermarks

---

### 2. Production Testing & Validation

**Priority**: HIGH  
**Effort**: 4-6 hours

**Tasks**:

- [ ] Test 500-photo import (verify 85% speed improvement)
- [ ] Test thermal monitoring under load
- [ ] Verify memory usage on 16GB Master
- [ ] Test kiosk mode lockdown (both Master + Touch)
- [ ] Validate offline operation (unplug internet)
- [ ] Test order sync (Touch → Master)
- [ ] Backup/restore procedures

**Deployment checklist in**: [`react_deployment_guide.md`](file:///e:/ClickFlash/.agent/react_deployment_guide.md)

---

## Short-Term (Next 2 Weeks)

### 3. Performance Monitoring Dashboard

**Priority**: MEDIUM  
**Effort**: 3-4 hours

**Tasks**:

- [ ] Create `/system/performance` route
- [ ] Display thermal status history
- [ ] Show memory usage trends
- [ ] Database size tracking
- [ ] Import speed metrics
- [ ] Photo processing queue status

**Benefits**: Proactive issue detection, performance regression tracking

---

### 4. Automated Backup Enhancements

**Priority**: MEDIUM  
**Effort**: 2 hours

**Tasks**:

- [ ] Implement multi-generation backups (keep 7 days)
- [ ] Add backup verification (restore test)
- [ ] Email notifications on backup success/failure
- [ ] Automatic cloud upload (optional, S3/Backblaze)

---

### 5. Touch-App Sync Optimization

**Priority**: MEDIUM  
**Effort**: 3 hours

**Context**: Touch receives full-resolution files after import optimization.

**Tasks**:

- [ ] Implement incremental sync (only new photos)
- [ ] Add progress bar for sync operations
- [ ] Resume interrupted transfers
- [ ] Verify checksums after sync

---

## Medium-Term (Next Month)

### 6. AI Culling Dashboard Enhancements

**Priority**: LOW  
**Effort**: 4-5 hours

**Tasks**:

- [ ] Batch operations (apply culling to all)
- [ ] Custom scoring weights (user preference)
- [ ] Export culled selections
- [ ] Integration with photo editor

---

### 7. Print Queue Management

**Priority**: LOW  
**Effort**: 2-3 hours

**Tasks**:

- [ ] Print preview before sending
- [ ] Batch print operations
- [ ] Print history tracking
- [ ] Paper size templates

---

### 8. Advanced Face Recognition

**Priority**: LOW  
**Effort**: 6-8 hours

**Tasks**:

- [ ] Implement face clustering
- [ ] Name tagging UI
- [ ] Search by person
- [ ] Auto-grouping by family/couples

---

## Bug Fixes & Polish

### 9. CSS Lint Warnings

**Priority**: LOW  
**Effort**: 30 minutes

**Tasks**:

- [ ] Move inline styles to external CSS in `LazyImage.tsx` (line 147)
- [ ] Move inline styles to external CSS in `AlbumDetail.tsx` (line 2142)

---

### 10. TypeScript Type Errors

**Priority**: LOW  
**Effort**: 15 minutes

**Tasks**:

- [ ] Fix Virtuoso orientation prop type in `VirtualFilmstrip.tsx` (line 81)

---

## Future Enhancements (Backlog)

### 11. Multi-Language Support

**Priority**: DEFERRED  
**Effort**: 8-10 hours

**Tasks**:

- [ ] i18n framework setup (react-i18next)
- [ ] English, Arabic, French translations
- [ ] RTL layout support
- [ ] Language switcher UI

---

### 12. Customer Portal Enhancements

**Priority**: DEFERRED  
**Effort**: 6-8 hours

**Tasks**:

- [ ] Photo favorites/cart
- [ ] Download manager
- [ ] Order history
- [ ] Stripe payment integration

---

### 13. Advanced Photo Straightening

**Priority**: DEFERRED  
**Effort**: 8-10 hours

**Context**: Current straightener uses basic rotation. Implement advanced computer vision algorithms.

**Tasks**:

- [ ] Vanishing point detection (perspective correction for architecture)
- [ ] RANSAC algorithm (outlier rejection for messy scenes)
- [ ] Generative fill (AI-based corner filling instead of crop)
- [ ] Keystone correction (make parallel lines truly parallel)

**Technical Details**:

- Use computer vision library (OpenCV or similar)
- Detect multiple vanishing points for complex scenes
- Apply perspective transform (3D-like warp)
- Generate new pixels for empty corners (avoid 5-10% crop loss)

---

### 14. Background Removal (AI)

**Priority**: DEFERRED  
**Effort**: 10-12 hours

**Tasks**:

- [ ] Integrate background removal AI (remove.bg API or local model)
- [ ] Batch processing
- [ ] Preview before applying
- [ ] Undo capability

---

## Technical Debt

### 14. Database Migration to Prisma (OPTIONAL)

**Priority**: DEFERRED  
**Effort**: 15-20 hours

**Context**: Currently using raw better-sqlite3. Prisma would add type safety and migrations.

**Pros**: Type safety, auto-migrations, better DX  
**Cons**: Migration effort, learning curve, performance overhead

**Decision**: Defer - current better-sqlite3 works well

---

### 15. Test Coverage Improvement

**Priority**: DEFERRED  
**Effort**: 12-15 hours

**Tasks**:

- [ ] Unit tests for critical services (PhotoProcessor, ThermalService)
- [ ] Integration tests for API routes
- [ ] E2E tests for photo import workflow
- [ ] Playwright tests for kiosk mode

---

## Completed Phases

✅ **Phase 14**: Performance Ultimate (Thermal, Memory, Zero-Block IO, Bundle)  
✅ **Phase 17**: Editor & Kiosk Resolution  
✅ **Phase 18**: Architecture Alignment (Titan Protocol)  
✅ **Phase 27**: React Deployment Guide  
✅ **Phase 28**: Import Speed Optimization (85% faster)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-18 | Single-thumbnail import (400px only) | 85% speed improvement, grid stays responsive |
| 2026-01-18 | Remove watermarks from import | Watermarks for gallery only, not all photos |
| 2026-01-18 | Kiosk mode required for Master | Prevent photographer access to Windows folders |
| 2026-01-18 | Defer Prisma migration | better-sqlite3 sufficient, migration cost too high |

---

**Recommended Next Task**: Gallery Watermark System (closes import optimization loop)
