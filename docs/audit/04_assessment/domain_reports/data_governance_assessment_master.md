# Data Governance & Privacy Checklist — Master Portal

## Assessment Information
| Field | Value |
| :--- | :--- |
| App | Master Portal (Electron + React 19 + Express + SQLite) |
| Assessment Date | April 8, 2026 |
| Auditor | [Audit Lead] |
| Overall Score | 70/100 |
| Rating | **Acceptable** |

## Assessment Criteria

| # | Criterion | Weight | Assessment Method | Evidence Source | Score | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| D1 | Data Flow Mapping: All data flows documented | 10 | Code + interview | Data flow diagrams | 8 | Data flows mapped; need formal diagram |
| D2 | Data Lineage: Source to destination tracking implemented | 8 | Code review | Audit logs, tracing | 7 | Audit logging present; full lineage needs work |
| D3 | Data Classification: PII/sensitive data categorized | 8 | Schema review | Database schema | 5 | **No explicit classification in schema** |
| D4 | Retention Policy: Documented retention periods enforced | 6 | Policy + code review | Retention scripts | 4 | No retention policy enforcement found |
| D5 | Data Minimization: Only necessary data collected | 6 | Schema + feature review | Field analysis | 7 | Schema appears reasonable; some unused fields |
| D6 | Access Logging: Data access logged with user/timestamp | 5 | Config + log review | AuditLogger | 8 | AuditLogger implemented |
| D7 | Right to Deletion: Deletion mechanism implemented | 5 | Code review | Delete endpoints | 8 | DELETE endpoints exist for collections |
| D8 | Consent Management: User consent tracked and respected | 4 | Feature review | Consent UI | 3 | **No explicit consent tracking** |

**Overall Score: 70/100 (Acceptable)**

---

## Detailed Findings

### Finding D3: Data Classification — HIGH PRIORITY
| Field | Value |
| :--- | :--- |
| Status | **FAIL** |
| Evidence | Database schema in `constants.ts` shows columns for PII (email, phone, customer data) but no classification metadata. |
| Issues Found | - No PII classification tags<br>- No sensitive data markers<br>- Can't identify PII columns programmatically |
| Recommendations | 1. Add classification metadata to schema documentation<br>2. Create PII inventory spreadsheet<br>3. Tag PII columns in database comments/metadata |

### Finding D4: Retention Policy — HIGH PRIORITY
| Field | Value |
| :--- | :--- |
| Status | **FAIL** |
| Evidence | No retention policy script or enforcement found in codebase. No cleanup cron jobs. |
| Issues Found | - No retention period defined<br>- No automated cleanup<br>- Data grows indefinitely |
| Recommendations | 1. Define retention periods by data type<br>2. Implement cleanup jobs (e.g., delete photos > 2 years)<br>3. Add retention policy to documentation |

### Finding D8: Consent Management — HIGH PRIORITY
| Field | Value |
| :--- | :--- |
| Status | **FAIL** |
| Evidence | No consent tracking found. No GDPR consent UI component. |
| Issues Found | - No marketing consent checkbox<br>- No photo usage consent<br>- No data sharing consent |
| Recommendations | 1. Add consent UI for new user registration<br>2. Track consent in database<br>3. Allow users to view/update consent |

---

## Data Classification

| Data Type | Classification | Storage Location | Access Control | Encryption |
| :--- | :--- | :--- | :--- | :--- |
| Customer Names | **PII - Unclassified** | `orders.clientName`, `customers.name` | Role-based | None |
| Customer Emails | **PII - Unclassified** | `orders.email`, `albums.customerEmail` | Role-based | None |
| Customer Phone | **PII - Unclassified** | `orders.phone` | Role-based | None |
| Payment Info | **Sensitive** | Stripe (not stored locally) | Tokenized | N/A |
| Photos | **Confidential** | `pb_data/uploads/` | Role-based | None at rest |
| Order Data | **Internal** | `orders` table | Role-based | None |
| User Passwords | **Secret** | `users.password` | bcrypt hashed | Hash only |
| HMAC Secrets | **Secret** | `kiosks.signingSecret` | Admin only | None |

## Data Flow Summary

| Flow ID | Source | Destination | Data Types | Classification | Security Controls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| DF-01 | User Input | SQLite | PII (name, email, phone) | Unclassified | Session auth |
| DF-02 | Photo Upload | File Storage | Confidential (photos) | Unclassified | Role-based |
| DF-03 | Order Create | SQLite | Internal (order data) | Internal | Session auth |
| DF-04 | Payment | Stripe | Sensitive (card) | Tokenized | Stripe handled |
| DF-05 | Touch Sync | Master | Internal | Internal | HMAC signature |

---

## Evidence Collected

| Evidence ID | Type | Description | Path | Collected |
| :--- | :--- | :--- | :--- | :--- |
| DATA-M-001 | Schema | Column mapping | `apps/master/backend/config/constants.ts` | ✅ |
| DATA-M-002 | Code | AuditLogger | `apps/master/backend/shared/auditLogger.ts` | ✅ |
| DATA-M-003 | Code | Delete routes | `apps/master/backend/routes/collections.ts` | ✅ |

---

## Sign-off

| Role | Name | Date | Signature |
| :--- | :--- | :--- | :--- |
| Auditor | | | |
| DPO | | | |

---

*End of Checklist — Master Portal Data Governance*
