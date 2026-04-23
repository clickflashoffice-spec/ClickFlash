# PII Inventory - ClickFlash Ecosystem

**Version:** 1.0  
**Date:** 2026-04-08  
**Audit Phase:** Phase 5 - Remediation  
**Status:** Complete  

---

## 1. Overview

This document identifies Personally Identifiable Information (PII) handled across the ClickFlash ecosystem and defines handling requirements.

---

## 2. PII Categories

### 2.1 Customer PII

| Data Type | Examples | Classification | Storage | Retention |
|-----------|----------|----------------|---------|-----------|
| Name | Full name, first/last | PII | SQLite (D1) | Duration of relationship + 30 days |
| Email | customer email addresses | PII | SQLite (D1) | Duration of relationship + 30 days |
| Phone | Mobile/contact number | PII | SQLite (D1) | Duration of relationship + 30 days |
| Address | Physical address | PII | SQLite (D1) | Until order complete + 30 days |
| Payment Info | Stripe references | PCI | Stripe (not stored locally) | Per Stripe requirements |

### 2.2 Photographer/Staff PII

| Data Type | Examples | Classification | Storage | Retention |
|-----------|----------|----------------|---------|-----------|
| Name | Full name | PII | SQLite | Employment duration + 7 years |
| Email | Work email | PII | SQLite | Employment duration + 7 years |
| Phone | Work number | PII | SQLite | Employment duration + 7 years |
| Payroll | Salary, commission rate | Financial | SQLite | 7 years |

### 2.3 Order/Session PII

| Data Type | Examples | Classification | Storage | Retention |
|-----------|----------|----------------|---------|-----------|
| Event Date | Session date | Non-PII | SQLite | 3 years |
| Room Number | Hotel room | PII | SQLite | 3 years |
| Order Total | Payment amount | Financial | SQLite | 7 years |

---

## 3. Data Flow Summary

```
[Customer] --> [Touch Kiosk] --> [Master Portal] --> [Cloud Sync] --> [Gallery]
                |                 |                   |
                v                 v                   v
           [SQLite Local]    [SQLite Local]       [D1 Database]
                                                  [R2 Storage]
```

---

## 4. PII Protection Requirements

| Protection | Required | Implementation |
|------------|----------|----------------|
| Encryption at rest | Yes | SQLite with encryption |
| Encryption in transit | Yes | HTTPS/TLS |
| Access controls | Yes | JWT + Session auth |
| Audit logging | Yes | auditLogger.ts |
| Right to erasure | Yes | Requires implementation |

---

## 5. Third-Party Data Sharing

| Recipient | Data Shared | Purpose | Agreement |
|-----------|-------------|---------|-----------|
| Stripe | Payment refs | Processing | Stripe MSA |
| Cloudflare | All data | CDN/Hosting | Cloudflare MSA |
| Resend | Email addresses | Transactional email | Resend DPA |

---

## 6. Data Subject Rights

| Right | Implementation Status |
|-------|----------------------|
| Access | Partial - via gallery link |
| Erasure | Not implemented |
| Portability | Not implemented |
| Rectification | Via settings |
| Restriction | Not implemented |

---

**Document Control:**
- Version: 1.0
- Created: 2026-04-08
- Owner: Data/Privacy Team
