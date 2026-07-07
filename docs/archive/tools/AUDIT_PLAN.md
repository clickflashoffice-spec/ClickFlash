# ClickFlash — Audit Plan
> **Generated:** June 2026  
> **Scope:** 6 production apps + installer + master-cpp + shared packages  
> **Domains:** Architecture, Backend API, Security, Data Governance, Integration, Performance, Observability, Compliance, Features  
> **Principle:** Non-destructive, evidence-based, stakeholder-validated

---

## 1. Audit Objectives

1. Confirm the actual state of each app against documented architecture.
2. Identify critical blockers to production release.
3. Validate security controls across local, LAN, and cloud tiers.
4. Assess data governance, privacy, and retention posture.
5. Measure performance and resilience under load.
6. Produce a prioritized, costed remediation backlog.

---

## 2. Audit Domains & Checklists

### 2.1 Architecture Quality
- [ ] Each app has a single, well-defined runtime target
- [ ] No dual-backend confusion (gallery/management legacy vs worker)
- [ ] Shared packages `@clickflash/types` and `@clickflash/ui` are consumed correctly
- [ ] master-cpp has a migration path from Electron master
- [ ] Dependency versions aligned across monorepo

### 2.2 Backend API
- [ ] All API routes documented in `API.md`
- [ ] Input validation (`zod`) on every route
- [ ] Authentication middleware applied consistently
- [ ] Rate limiting on public/local endpoints
- [ ] Error handling does not leak stack traces

### 2.3 Security
- [ ] No hardcoded secrets in source
- [ ] JWT uses RS256 with key rotation plan
- [ ] HMAC signing for LAN master↔touch communication
- [ ] Electron `contextIsolation`, `sandbox`, CSP
- [ ] CORS restricted to known origins
- [ ] SQL injection prevention (parameterized queries)
- [ ] File upload restrictions (type, size, magic bytes)

### 2.4 Data Governance
- [ ] GDPR / CCPA data deletion flows
- [ ] Customer photo retention policy implemented
- [ ] PII encryption at rest (SQLCipher)
- [ ] Audit logs immutable / tamper-evident
- [ ] Backup encryption and rotation

### 2.5 Integration
- [ ] Master ↔ Touch sync protocol tested end-to-end
- [ ] Master ↔ Cloud sync handles offline/online transitions
- [ ] Cloudflare D1/R2 bindings consistent across environments
- [ ] Stripe webhooks idempotent
- [ ] Tauri ↔ Rust ↔ Worker upload flow verified

### 2.6 Performance
- [ ] p95 API response < 500 ms
- [ ] Image processing does not block UI thread
- [ ] Database queries have appropriate indexes
- [ ] Large photo uploads use chunked / resumable transfer

### 2.7 Observability
- [ ] Structured logging in all apps
- [ ] Sentry integrated for crash reporting
- [ ] Health check endpoints per service
- [ ] Metrics dashboard for fleet monitoring

### 2.8 Compliance
- [ ] COPPA / GDPR age gate and consent
- [ ] PCI-DSS scope minimized (Stripe Elements)
- [ ] Accessibility WCAG 2.1 AA

---

## 3. Audit Phases & Timeline

| Phase | Duration | Activities |
|-------|----------|------------|
| **P1 — Planning** | 2 days | Confirm scope, stakeholders, evidence collection tools |
| **P2 — Discovery** | 4 days | File/code scan, dependency analysis, infra review |
| **P3 — Assessment** | 5 days | Domain deep dives, test execution, security review |
| **P4 — Documentation** | 2 days | Draft findings, update architecture/data flow docs |
| **P5 — Validation** | 2 days | Stakeholder review, validated findings register |
| **P6 — Remediation Planning** | 3 days | Prioritized backlog, cost estimates, risk register |
| **P7 — Sign-off** | 2 days | Executive summary, go/no-go recommendation |

**Total:** 20 working days

---

## 4. Evidence Collection Plan

| Source | Tool / Method | Storage |
|--------|---------------|---------|
| Static code | `eslint`, `tsc --noEmit`, custom scripts | `docs/audit/tools/code_quality_report.md` |
| Secrets | `grep` + `trufflehog` scan | `docs/audit/04_assessment/security_assessment_*.md` |
| Dependencies | `pnpm licenses list`, `npm audit` | `DEPENDENCY_ALIGNMENT_REPORT.md` |
| Tests | `jest`, `playwright`, `vitest`, `k6` | Test result artifacts in CI |
| Infrastructure | `wrangler whoami`, Docker inspect | `docs/audit/04_assessment/integration_assessment_master.md` |
| Runtime behavior | Local dev server logs, network capture | `docs/audit/05_validation/stakeholder_feedback_log.md` |

---

## 5. Stakeholder Register

| Role | Name | Responsibility |
|------|------|----------------|
| Audit Owner | Engineering Lead | Scope, resources, final sign-off |
| Security Reviewer | Security Lead | Security domain, secrets, penetration testing |
| DevOps Reviewer | Platform Lead | CI/CD, Cloudflare, Docker, deployments |
| QA Lead | Test Engineer | Test execution, coverage analysis |
| DBA / Data | Backend Lead | Schema, migrations, data governance |
| Frontend Lead | UI Engineer | Component audit, accessibility |

---

## 6. Key Audit Questions

1. Is the `gallery` dual backend (Express + CF Worker) resolved?
2. Is `master-cpp` intended to replace `apps/master` or coexist?
3. Are all `.env.example` files complete and up to date?
4. What is the disaster recovery plan for local SQLite databases?
5. How are customer photos purged after retention period?
6. Are all 100+ SQL migrations idempotent and reversible?
7. Is the 1-click installer tested on clean Windows machines?
8. What is the rollback procedure for Cloudflare Worker deployments?
