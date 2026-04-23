# Findings Log - ClickFlash Ecosystem Audit

**Version:** 1.0  
**Date:** 2026-04-08  
**Audit Phase:** Phase 3 - Assessment  
**Status:** In Progress  

---

## Findings Summary

| Finding ID | Title | App | Domain | Severity | Status |
|------------|-------|-----|--------|----------|--------|
| F-SEC-001 | Default Admin Password Fallback Insecure | Master | Security | High | **Fixed** |
| F-SEC-002 | Default Admin Password Fallback (Cross-App) | Touch | Security | High | **Fixed** |
| F-SEC-003 | Hardcoded JWT Secret in Gallery Backend | Gallery | Security | Critical | **Fixed** |
| F-SEC-004 | Fallback JWT Secrets in Management Backend | Management | Security | High | **Fixed** |
| F-SEC-005 | Hardcoded JWT_SECRET in Gallery wrangler.toml | Gallery | Security | Critical | **Fixed** |
| F-SEC-006 | Hardcoded JWT_SECRET in Management wrangler.toml | Management | Security | Critical | **Fixed** |
| F-SEC-007 | JWT fallback 'CHANGE_ME_IN_PRODUCTION' in syncRoutes | Gallery | Security | Critical | **Fixed** |
| F-SEC-008 | JWT fallback 'fallback_secret' in Management server.ts | Management | Security | Critical | **Fixed** |
| F-SEC-009 | HMAC timestamp validation missing in Touch Kiosk | Touch | Security | Critical | **Fixed** |
| F-SEC-010 | Auto-created default user credentials in Gallery | Gallery | Security | Critical | **Fixed** |
| F-SEC-011 | CSRF tokens not persisted to database | Master | Security | High | **Fixed** |
| F-SEC-012 | SERVICE_SECRET not persistent across restarts | Master | Security | High | **Fixed** |
| F-SEC-013 | Webhook signature verification always returns true | MoneyTrash | Security | High | **Fixed** |
| F-SEC-014 | Config files stored unencrypted | MoneyTrash | Security | High | **Fixed** |
| F-ARCH-001 | preload.js Missing from electron-builder (Fix Applied) | Master | Architecture | Medium | **Verified Fixed** |
| F-ARCH-002 | CPP Clone Not a Simple Clone - Full C++ Rewrite | CPP | Architecture | Info | Open - Scope Clarification |
| F-ARCH-003 | No GitHub Actions CI/CD Pipelines | All | Architecture | Medium | **Fixed** |
| F-BACK-001 | No Circuit Breakers in Backend API | Master | Backend | Medium | **Fixed** |
| F-DATA-001 | No Explicit PII Handling Documentation | Master | Data Governance | Medium | **Fixed** |
| F-COMP-001 | No GDPR/CCPA Compliance Documentation | All | Compliance | High | **Documented** |
| F-FEAT-001 | No Feature Flags System Implemented | All | Features | Low | **Fixed** |
| F-FEAT-002 | MoneyTrash Lacks Dark Mode Support | MoneyTrash | Features | Low | **Closed - Dark-only Design** |
| F-FEAT-003 | Website Lacks Dark Mode Support | Website | Features | Low | **Closed - Not Required** |

---

## Severity Definitions

| Severity | Description | SLA |
|----------|-------------|-----|
| Critical | Immediate production impact, breach potential | 24 hours |
| High | Significant issue affecting core functionality | 1 week |
| Medium | Moderate issue with workaround available | 2 weeks |
| Low | Minor issue, low business impact | 1 month |
| Info | Observation, no immediate action required | Backlog |

---

## Domain Definitions

| Domain Code | Domain Name |
|-------------|-------------|
| ARCH | Architecture |
| SEC | Security |
| FEAT | Features |
| BACK | Backend/API |
| PERF | Performance |
| DATA | Data Governance |
| COMP | Compliance |

---

## App Codes

| Code | App Name |
|------|----------|
| MSTR | Master Portal |
| TCH | Touch Kiosk |
| MONEY | MoneyTrash |
| MGMT | Management Hub |
| GALL | Customer Gallery |
| WEB | Main Website |
| CPP | COP Master Clone (master-cpp) |

---

## Finding Template Reference

Use template: `artifacts/templates/finding-template.md`

Fields required:
- Finding ID (auto-increment: F-[DOMAIN]-[###])
- Date
- App
- Domain
- Severity
- Description
- Evidence (min 2 items)
- Impact
- Recommendation
- References
- Owner
- Status

---

## Cross-Domain Findings

| Finding ID | Related Domains | Correlation Notes |
|------------|----------------|---------------------|

---

## Pending Assessment Areas

| App | Domain | Status | Notes |
|-----|--------|--------|-------|
| MSTR | ARCH | Pending | |
| MSTR | SEC | Pending | |
| MSTR | FEAT | Pending | |
| MSTR | BACK | Pending | |
| MSTR | PERF | Pending | |
| MSTR | DATA | Pending | |
| MSTR | COMP | Pending | |
| TCH | All | Pending | |
| MONEY | All | Pending | |
| MGMT | All | Pending | |
| GALL | All | Pending | |
| WEB | All | Pending | |
| CPP | All | Pending | |

---

**Document Control:**
- Version: 1.0
- Created: 2026-04-08
- Next Update: Upon assessment completion
