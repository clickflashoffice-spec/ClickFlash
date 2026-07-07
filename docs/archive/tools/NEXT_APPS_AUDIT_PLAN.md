# NEXT APPS AUDIT PLAN
## Generated: 2025-06-08 | Auto-Execution: ENABLED

### Apps Requiring Deep Audit

| App | Priority | Status | Focus Areas |
|-----|----------|--------|-------------|
| **management** | P0 | PENDING | Worker routes, auth, secrets |
| **website** | P1 | PENDING | Static build, env exposure |
| **installer** | P1 | PENDING | Electron config, payload security |
| **master-cpp** | P2 | PENDING | CMake build, native deps |
| **gallery** | P0 | PARTIAL | Hardcoded passwords fixed, needs full sweep |
| **touch** | P0 | PARTIAL | Installer built, needs secret audit |

### Audit Checklist Per App

#### 1. MANAGEMENT APP (P0)
- [ ] Audit all Worker routes in `worker/src/routes/`
- [ ] Check `wrangler.toml` for secrets
- [ ] Review `backend/.env` and `.env.example`
- [ ] Scan for hardcoded passwords in `src/services/`
- [ ] Verify auth middleware in `src/middleware/`
- [ ] Check email service for exposed Resend key
- [ ] Audit D1 database migrations for PII
- [ ] Review Cloudflare Workers bindings

#### 2. WEBSITE APP (P1)
- [ ] Check static build output for env leaks
- [ ] Audit `astro.config.mjs` for secrets
- [ ] Review `.env` and `.env.example`
- [ ] Check for API keys in client-side code
- [ ] Verify no Stripe keys in public JS

#### 3. INSTALLER APP (P1)
- [ ] Audit Electron main process
- [ ] Check payload scripts for secrets
- [ ] Review `electron-builder.yml`
- [ ] Verify Cloudflare provisioning code
- [ ] Check token encryption service

#### 4. MASTER-CPP APP (P2)
- [ ] Review `CMakeLists.txt`
- [ ] Check for hardcoded paths
- [ ] Audit native dependencies
- [ ] Verify build scripts

### Execution Order
1. Management (highest risk - has Worker backend)
2. Gallery (complete remaining audit)
3. Touch (complete remaining audit)
4. Website
5. Installer
6. Master-cpp

### Deliverables
- Per-app audit report
- Secret inventory per app
- Remediation checklist per app
- Updated .env.example files
