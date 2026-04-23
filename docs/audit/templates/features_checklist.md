# Features Audit Checklist

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
| F1 | Feature Parity: Core features available across all apps | 10 | Feature matrix comparison | Feature inventory | | |
| F2 | Usability: UI follows design system and accessibility standards | 8 | UI review + accessibility test | Component library, a11y audit | | |
| F3 | Feature Backlog: Known missing features documented | 6 | Product owner interview | Backlog docs, issue tracker | | |
| F4 | Deprecation Plan: Deprecated features have migration path | 6 | Code + deprecation notices | Deprecation logs, migration guides | | |
| F5 | User Onboarding: New user flow functional and documented | 5 | Flow testing | Onboarding UI, documentation | | |
| F6 | Offline Capability: Offline-first apps work without network | 5 | Offline testing | Touch Kiosk, Master Portal | | |
| F7 | Cross-App Integration: Data flows between apps work correctly | 5 | Integration testing | Touch-Master sync, cloud sync | | |
| F8 | Performance: UI responsive under load (no blocking > 200ms) | 5 | Performance profiling | DevTools, Lighthouse | | |

## Feature Parity Matrix

| Feature | Master | Touch | MoneyTrash | Management | Gallery | Website | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Authentication | Yes | Yes | N/A | Yes | Yes | N/A | Critical |
| Photo Upload | Yes | Yes | Yes | Yes | N/A | N/A | Critical |
| Order Management | Yes | Yes | No | Yes | Yes | N/A | Critical |
| Payment Processing | No | No | No | No | Yes | No | High |
| Cloud Sync | Yes | Yes | No | No | No | No | High |
| Offline Mode | Yes | Yes | No | No | No | No | High |
| Dashboard Analytics | Yes | No | No | Yes | Yes | No | Medium |
| Photo Culling | Yes | No | No | No | No | No | Medium |
| Face Recognition | Yes | Yes | No | No | No | No | Medium |
| Gallery View | Yes | Yes | No | Yes | Yes | Yes | Medium |

## Known Gaps

| Gap ID | Feature | Affected Apps | Workaround | Priority |
| :--- | :--- | :--- | :--- | :--- |

## Deprecated Features

| Feature | Deprecated Date | Removal Date | Migration Path | Status |
| :--- | :--- | :--- | :--- | :--- |

## Sign-off

| Role | Name | Date | Signature |
| :--- | :--- | :--- | :--- |
| Auditor | | | |
| Product Owner | | | |

---

*End of Checklist*
