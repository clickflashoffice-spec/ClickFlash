# ClickFlash Q2 2026 Security Remediation

## Epic: Security Hardening - Q2 2026

**Type:** Epic  
**Status:** Ready to Start  
**Priority:** Critical  
**Target:** 2026-04-30

---

## User Story: Fix Critical JWT Security Issues

**As a** Security Lead  
**I want** to eliminate hardcoded JWT secrets and fallbacks  
**So that** we prevent authentication bypass attacks

### Acceptance Criteria

- [ ] No JWT_SECRET in wrangler.toml files
- [ ] No fallback secrets like "fallback_secret" or "CHANGE_ME_IN_PRODUCTION"
- [ ] All JWT secrets set via environment variables only
- [ ] Startup validation fails fast if JWT_SECRET missing

---

## Tickets

### P1 - Critical (24hr SLA)

#### [SEC-01] Remove JWT_SECRET from Gallery wrangler.toml

| Field | Value |
|-------|-------|
| **Type** | Bug |
| **Priority** | Critical |
| **Story Points** | 2 |
| **Assignee** | Unassigned |
| **Labels** | security, jwt, gallery |
| **Due Date** | 2026-04-09 |

**Description:**
JWT_SECRET hardcoded in `apps/gallery/backend/wrangler.toml` line 23. Remove and use `wrangler secret put`.

**Steps:**
1. Remove JWT_SECRET line from wrangler.toml
2. Run `wrangler secret put JWT_SECRET` with production value
3. Verify deployment works
4. Confirm no other hardcoded secrets

---

#### [SEC-02] Remove JWT_SECRET from Management wrangler.toml

| Field | Value |
|-------|-------|
| **Type** | Bug |
| **Priority** | Critical |
| **Story Points** | 2 |
| **Assignee** | Unassigned |
| **Labels** | security, jwt, management |
| **Due Date** | 2026-04-09 |

**Description:**
JWT_SECRET hardcoded in `apps/management/backend/wrangler.toml` line 16. Remove and use `wrangler secret put`.

**Steps:**
1. Remove JWT_SECRET line from wrangler.toml
2. Run `wrangler secret put JWT_SECRET` with production value
3. Verify deployment works

---

#### [SEC-03] Remove JWT fallback in Gallery syncRoutes.js

| Field | Value |
|-------|-------|
| **Type** | Bug |
| **Priority** | Critical |
| **Story Points** | 2 |
| **Assignee** | Unassigned |
| **Labels** | security, jwt, gallery |
| **Due Date** | 2026-04-09 |

**Description:**
JWT fallback to 'CHANGE_ME_IN_PRODUCTION' in `apps/gallery/backend/routes/syncRoutes.js` line 36.

**Steps:**
1. Remove fallback secret
2. Add fail-fast if JWT_SECRET not set
3. Test authentication still works

---

#### [SEC-04] Remove JWT fallback in Management server.ts

| Field | Value |
|-------|-------|
| **Type** | Bug |
| **Priority** | Critical |
| **Story Points** | 2 |
| **Assignee** | Unassigned |
| **Labels** | security, jwt, management |
| **Due Date** | 2026-04-09 |

**Description:**
JWT fallback to "fallback_secret" in `apps/management/backend/src/server.ts` line 988.

**Steps:**
1. Remove fallback secret
2. Match fail-fast pattern from config.ts
3. Test authentication still works

---

#### [SEC-05] Implement HMAC timestamp validation in Touch Kiosk

| Field | Value |
|-------|-------|
| **Type** | Bug |
| **Priority** | Critical |
| **Story Points** | 3 |
| **Assignee** | Unassigned |
| **Labels** | security, hmac, touch |
| **Due Date** | 2026-04-09 |

**Description:**
HMAC signing lacks timestamp validation allowing replay attacks. Reference: `apps/master/backend/shared/lanSigningMiddleware.ts` has correct implementation.

**Steps:**
1. Review lanSigningMiddleware.ts for correct 5-min window
2. Add timestamp validation to Touch's orderExport.ts
3. Log replay attempts
4. Test with expired timestamp

---

#### [SEC-06] Remove auto-created default user in Gallery

| Field | Value |
|-------|-------|
| **Type** | Bug |
| **Priority** | Critical |
| **Story Points** | 3 |
| **Assignee** | Unassigned |
| **Labels** | security, authentication, gallery |
| **Due Date** | 2026-04-09 |

**Description:**
Backend auto-creates user `alaeddine@example.com` with password `DEFAULT_PASSWORD_PLACEHOLDER` if not exists.

**Steps:**
1. Remove auto-creation code from server.js lines 938-970
2. Audit existing auto-created users
3. Document explicit admin creation process
4. Verify normal login still works for existing users

---

### P2 - High (1 week SLA)

#### [SEC-07] Persist CSRF tokens to database in Master

| Field | Value |
|-------|-------|
| **Type** | Bug |
| **Priority** | High |
| **Story Points** | 3 |
| **Assignee** | Unassigned |
| **Labels** | security, csrf, master |
| **Due Date** | 2026-04-16 |

**Description:**
CSRF tokens in-memory Map lost on server restart.

**Steps:**
1. Create csrf_tokens table in SQLite
2. Move token storage from Map to database
3. Add token expiration (24h)
4. Add cleanup job for expired tokens

---

#### [SEC-08] Make SERVICE_SECRET persistent in Master

| Field | Value |
|-------|-------|
| **Type** | Bug |
| **Priority** | High |
| **Story Points** | 2 |
| **Assignee** | Unassigned |
| **Labels** | security, secrets, master |
| **Due Date** | 2026-04-16 |

**Description:**
SERVICE_SECRET regenerated on every restart, breaking service-to-service auth.

**Steps:**
1. Store SERVICE_SECRET in settings table
2. Load on startup, generate only if missing
3. Add rotation mechanism

---

#### [SEC-09] Implement webhook signature verification in MoneyTrash

| Field | Value |
|-------|-------|
| **Type** | Bug |
| **Priority** | High |
| **Story Points** | 3 |
| **Assignee** | Unassigned |
| **Labels** | security, webhook, moneytrash |
| **Due Date** | 2026-04-16 |

**Description:**
`verifyWebhookSignature()` always returns true.

**Steps:**
1. Implement actual Stripe signature verification
2. Verify using STRIPE_WEBHOOK_SECRET
3. Add signature mismatch logging
4. Test with test webhook

---

#### [SEC-10] Encrypt config files in MoneyTrash

| Field | Value |
|-------|-------|
| **Type** | Technical Debt |
| **Priority** | High |
| **Story Points** | 3 |
| **Assignee** | Unassigned |
| **Labels** | security, encryption, moneytrash |
| **Due Date** | 2026-04-16 |

**Description:**
Config files stored in plaintext JSON with credentials.

**Steps:**
1. Evaluate encryption options (OS keychain vs AES)
2. Implement config encryption at rest
3. Migrate existing configs
4. Document secure storage

---

## Milestones

### Milestone: P1 Critical Fixes
**Due:** 2026-04-09  
**Tickets:** SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06

### Milestone: P2 High Fixes
**Due:** 2026-04-16  
**Tickets:** SEC-07, SEC-08, SEC-09, SEC-10

### Milestone: P3 Medium Fixes
**Due:** 2026-04-30  
**Tickets:** TBD after P1/P2 complete

---

## Labels Used

| Label | Color | Purpose |
|-------|-------|---------|
| security | red | Security issues |
| critical | red | P1 priority |
| jwt | orange | JWT related |
| hmac | orange | HMAC related |
| master | blue | Master app |
| touch | blue | Touch app |
| gallery | blue | Gallery app |
| management | blue | Management app |
| moneytrash | blue | MoneyTrash app |

---

## Related Documentation

- Audit Report: `artifacts/03-assessment/audit-reports/08-Ecosystem-Synthesis.md`
- Finding Details: `artifacts/03-assessment/findings-log/findings-log.md`
- Security Checklist: `artifacts/03-assessment/re-audit-kit/templates/checklist-security.md`

---

*Generated: 2026-04-08*