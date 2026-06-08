# ClickFlash — Finalization Plan
> **Generated:** June 2026  
> **Goal:** Move the ecosystem from "audit complete" to "production hardened and release ready"  
> **Constraint:** No files deleted without explicit approval; all changes tracked

---

## 1. Finalization Principles

1. **Preserve everything** — archive, don't delete.
2. **Resolve dual backends** — gallery & management must have one backend source of truth.
3. **Unify schema** — one migration source for master/touch/gallery/management/master-cpp.
4. **Automate tests** — CI must run unit, integration, E2E, and performance suites.
5. **Document as code** — every env var, route, and deployment step is documented.

---

## 2. Finalization Workstreams

### Workstream A — Code Quality & Consistency
| Task | Priority | Owner | Acceptance Criteria |
|------|----------|-------|---------------------|
| A1. Archive legacy Express backends in gallery/management | P0 | Backend Lead | `backend/legacy/` moved to `docs/archive/backends/`, worker builds pass |
| A2. Align TypeScript strictness across all apps | P1 | Engineering | `tsc --noEmit` passes in every app |
| A3. Standardize lint configs via root eslint config | P1 | Engineering | One `eslint.config.js` at root, apps extend |
| A4. Remove or document all `console.log` | P2 | Engineering | Zero new console.log; existing logged in tech debt |
| A5. Add error boundaries to every app root | P1 | Frontend Lead | No white-screen crashes |

### Workstream B — Security Hardening
| Task | Priority | Owner | Acceptance Criteria |
|------|----------|-------|---------------------|
| B1. Rotate any leaked secrets | P0 | Security Lead | No matches in `git log -S` secret scan |
| B2. Implement secrets vault (1Password / Doppler) | P1 | DevOps | No `.env.production` in repo |
| B3. Add security headers to all Workers | P1 | Backend Lead | CSP, HSTS, X-Frame-Options verified |
| B4. Penetration test on public endpoints | P1 | Security Lead | Report with 0 critical/high findings |
| B5. Enable SQLCipher for all SQLite deployments | P1 | Backend Lead | Encrypted databases verified |

### Workstream C — Infrastructure & Deployment
| Task | Priority | Owner | Acceptance Criteria |
|------|----------|-------|---------------------|
| C1. GitHub Actions for full monorepo CI | P0 | DevOps | Build + test + lint on every PR |
| C2. Automated staging deployment | P1 | DevOps | Merge to `develop` deploys staging |
| C3. Production promotion gates | P1 | DevOps | Manual approval + smoke tests required |
| C4. Docker Compose health checks pass | P1 | DevOps | `docker compose up` ready in <60s |
| C5. Cloudflare R2/D1 provisioning runbook | P2 | Platform | New environment deployable in <30 min |

### Workstream D — Data & Schema
| Task | Priority | Owner | Acceptance Criteria |
|------|----------|-------|---------------------|
| D1. Create unified migration source | P0 | DBA | One `packages/database/migrations` folder |
| D2. Reconcile master-cpp migrations with TS apps | P1 | DBA | Schema diff shows 0 unexpected differences |
| D3. Add migration reversibility tests | P2 | DBA | Every migration has `down` or rollback script |
| D4. Implement PII purge job | P1 | Backend Lead | GDPR delete request fully removes data |
| D5. Backup encryption verification | P1 | DevOps | Restore from encrypted backup tested monthly |

### Workstream E — Testing & Quality Gates
| Task | Priority | Owner | Acceptance Criteria |
|------|----------|-------|---------------------|
| E1. E2E coverage for critical paths | P0 | QA Lead | Playwright tests for purchase + sync + upload |
| E2. Unit test coverage ≥70% | P1 | Engineering | Coverage report in CI |
| E3. k6 load tests with SLOs | P1 | QA Lead | p95 <500ms, error <0.1% |
| E4. Accessibility audit (WCAG 2.1 AA) | P1 | Frontend Lead | axe DevTools 0 violations |
| E5. Installer smoke test on clean VM | P1 | QA Lead | 1-click install succeeds end-to-end |

### Workstream F — Documentation
| Task | Priority | Owner | Acceptance Criteria |
|------|----------|-------|---------------------|
| F1. Update `ARCHITECTURE.md` to current state | P0 | Architect | Matches code, no dual-backend ambiguity |
| F2. Update `API.md` from code | P1 | Backend Lead | Every route documented |
| F3. Create `OPERATIONS_RUNBOOK.md` | P1 | DevOps | On-call procedures, rollback, escalation |
| F4. Finalize `DEPLOYMENT.md` | P1 | DevOps | Step-by-step for local + cloud |
| F5. Update `SECURITY.md` with new controls | P1 | Security Lead | Reflects vault, headers, pen test |

---

## 3. Finalization Timeline

| Week | Focus | Milestone |
|------|-------|-----------|
| Week 1 | A1, B1, C1, D1 | Dual backend resolved, CI green, schema unified |
| Week 2 | A2, B2, B3, C2, E1 | TypeScript clean, staging auto-deploy, E2E critical paths |
| Week 3 | B4, B5, D2, D4, E2 | Security hardening, PII purge, coverage up |
| Week 4 | E3, E4, E5, F1–F5 | Performance signed off, docs complete, release ready |

---

## 4. Go / No-Go Criteria

- [ ] All P0 tasks complete
- [ ] All CI checks green for 5 consecutive days
- [ ] Security scan: 0 critical / high findings
- [ ] Load test SLOs met
- [ ] Documentation reviewed and approved
- [ ] Rollback plan tested (< 15 min RTO)
- [ ] Stakeholder sign-off obtained

---

## 5. Preservation Checklist

- [ ] Legacy backends moved to archive, not deleted
- [ ] Old migrations copied to `docs/archive/migrations/`
- [ ] Build logs rotated, not deleted
- [ ] Runtime data (`pb_data/`, `*.db`) added to `.gitignore`
- [ ] All `.md` docs retained; updated versions appended or versioned
