# Integration & External Dependencies Checklist

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
| I1 | Stripe Integration: Test mode used in non-production | 10 | Config review | Stripe keys | | |
| I2 | Cloudflare: CDN and security features documented | 8 | Config review | Cloudflare config | | |
| I3 | Third-Party APIs: All external calls documented | 6 | Code review | API client code | | |
| I4 | Dependency Management: Dependencies kept current | 6 | CI/CD review | Dependabot, npm outdated | | |
| I5 | API Key Rotation: External API keys rotated | 4 | Config review | Key rotation logs | | |

## External Integrations

| Integration | Purpose | Environment | Status | Last Tested |
| :--- | :--- | :--- | :--- | :--- |
| Stripe | Payments | Test | | |
| Cloudflare | CDN/WAF | Production | | |
| GitHub | CI/CD | Production | | |

## Dependency Status

| Package | Current | Latest | Behind By | Risk |
| :--- | :--- | :--- | :--- | :--- |
| React | 19.x | 19.x | | |
| Node.js | 20.x | 20.x | | |
| Electron | 29.x | 29.x | | |
| Next.js | 15-16.x | 15-16.x | | |

## API Key Management

| Key | Rotation Period | Last Rotated | Storage |
| :--- | :--- | :--- | :--- |
| Stripe API | | | |
| Cloudflare API | | | |
| JWT Secret | | | |

## Sign-off

| Role | Name | Date | Signature |
| :--- | :--- | :--- | :--- |
| Auditor | | | |
| DevOps Lead | | | |

---

*End of Checklist*
