# ClickFlash — Dual Backend Resolution Plan
> **Generated:** June 2026  
> **Priority:** P0  
> **Scope:** `apps/gallery` and `apps/management`

---

## 1. Current State

Both `apps/gallery` and `apps/management` contain **two active backend codebases**:

### Gallery
| Backend | Location | Runtime | Status |
|---------|----------|---------|--------|
| Legacy Express | `apps/gallery/backend/legacy/` | Node.js + SQLite | ⚠️ Active but likely deprecated |
| Cloudflare Worker | `apps/gallery/backend/src/` | CF Worker + D1/R2 | 🟢 Target architecture |

### Management
| Backend | Location | Runtime | Status |
|---------|----------|---------|--------|
| Legacy Express | `apps/management/backend/master/`, `shared/`, root `backend/` | Node.js + SQLite | ⚠️ Active but likely deprecated |
| Cloudflare Worker | `apps/management/backend/src/` | CF Worker + D1 | 🟢 Target architecture |

---

## 2. Decision Matrix

| Option | Description | Pros | Cons | Recommendation |
|--------|-------------|------|------|----------------|
| **A — Archive Legacy** | Move Express code to `docs/archive/` | Single source of truth, smaller bundles, less attack surface | Requires full E2E regression on Worker paths | ✅ **Recommended** |
| **B — Keep Both** | Maintain Express for local dev, Worker for cloud | Easier local debugging | Permanent dual maintenance, security debt, confusion | ❌ Rejected |
| **C — Merge** | Extract shared logic into package used by both | Reuse validation/auth | High effort, still two runtimes | ⚠️ Only if local dev strictly requires Express |

---

## 3. Recommended Implementation

### Phase 1 — Verify Worker Parity (Days 1–3)
1. **Route inventory:** List every Express route in legacy and every Worker route in `src/routes/`.
2. **Feature diff:** Identify routes in Express that have no Worker equivalent.
3. **Test migration:** Move legacy tests (`backend/legacy/__tests__/`) to test Worker handlers where applicable.

### Phase 2 — Archive Legacy (Days 4–5)
```bash
# Gallery
mkdir -p docs/archive/backends/gallery-express
git mv apps/gallery/backend/legacy/* docs/archive/backends/gallery-express/

# Management
mkdir -p docs/archive/backends/management-express
git mv apps/management/backend/master docs/archive/backends/management-express/
git mv apps/management/backend/shared apps/archive/backends/management-express-shared/
```

### Phase 3 — Clean Frontend API Layer (Days 6–7)
1. Remove any frontend code that conditionally calls Express vs Worker.
2. Standardize on `cloudApiService.ts` or equivalent.
3. Update `VITE_API_URL` to point only to Worker domain.

### Phase 4 — Update Documentation (Day 8)
1. Update `ARCHITECTURE.md` to show only Worker backends.
2. Update `DEPLOYMENT.md` to remove Express deployment steps.
3. Update `API.md` from Worker route source.

### Phase 5 — Verification (Days 9–10)
1. Full Playwright E2E run on gallery customer journey.
2. Full Playwright E2E run on management hub flows.
3. Load test Worker endpoints with k6.

---

## 4. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Missing route in Worker | Complete route inventory before archive |
| Local dev broken | Use `wrangler dev` for local Worker emulation |
| Test coverage drop | Migrate tests, don't delete them |
| Deployment docs stale | Update docs in same PR |

---

## 5. Acceptance Criteria

- [ ] Zero files in `apps/gallery/backend/legacy/`
- [ ] Zero Express routes in `apps/management/backend/`
- [ ] Frontend API service has no conditional backend selection
- [ ] All E2E tests pass against Worker backend
- [ ] `ARCHITECTURE.md` and `DEPLOYMENT.md` updated
- [ ] Legacy code preserved in `docs/archive/`
