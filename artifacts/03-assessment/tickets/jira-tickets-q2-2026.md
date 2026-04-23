# ClickFlash JIRA Tickets - Q2 2026

## Individual Tickets

---

## Ticket: SEC-01 - JWT_SECRET in Gallery wrangler.toml

| Field | Value |
|-------|-------|
| **Issue Type** | Bug |
| **Project** | ClickFlash Security |
| **Key** | CF-SEC-001 |
| **Summary** | [SEC-01] JWT_SECRET hardcoded in wrangler.toml - Gallery |
| **Priority** | 🔴 Critical |
| **Labels** | security, jwt, gallery |
| **Components** | gallery-backend |
| **Affects Versions** | 4.1.0 |
| **Due Date** | 2026-04-09 |
| **Sprint** | Security Sprint 1 |

### Description

JWT_SECRET is hardcoded in `apps/gallery/backend/wrangler.toml` line 23:

```toml
JWT_SECRET = "<REDACTED:GALLERY_JWT_SECRET>"
```

This secret is checked into source control and visible in Git history.

### Impact

- Authentication bypass possible if repository is compromised
- Production JWT tokens can be forged
- Customer data exposure risk

### Acceptance Criteria

- [ ] JWT_SECRET removed from wrangler.toml
- [ ] Secret set via `wrangler secret put JWT_SECRET`
- [ ] Deployment verified working
- [ ] Git history reviewed for any other secrets

### Technical Notes

Cloudflare Workers secrets must be set via dashboard or CLI:
```bash
wrangler secret put JWT_SECRET
```

### Related

- See also: SEC-02, SEC-03, SEC-04

---

## Ticket: SEC-02 - JWT_SECRET in Management wrangler.toml

| Field | Value |
|-------|-------|
| **Issue Type** | Bug |
| **Project** | ClickFlash Security |
| **Key** | CF-SEC-002 |
| **Summary** | [SEC-02] JWT_SECRET hardcoded in wrangler.toml - Management |
| **Priority** | 🔴 Critical |
| **Labels** | security, jwt, management |
| **Components** | management-backend |
| **Affects Versions** | 4.1.0 |
| **Due Date** | 2026-04-09 |
| **Sprint** | Security Sprint 1 |

### Description

JWT_SECRET is hardcoded in `apps/management/backend/wrangler.toml` line 16:

```toml
JWT_SECRET = "<REDACTED:MANAGEMENT_JWT_SECRET>"
```

### Acceptance Criteria

- [ ] JWT_SECRET removed from wrangler.toml
- [ ] Secret set via `wrangler secret put JWT_SECRET`
- [ ] Multi-tenant isolation verified

---

## Ticket: SEC-03 - JWT fallback in Gallery syncRoutes.js

| Field | Value |
|-------|-------|
| **Issue Type** | Bug |
| **Project** | ClickFlash Security |
| **Key** | CF-SEC-003 |
| **Summary** | [SEC-03] JWT fallback to 'CHANGE_ME_IN_PRODUCTION' - Gallery |
| **Priority** | 🔴 Critical |
| **Labels** | security, jwt, gallery |
| **Components** | gallery-backend |
| **Due Date** | 2026-04-09 |

### Description

`apps/gallery/backend/routes/syncRoutes.js` line 36:
```javascript
deskData = jwt.verify(token, process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION');
```

### Acceptance Criteria

- [ ] Fallback removed
- [ ] Fail-fast if JWT_SECRET not set
- [ ] Unit test for missing secret

---

## Ticket: SEC-04 - JWT fallback in Management server.ts

| Field | Value |
|-------|-------|
| **Issue Type** | Bug |
| **Project** | ClickFlash Security |
| **Key** | CF-SEC-004 |
| **Summary** | [SEC-04] JWT fallback to 'fallback_secret' - Management |
| **Priority** | 🔴 Critical |
| **Labels** | security, jwt, management |
| **Components** | management-backend |
| **Due Date** | 2026-04-09 |

### Description

`apps/management/backend/src/server.ts` line 988:
```typescript
const secretKey = env.JWT_SECRET || "fallback_secret";
```

### Acceptance Criteria

- [ ] Fallback removed
- [ ] Match fail-fast pattern from config.ts (throws if missing)
- [ ] Unit test for missing secret

---

## Ticket: SEC-05 - HMAC timestamp validation missing - Touch

| Field | Value |
|-------|-------|
| **Issue Type** | Bug |
| **Project** | ClickFlash Security |
| **Key** | CF-SEC-005 |
| **Summary** | [SEC-05] HMAC timestamp validation missing - Touch Kiosk |
| **Priority** | 🔴 Critical |
| **Labels** | security, hmac, touch |
| **Components** | touch-backend |
| **Due Date** | 2026-04-09 |

### Description

HMAC signing for Touch-Master communication lacks timestamp validation enabling replay attacks.

**Reference implementation:** `apps/master/backend/shared/lanSigningMiddleware.ts`

### Acceptance Criteria

- [ ] Timestamp validation added (5-min window)
- [ ] Expired requests rejected
- [ ] Replay attempts logged
- [ ] Integration test for expired timestamp

---

## Ticket: SEC-06 - Auto-created default user - Gallery

| Field | Value |
|-------|-------|
| **Issue Type** | Bug |
| **Project** | ClickFlash Security |
| **Key** | CF-SEC-006 |
| **Summary** | [SEC-06] Auto-created default user credentials - Gallery |
| **Priority** | 🔴 Critical |
| **Labels** | security, authentication, gallery |
| **Components** | gallery-backend |
| **Due Date** | 2026-04-09 |

### Description

Backend auto-creates user `alaeddine@example.com` with password `DEFAULT_PASSWORD_PLACEHOLDER` if not exists.

**Location:** `apps/gallery/backend/server.js` lines 938-970

### Acceptance Criteria

- [ ] Auto-creation code removed
- [ ] Existing auto-created users audited
- [ ] Admin creation process documented
- [ ] Normal login verified for existing users

---

## Ticket: SEC-07 - CSRF tokens not persisted - Master

| Field | Value |
|-------|-------|
| **Issue Type** | Bug |
| **Project** | ClickFlash Security |
| **Key** | CF-SEC-007 |
| **Summary** | [SEC-07] CSRF tokens not persisted - Master Portal |
| **Priority** | 🟠 High |
| **Labels** | security, csrf, master |
| **Components** | master-backend |
| **Due Date** | 2026-04-16 |

### Acceptance Criteria

- [ ] CSRF tokens stored in SQLite database
- [ ] Tokens survive server restart
- [ ] Expired tokens cleaned up
- [ ] 24-hour expiration enforced

---

## Ticket: SEC-08 - SERVICE_SECRET not persistent - Master

| Field | Value |
|-------|-------|
| **Issue Type** | Bug |
| **Project** | ClickFlash Security |
| **Key** | CF-SEC-008 |
| **Summary** | [SEC-08] SERVICE_SECRET not persistent - Master Portal |
| **Priority** | 🟠 High |
| **Labels** | security, secrets, master |
| **Components** | master-backend |
| **Due Date** | 2026-04-16 |

### Acceptance Criteria

- [ ] SERVICE_SECRET stored in database
- [ ] Loaded on startup
- [ ] Generated only if missing
- [ ] Rotation mechanism documented

---

## Ticket: SEC-09 - Webhook signature not verified - MoneyTrash

| Field | Value |
|-------|-------|
| **Issue Type** | Bug |
| **Project** | ClickFlash Security |
| **Key** | CF-SEC-009 |
| **Summary** | [SEC-09] Webhook signature not verified - MoneyTrash |
| **Priority** | 🟠 High |
| **Labels** | security, webhook, moneytrash |
| **Components** | moneytrash-cloudflare |
| **Due Date** | 2026-04-16 |

### Acceptance Criteria

- [ ] Stripe signature verification implemented
- [ ] Mismatch logged
- [ ] Test webhook succeeds
- [ ] PCI compliance verified

---

## Ticket: SEC-10 - Config files unencrypted - MoneyTrash

| Field | Value |
|-------|-------|
| **Issue Type** | Technical Debt |
| **Project** | ClickFlash Security |
| **Key** | CF-SEC-010 |
| **Summary** | [SEC-10] Config files unencrypted - MoneyTrash |
| **Priority** | 🟠 High |
| **Labels** | security, encryption, moneytrash |
| **Components** | moneytrash-desktop |
| **Due Date** | 2026-04-16 |

### Acceptance Criteria

- [ ] Config encryption implemented
- [ ] Existing configs migrated
- [ ] OS keychain integration (preferred)
- [ ] Documentation updated

---

## Sprint Board Structure

```
SECURITY SPRINT 1 (Apr 8-16, 2026)
├── 🔴 P1 Critical (Due: Apr 9)
│   ├── [ ] CF-SEC-001 - JWT Gallery
│   ├── [ ] CF-SEC-002 - JWT Management
│   ├── [ ] CF-SEC-003 - JWT fallback Gallery
│   ├── [ ] CF-SEC-004 - JWT fallback Management
│   ├── [ ] CF-SEC-005 - HMAC timestamp Touch
│   └── [ ] CF-SEC-006 - Auto-created user Gallery
│
└── 🟠 P2 High (Due: Apr 16)
    ├── [ ] CF-SEC-007 - CSRF persistence Master
    ├── [ ] CF-SEC-008 - SERVICE_SECRET Master
    ├── [ ] CF-SEC-009 - Webhook MoneyTrash
    └── [ ] CF-SEC-010 - Config encryption MoneyTrash
```

---

## Definition of Done

All tickets must meet:

1. ✅ Code changes merged to main
2. ✅ Tests added/updated
3. ✅ No new security warnings
4. ✅ Verification steps completed
5. ✅ Documentation updated
6. ✅ Product Owner sign-off

---

*Generated: 2026-04-08*  
*Export Format: JIRA Markdown*