# Data Governance & Privacy Assessment - All Apps

**App:** All Apps  
**Assessor:** Audit Lead  
**Date:** 2026-04-08  
**Version:** 2.0  
**Status:** Complete  

---

## Scoring Legend

| Score | Rating | Description |
|-------|--------|-------------|
| 5 | Exceptional | Exceeds expectations, best practice |
| 4 | Good | Meets expectations, minor improvements |
| 3 | Acceptable | Meets basic requirements |
| 2 | Below Average | Does not fully meet requirements |
| 1 | Poor | Significant gaps |
| 0 | Not Present | Not implemented |
| N/A | Not Applicable | Criterion does not apply |

---

## Data Governance & Privacy Checklist

| ID | Criterion | Weight | Score | Evidence | Notes |
|----|-----------|--------|-------|----------|-------|
| D-01 | Data flow diagram current | 15 | 5 | artifacts/diagrams/ | Documented |
| D-02 | PII inventory complete | 15 | 5 | pii-inventory.md | Complete |
| D-03 | Data classification applied | 10 | 4 | Classification defined | Partial |
| D-04 | Retention policy documented | 10 | 3 | Not fully documented | Partial |
| D-05 | Data minimization followed | 10 | 4 | Collected data minimal | Generally good |
| D-06 | Consent management | 10 | 0 | Not implemented | Gap |
| D-07 | Right to deletion supported | 5 | 0 | Not implemented | Gap |
| D-08 | Data export capability | 5 | 0 | Not implemented | Gap |
| D-09 | Cross-border transfers documented | 10 | 2 | Partial | Cloudflare only |
| D-10 | Data lineage tracked | 5 | 3 | auditLogger.ts | Partial |
| D-11 | COP data masking verified | 5 | 5 | N/A for Node.js apps | Not applicable |

---

## Calculations

| Metric | Value |
|--------|-------|
| Total Weight | 100 |
| Weighted Score | 365 |
| Maximum Possible | 550 |
| Percentage | 66% |
| Passing Score | 55/55 (100%) |
| **Status** | **FAIL - 100% Required** |

**Critical Gaps:** No consent management, no right to deletion, no data export, GDPR/CCPA compliance incomplete

---

## PII Inventory

| Data Type | Location | Classification | Protection | Retention |
|-----------|----------|----------------|------------|------------|
| Customer Name | SQLite/D1 | PII | Encrypted | Duration + 30 days |
| Email | SQLite/D1 | PII | Encrypted | Duration + 30 days |
| Phone | SQLite/D1 | PII | Encrypted | Duration + 30 days |
| Address | SQLite/D1 | PII | Encrypted | Until order complete |
| Payment | Stripe | PCI | Stripe MSA | Per Stripe |
| Photos | R2 | PII | Encrypted | 3 years |

---

## Findings

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| F-DATA-010 | No consent management | High | Open |
| F-DATA-011 | No right to deletion | High | Open |
| F-DATA-012 | No data export feature | High | Open |
| F-DATA-013 | Cross-border transfers incomplete | Medium | Open |

---

**Assessor:** Audit Lead  
**Reviewer:** TBD  
**Date:** 2026-04-08  
