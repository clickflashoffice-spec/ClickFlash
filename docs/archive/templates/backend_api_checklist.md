# Backend Routing & API Contracts Checklist

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
| B1 | Routing Logic: All routes documented and mapped to handlers | 10 | Route catalog vs. code | Route files, Express app config | | |
| B2 | Load Balancing: Distribution strategy documented | 8 | Config + interview | Reverse proxy config | | |
| B3 | API Versioning: Version strategy implemented (URL or header) | 8 | Code review | Version routing logic | | |
| B4 | Backward Compatibility: Breaking changes flagged and documented | 6 | Changelog review | Version deprecation notices | | |
| B5 | Circuit Breakers: Resilient failure handling for external calls | 6 | Code review | Circuit breaker implementations | | |
| B6 | Request Validation: Zod schemas enforce contract | 5 | Code review | Validation middleware | | |
| B7 | Response Consistency: Consistent response format across routes | 5 | API testing | Response schemas | | |
| B8 | Error Responses: Standardized error format (code, message, details) | 5 | API testing | Error handler middleware | | |
| B9 | Rate Limiting: Per-route rate limits enforced | 4 | Config review | Rate limiter config | | |
| B10 | Documentation: API documentation matches implementation | 4 | Doc vs. code comparison | API.md vs. route files | | |

## API Route Summary

### Master Portal (26 routes)
| Route | Methods | Handler | Auth | Status |
| :--- | :--- | :--- | :--- | :--- |
| /api/auth | POST | auth.ts | None | |
| /api/collections | GET,POST,PUT,DELETE | collections.ts | Session | |
| /api/cloud | GET,POST | cloud.ts | Session | |
| /api/orders | GET,POST,PUT,DELETE | orders.ts | Session | |
| /api/faces | GET,POST | faces.ts | Session | |
| /api/culling | GET,POST | culling.ts | Session | |
| /api/pairing | GET,POST | pairing.ts | HMAC | |
| /api/sync | GET,POST | sync.ts | Session | |
| /api/files | GET,POST,DELETE | files.ts | Session | |
| /api/system | GET | system.ts | Session | |
| /api/realtime | GET | realtime.ts | Session | |
| /api/dashboard | GET | dashboard.ts | Session | |
| /api/analytics | GET | analytics.ts | Session | |
| /api/export | GET,POST | export.ts | Session | |
| /api/gallery | GET,POST | gallery.ts | Session | |
| /api/galleryAuth | POST | galleryAuth.ts | Token | |
| /api/galleryCheckout | POST | galleryCheckout.ts | Session | |
| /api/notification | GET,POST | notification.ts | Session | |
| /api/ledger | GET,POST | ledger.ts | Session | |
| /api/health | GET | health.ts | None | |
| /api/assistance | GET,POST | assistance.ts | Session | |
| /api/sessionTypes | GET,POST | sessionTypes.ts | Session | |
| /api/resortAnalytics | GET | resortAnalytics.ts | Session | |
| /api/marketing | GET,POST | marketing.ts | Session | |

### Touch Kiosk (9 routes)
| Route | Methods | Handler | Auth | Status |
| :--- | :--- | :--- | :--- | :--- |
| /api/auth | POST | auth.ts | HMAC | |
| /api/collections | GET,POST,PUT,DELETE | collections.ts | HMAC | |
| /api/orders | GET,POST | orders.ts | HMAC | |
| /api/orders/:id/export-to-master | POST | orderExport.ts | HMAC | |
| /api/sync | GET,POST | sync.ts | HMAC | |
| /api/files | GET,POST,DELETE | files.ts | HMAC | |
| /api/system | GET | system.ts | HMAC | |
| /api/realtime | GET | realtime.ts | HMAC | |
| /api/faces | GET,POST | faces.ts | HMAC | |

## Versioning Strategy

| Aspect | Current Strategy | Implementation | Compliance |
| :--- | :--- | :--- | :--- |
| URL Versioning | | | |
| Header Versioning | | | |
| Deprecation Policy | | | |

## Circuit Breaker Status

| External Service | Implementation | Status | Failure Threshold | Timeout |
| :--- | :--- | :--- | :--- | :--- |
| Stripe | | | | |
| Cloudflare | | | | |
| Cloud Sync | | | | |

## Sign-off

| Role | Name | Date | Signature |
| :--- | :--- | :--- | :--- |
| Auditor | | | |
| Backend Lead | | | |

---

*End of Checklist*
