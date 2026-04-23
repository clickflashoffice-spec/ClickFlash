# Traceability Matrix

**Audit Period:** 2026-04-08  
**Last Updated:** 2026-04-08  
**Version:** 1.0  

---

## Finding Traceability

| Finding ID | Title | Domain | App | Severity | Remediation ID | Status |
|------------|-------|--------|-----|----------|----------------|--------|
| F-SEC-001 | Default Admin Password Fallback Insecure | Security | Master | High | R-002 | Open |
| F-SEC-002 | Default Admin Password Fallback (Cross-App) | Security | Touch | High | R-003 | Open |
| F-SEC-003 | Hardcoded JWT Secret in Gallery Backend | Security | Gallery | Critical | R-001 | Open |
| F-SEC-004 | Fallback JWT Secrets in Management Backend | Security | Management | High | R-004 | Open |
| F-ARCH-001 | preload.js Missing from electron-builder | Architecture | Master | Medium | R-009 | Open |
| F-ARCH-002 | CPP Clone Not a Simple Clone | Architecture | CPP | Info | R-013 | Open |
| F-ARCH-003 | No GitHub Actions CI/CD Pipelines | Architecture | All | Medium | R-006 | Open |
| F-BACK-001 | No Circuit Breakers in Backend API | Backend | Master | Medium | R-007 | Open |
| F-DATA-001 | No Explicit PII Handling Documentation | Data Governance | Master | Medium | R-008 | Open |
| F-COMP-001 | No GDPR/CCPA Compliance Documentation | Compliance | All | High | R-005 | Open |
| F-FEAT-001 | No Feature Flags System Implemented | Features | All | Low | R-010 | Open |
| F-FEAT-002 | MoneyTrash Lacks Dark Mode Support | Features | MoneyTrash | Low | R-011 | Open |
| F-FEAT-003 | Website Lacks Dark Mode Support | Features | Website | Low | R-012 | Open |

---

## Requirement Coverage

| Requirement ID | Description | Source | Findings |
|---------------|-------------|--------|----------|
| SEC-02 | Secrets not in code | Audit Plan | F-SEC-001, F-SEC-002, F-SEC-003, F-SEC-004 |
| SEC-03 | Secrets in env files only | Audit Plan | F-SEC-001, F-SEC-002, F-SEC-003, F-SEC-004 |
| COMP-01 | GDPR compliance | Regulatory | F-COMP-001 |
| COMP-02 | CCPA compliance | Regulatory | F-COMP-001 |
| DATA-02 | PII inventory complete | Audit Plan | F-DATA-001 |
| FEAT-03 | Dark mode support | Feature Parity | F-FEAT-002, F-FEAT-003 |

---

## Remediation Tracking

| Remediation ID | Finding ID | Description | Priority | Status |
|----------------|------------|-------------|----------|--------|
| R-001 | F-SEC-003 | Remove hardcoded JWT, add env validation | P1 | **Fixed** |
| R-002 | F-SEC-001 | Fail-fast if DEFAULT_ADMIN_PASSWORD not set | P1 | **Fixed** |
| R-003 | F-SEC-002 | Fail-fast if DEFAULT_ADMIN_PASSWORD not set | P1 | **Fixed** |
| R-004 | F-SEC-004 | Fail-fast if JWT_SECRET not set | P1 | **Fixed** |
| R-005 | F-COMP-001 | Implement GDPR/CCPA compliance program | P2 | Open |
| R-006 | F-ARCH-003 | Create CI/CD pipelines | P2 | Open |
| R-007 | F-BACK-001 | Implement circuit breakers | P2 | Open |
| R-008 | F-DATA-001 | Document PII fields and handling | P2 | Open |
| R-009 | F-ARCH-001 | Verify preload.js in build | P2 | Open |
| R-010 | F-FEAT-001 | Implement feature flags system | P3 | Open |
| R-011 | F-FEAT-002 | Add dark mode to MoneyTrash | P3 | Open |
| R-012 | F-FEAT-003 | Add dark mode to Website | P3 | Open |
| R-013 | F-ARCH-002 | Clarify CPP audit scope | P4 | Open |

---

**Document Control:**
- Version: 1.0
- Author: Audit Team
