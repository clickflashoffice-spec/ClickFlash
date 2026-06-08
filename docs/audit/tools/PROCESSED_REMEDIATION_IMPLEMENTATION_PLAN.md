# ClickFlash — Processed Remediation Implementation Plan
> **Generated:** June 2026  
> **Status:** Ready for execution  
> **Constraint:** All destructive steps require explicit approval; legacy code and data must be archived, not deleted

---

## 1. Executive Summary

This plan translates the 12 findings from `FINDINGS_REGISTER_AND_BACKLOG.md` into **4 executable remediation workstreams**:

1. **Secret Rotation & .env Cleanup** (P0)
2. **Dual Backend Resolution** (P0)
3. **Migration Consolidation** (P1)
4. **Dependency Alignment** (P2)

Each workstream has step-by-step instructions, acceptance criteria, estimated effort, and rollback plans.

---

## 2. Workstream Summary

| # | Workstream | Priority | Effort | Owner | Document |
|---|------------|----------|--------|-------|----------|
| 1 | Secret Rotation & .env Cleanup | P0 | 1 day | Security + DevOps | `REMEDIATION_01_SECRET_ROTATION_PLAN.md` |
| 2 | Dual Backend Resolution | P0 | 10 days | Backend + Architecture | `REMEDIATION_02_DUAL_BACKEND_RESOLUTION.md` |
| 3 | Migration Consolidation | P1 | 15 days | DBA + Backend | `REMEDIATION_03_MIGRATION_CONSOLIDATION.md` |
| 4 | Dependency Alignment | P2 | 6 days | Platform + Engineering | `REMEDIATION_04_DEPENDENCY_ALIGNMENT.md` |

---

## 3. Execution Order

### Wave 1 — Immediate (Days 1–2)
1. **Rotate all exposed secrets** (Workstream 1)
2. **Stop committing `.env` files** (Workstream 1)
3. **Add `.gitignore` rules** (Workstream 1)

### Wave 2 — Structural (Days 3–12)
4. **Archive legacy Express backends** (Workstream 2)
5. **Route inventory and parity check** (Workstream 2)
6. **Frontend API layer cleanup** (Workstream 2)

### Wave 3 — Foundation (Days 13–27)
7. **Design unified schema** (Workstream 3)
8. **Rewrite migrations with timestamps** (Workstream 3)
9. **Build shared migration runner** (Workstream 3)
10. **Adopt pnpm catalog** (Workstream 4)
11. **Pin security-sensitive dependencies** (Workstream 4)

### Wave 4 — Verification (Days 28–32)
12. Full E2E regression
13. Load testing
14. Security re-scan
15. Documentation update
16. Stakeholder sign-off

---

## 4. Cross-Cutting Concerns

### Testing
- Every remediation PR must pass:
  - `pnpm audit --prod`
  - `pnpm -r run typecheck`
  - `pnpm -r run test:ci`
  - Playwright E2E critical paths
  - k6 load test smoke

### Documentation
- Update `ARCHITECTURE.md` after dual-backend resolution
- Update `DEPLOYMENT.md` after migration consolidation
- Update `API.md` from Worker routes
- Create `OPERATIONS_RUNBOOK.md` after vault migration

### Communication
- Notify team before secret rotation
- Coordinate force-push to remotes
- Update onboarding docs for new `.env.example` workflow

---

## 5. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R-001 | Secret rotation breaks production services | Medium | High | Staged rotation; keep old keys active 24h; monitor Sentry |
| R-002 | Worker route missing after Express archive | Medium | High | Complete route inventory before archive; E2E validation |
| R-003 | Migration consolidation corrupts existing DBs | Low | Critical | Backup before migration; idempotent scripts; rollback plan |
| R-004 | Dependency update breaks native modules | Medium | Medium | Test on Windows CI; pin sharp/electron-builder carefully |
| R-005 | Team continues committing `.env` files | Medium | High | Pre-commit hook + CI check |

---

## 6. Go / No-Go for Each Wave

### Wave 1 Go/No-Go
- [ ] All exposed secrets rotated
- [ ] `.env` files removed from git
- [ ] `.gitignore` updated
- [ ] Vault populated

### Wave 2 Go/No-Go
- [ ] Zero legacy backend files in active paths
- [ ] All E2E tests pass against Worker backends
- [ ] Frontend has single API service

### Wave 3 Go/No-Go
- [ ] Single migration source
- [ ] Timestamp-based IDs
- [ ] All apps build and test green
- [ ] `pnpm audit --prod` clean

### Wave 4 Go/No-Go
- [ ] Full E2E pass
- [ ] Load tests meet SLOs
- [ ] Security re-scan: 0 P0/P1 findings
- [ ] Documentation updated
- [ ] Stakeholder sign-off

---

## 7. Quick Reference: Files to Consult

| Purpose | File |
|---------|------|
| All findings | `FINDINGS_REGISTER_AND_BACKLOG.md` |
| Secret rotation steps | `REMEDIATION_01_SECRET_ROTATION_PLAN.md` |
| Dual backend resolution | `REMEDIATION_02_DUAL_BACKEND_RESOLUTION.md` |
| Migration consolidation | `REMEDIATION_03_MIGRATION_CONSOLIDATION.md` |
| Dependency alignment | `REMEDIATION_04_DEPENDENCY_ALIGNMENT.md` |
| Scan data (JSON) | `findings_register.json` |
| Navigation hub | `MASTER_INDEX.md` |

---

## 8. Preservation Rules During Execution

- Legacy code → move to `docs/archive/`, do not delete
- Old migrations → copy to `docs/archive/migrations/`
- `.env` files → replace with `.env.example`, never leave real values
- Build logs → rotate via `.gitignore`, do not manually purge
- Runtime data (`pb_data/`, `*.db`) → ensure `.gitignore` covers all paths
