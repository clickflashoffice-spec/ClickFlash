# Data Governance & Privacy Checklist

## Assessment Information
| Field | Value |
| :--- | :--- |
| App | [App Name] |
| Assessment Date | [Date] |
| Auditor | [Name] |
| Overall Score | [X/100] |
| Rating | [Excellent/Good/Acceptable/Poor/Critical] |

## Assessment Criteria

| # | Criterion | Weight | Assessment Method | Evidence Source | Score | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| D1 | Data Flow Mapping: All data flows documented | 10 | Code + interview | Data flow diagrams | | |
| D2 | Data Lineage: Source to destination tracking implemented | 8 | Code review | Audit logs, tracing | | |
| D3 | Data Classification: PII/sensitive data categorized | 8 | Schema review | Classification tags | | |
| D4 | Retention Policy: Documented retention periods enforced | 6 | Policy + code review | Retention cleanup scripts | | |
| D5 | Data Minimization: Only necessary data collected | 6 | Schema + feature review | Field necessity analysis | | |
| D6 | Access Logging: Data access logged with user/timestamp | 5 | Config + log review | Audit log configs | | |
| D7 | Right to Deletion: Deletion mechanism implemented | 5 | Code review | Deletion endpoints | | |
| D8 | Consent Management: User consent tracked and respected | 4 | Feature review | Consent UI/logic | | |

## Data Classification

| Data Type | Classification | Storage Location | Access Control | Encryption |
| :--- | :--- | :--- | :--- | :--- |
| Customer Names | PII | SQLite | Role-based | At rest |
| Customer Emails | PII | SQLite | Role-based | At rest |
| Customer Phone | PII | SQLite | Role-based | At rest |
| Payment Info | Sensitive | Stripe | Tokenized | N/A |
| Photos | Confidential | Local/Cloud | Role-based | At rest |
| Order Data | Internal | SQLite | Role-based | At rest |

## Data Flow Summary

| Flow ID | Source | Destination | Data Types | Classification | Security Controls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| DF-01 | User Input | SQLite | PII | Encrypted | |
| DF-02 | Photo Upload | File Storage | Confidential | Encrypted | |
| DF-03 | Order Create | SQLite | Internal | Access control | |
| DF-04 | Payment | Stripe | Sensitive | Tokenized | |

## Retention Policy

| Data Type | Retention Period | Disposal Method | Enforcement |
| :--- | :--- | :--- | :--- |
| Customer PII | | | |
| Order Data | | | |
| Photos | | | |
| Audit Logs | | | |

## Consent Management

| Consent Type | UI Implementation | Storage | Enforcement |
| :--- | :--- | :--- | :--- |
| Marketing Emails | | | |
| Photo Usage | | | |
| Data Sharing | | | |

## Sign-off

| Role | Name | Date | Signature |
| :--- | :--- | :--- | :--- |
| Auditor | | | |
| DPO | | | |

---

*End of Checklist*
