# Remediation Backlog - Prioritized (v2.0)

**Version:** 2.0  
**Date:** 2026-04-08  
**Owner:** Audit Lead  
**Status:** Phase 5 Complete  

---

## 1. Priority Rubric

| Priority | Criteria | Target Timeline |
|----------|----------|-----------------|
| P1 | Critical severity + High impact | Immediate (1-2 days) |
| P2 | High severity + Medium impact | This sprint (1 week) |
| P3 | Medium severity + Low impact | Next sprint (2 weeks) |
| P4 | Low/Info only | Backlog |

**Policy:** All domains require 100% compliance. Any score below 100% generates mandatory remediation.

---

## 2. All Findings Summary

| Domain | Pre-Existing | New | Total | Fixed | Open |
|--------|--------------|-----|-------|-------|------|
| Architecture | 3 | 2 | 5 | 2 | 3 |
| Security | 4 | 2 | 6 | 4 | 2 |
| Backend | 1 | 2 | 3 | 1 | 2 |
| Data Governance | 1 | 4 | 5 | 1 | 4 |
| Compliance | 1 | 5 | 6 | 1 | 5 |
| Features | 3 | 2 | 5 | 2 | 3 |
| Performance | 0 | 4 | 4 | 0 | 4 |
| **Total** | **13** | **22** | **35** | **11** | **24** |

---

## 3. Prioritized Remediation Backlog

| ID | Finding | App | Domain | Severity | Priority | Status |
|----|---------|-----|--------|----------|---------|--------|
| R-001 | F-SEC-003: Hardcoded JWT Secret | Gallery | Security | Critical | P1 | **Fixed** |
| R-002 | F-SEC-001: Default Password Fallback | Master | Security | High | P1 | **Fixed** |
| R-003 | F-SEC-002: Default Password Fallback | Touch | Security | High | P1 | **Fixed** |
| R-004 | F-SEC-004: Fallback JWT Secrets | Management | Security | High | P1 | **Fixed** |
| R-005 | F-DATA-010: No consent management | All | Data | High | P1 | Open |
| R-006 | F-DATA-011: No right to deletion | All | Data | High | P1 | Open |
| R-007 | F-DATA-012: No data export feature | All | Data | High | P1 | Open |
| R-008 | F-COMP-010: GDPR requirements not met | All | Compliance | High | P1 | Open |
| R-009 | F-COMP-011: CCPA requirements not met | All | Compliance | High | P1 | Open |
| R-010 | F-ARCH-001: preload.js Fix | Master | Architecture | Medium | P2 | **Fixed** |
| R-011 | F-ARCH-003: No CI/CD Pipelines | All | Architecture | Medium | P2 | **Fixed** |
| R-012 | F-BACK-001: No Circuit Breakers | Master | Backend | Medium | P2 | **Fixed** |
| R-013 | F-DATA-001: PII inventory | Master | Data | Medium | P2 | **Documented** |
| R-014 | F-COMP-001: GDPR/CCPA docs | All | Compliance | High | P2 | **Documented** |
| R-015 | F-FEAT-001: Feature flags system | All | Features | Low | P3 | **Fixed** |
| R-016 | F-FEAT-002: MoneyTrash dark mode | MoneyTrash | Features | Low | P4 | **Closed** |
| R-017 | F-ARCH-010: Scalability targets | Master | Architecture | Low | P3 | Open |
| R-018 | F-ARCH-011: Technical debt tracking | Master | Architecture | Low | P3 | Open |
| R-019 | F-SEC-010: Key rotation | Master | Security | Medium | P2 | Open |
| R-020 | F-SEC-011: Config drift monitoring | Master | Security | Medium | P2 | Open |
| R-021 | F-BACK-010: API versioning | Master | Backend | Low | P3 | Open |
| R-022 | F-BACK-011: Error format | Master | Backend | Low | P3 | Open |
| R-023 | F-DATA-013: Cross-border transfers | All | Data | Medium | P2 | Open |
| R-024 | F-COMP-012: Access reviews | All | Compliance | High | P2 | Open |
| R-025 | F-COMP-013: Incident response plan | All | Compliance | High | P2 | Open |
| R-026 | F-FEAT-003: Website dark mode | Website | Features | Low | P4 | Open |
| R-027 | F-FEAT-010: Deprecation policy | All | Features | Medium | P3 | Open |
| R-028 | F-FEAT-011: Accessibility audit | All | Features | Low | P3 | Open |
| R-029 | F-PERF-010: SLA/SLO defined | Master | Performance | High | P2 | Open |
| R-030 | F-PERF-011: Error budget | Master | Performance | High | P2 | Open |
| R-031 | F-PERF-012: MTTR targets | Master | Performance | Medium | P3 | Open |
| R-032 | F-PERF-013: Recovery tested | Master | Performance | Medium | P3 | Open |
| R-033 | F-COMP-014: Regulatory reporting | All | Compliance | Medium | P3 | Open |
| R-034 | F-ARCH-002: CPP scope clarification | CPP | Architecture | Info | P4 | Open |

---

## 4. Summary by Priority

| Priority | Count | Total Effort |
|----------|-------|--------------|
| P1 | 8 | 16 days |
| P2 | 12 | 30 days |
| P3 | 9 | 14 days |
| P4 | 3 | 1 day |
| **Total** | **32** | **61 days** |

---

## 5. Compliance Summary by Domain

| Domain | Current Score | Target | Gap | Status |
|--------|---------------|--------|-----|--------|
| Architecture | 91% | 100% | 9% | FAIL |
| Security | 88% | 100% | 12% | FAIL |
| Backend | 85% | 100% | 15% | FAIL |
| Performance | 51% | 100% | 49% | FAIL |
| Data Governance | 66% | 100% | 34% | FAIL |
| Compliance | 59% | 100% | 41% | FAIL |
| Features | 89% | 100% | 11% | FAIL |

---

## 6. Immediate Actions (P1 - Week 1-2)

| ID | Action | Owner | Due Date | Status |
|----|--------|-------|----------|--------|
| R-005 | Implement consent management | Dev + Legal | 2026-04-15 | Open |
| R-006 | Implement right to deletion workflow | Dev | 2026-04-15 | Open |
| R-007 | Implement data export feature | Dev | 2026-04-15 | Open |
| R-008 | GDPR compliance program | Legal/Privacy | 2026-04-20 | Open |
| R-009 | CCPA compliance program | Legal/Privacy | 2026-04-20 | Open |

---

## 7. Risk Register

| Risk ID | Description | Likelihood | Impact | Score | Mitigation | Owner | Status |
|---------|-------------|------------|--------|-------|------------|-------|--------|
| R-01 | PII breach due to missing consent | Medium | Critical | 8 | Implement consent | Legal | Open |
| R-02 | Regulatory fines GDPR | Medium | Critical | 8 | GDPR program | Legal | Open |
| R-03 | Service outage no SLA | Medium | High | 6 | Define SLA/SLO | DevOps | Open |
| R-04 | Data loss no backup test | Low | High | 3 | Test recovery | DevOps | Open |

---

**Document Control:**
- Version: 2.0
- Created: 2026-04-08
- Updated: 2026-04-08
- Next Update: Weekly during remediation
