# ClickFlash — Production Hardening & Testing Plan
> **Generated:** June 2026  
> **Goal:** Validate the ecosystem is safe, fast, reliable, and recoverable in production  
> **Scope:** All 7 apps, local + cloud, functional + non-functional

---

## 1. Production Hardening Checklist

### 1.1 Application Hardening
| # | Control | Implementation | Verification |
|---|---------|----------------|------------|
| H1 | TypeScript strict mode | `strict: true` in every `tsconfig.json` | `tsc --noEmit` passes |
| H2 | Dependency audit | `pnpm audit --prod` | 0 high/critical advisories |
| H3 | Secret management | Vault / GitHub Secrets, no `.env` in images | `grep -R "secret" dist/` empty |
| H4 | Electron CSP | `Content-Security-Policy` in preload | DevTools network panel |
| H5 | Electron sandbox | `sandbox: true`, `contextIsolation: true` | `webPreferences` audit |
| H6 | Worker security headers | CSP + HSTS + X-Content-Type-Options | `curl -I` on deployed worker |
| H7 | SQLite encryption | SQLCipher AES-256 | Open db file, verify encrypted |
| H8 | JWT algorithm | RS256, key rotation, short expiry | Decode token header |
| H9 | LAN HMAC signing | HMAC-SHA256 with replay window | Unit tests + packet capture |
| H10 | File upload validation | Magic bytes + size + extension | Malicious file upload test |

### 1.2 Infrastructure Hardening
| # | Control | Implementation | Verification |
|---|---------|----------------|------------|
| H11 | Container non-root user | Dockerfile `USER node` | `docker exec whoami` |
| H12 | Health checks | `/api/health` on every service | `docker compose ps` healthy |
| H13 | Resource limits | CPU / memory limits in compose | `docker stats` |
| H14 | Log aggregation | Structured JSON logs → Sentry / Loki | Log query returns recent events |
| H15 | Backup automation | SQLite → encrypted R2/S3 nightly | Restore test monthly |
| H16 | WAF rules | Cloudflare managed + custom rules | Blocked malicious request |
| H17 | DDoS protection | Cloudflare rate limiting | k6 stress test absorbed |

---

## 2. Testing Strategy

### 2.1 Test Pyramid
```
        /\
       /  \     E2E / Visual (Playwright)
      /----\
     /      \   Integration / API Contract
    /--------\
    ----------   Unit (Jest / Vitest)
```

### 2.2 Functional Tests

#### Per-App Critical Paths
| App | Critical Path Tests |
|-----|---------------------|
| **Master** | Login → Import album → Face index → Create order → Sync to cloud |
| **Touch** | Pair kiosk → Browse photos → Face search → Add to cart → Checkout |
| **Gallery** | Customer login → Browse → Add to cart → Stripe checkout → Download |
| **Management** | Login → View fleet → Register master → View analytics → Update settings |
| **MoneyTrash** | Select folder → Chunked upload → Verify in cloud gallery |
| **Website** | Homepage → Portfolio → Contact form → Booking → SEO metadata |
| **Installer** | Run wizard → Provision Cloudflare → Pair touch → Health check |

#### Cross-App Integration Tests
| ID | Flow | Tools |
|----|------|-------|
| X1 | Master album → Cloud sync → Gallery visible | Playwright + API calls |
| X2 | Touch order → Master fulfillment → Stripe payment | E2E across ports |
| X3 | MoneyTrash upload → Master approval → Gallery publish | Multi-app script |
| X4 | Offline master → Online sync → Conflict resolution | Network throttling |
| X5 | Multi-master fleet → Desk isolation → Cross-desk analytics | Synthetic data |

### 2.3 Performance & Load Tests

#### k6 Scenarios (in `tests/performance/k6-load.js`)
| Scenario | Target | SLO |
|----------|--------|-----|
| API smoke | 10 VU, 5 min | p95 < 200 ms, 0% errors |
| Gallery browse | 50 VU, 10 min | p95 < 500 ms, error < 0.1% |
| Checkout flow | 20 VU, 10 min | p95 < 1 s, 0 duplicate charges |
| Sync burst | 100 masters / 60 s | Hub ingestion > 1000 records/min |
| Upload stress | 10 concurrent 100 MB files | No memory crash, resumes on failure |

#### Electron Performance
| Metric | Target | Tool |
|--------|--------|------|
| Main window load | < 3 s | `performance.now()` |
| Album import (1000 photos) | < 60 s | Stopwatch + logs |
| Face indexing (1000 faces) | < 5 min | Backend telemetry |
| Memory at idle | < 300 MB | Task Manager / Sentry |

### 2.4 Security Tests
| ID | Test | Method |
|----|------|--------|
| S1 | JWT expiration enforced | Modify token expiry, verify rejection |
| S2 | Rate limiting | Flood login endpoint, verify 429 |
| S3 | SQL injection | `'; DROP TABLE users; --` in inputs |
| S4 | XSS | `<script>alert(1)</script>` in album title |
| S5 | CORS misconfiguration | Cross-origin fetch from untrusted domain |
| S6 | HMAC replay | Reuse old timestamp, verify rejection |
| S7 | File path traversal | `../../../etc/passwd` upload name |
| S8 | Privilege escalation | User token → admin route |

### 2.5 Resilience & Recovery Tests
| ID | Test | Method |
|----|------|--------|
| R1 | Crash mid-sync | Kill master during upload, verify resume |
| R2 | Cold start | Stop all services, measure time to healthy |
| R3 | DB corruption | Restore from latest backup, verify integrity |
| R4 | Network partition | Disconnect master from cloud, verify offline ops |
| R5 | Worker rollback | Deploy bad worker, verify rollback < 5 min |
| R6 | Electron auto-update | Publish old version, verify update prompt |

### 2.6 Accessibility & UX Tests
| ID | Test | Tool |
|----|------|------|
| U1 | WCAG 2.1 AA | axe DevTools, Playwright + @axe-core |
| U2 | Keyboard navigation | Tab through every flow manually |
| U3 | Screen reader labels | NVDA / VoiceOver smoke test |
| U4 | Mobile responsive | Chrome device emulation |
| U5 | Color contrast | axe + manual designer review |

---

## 3. CI/CD Test Pipeline

```yaml
# Proposed workflow
on: [push, pull_request]
jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm lint && pnpm typecheck
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:ci
  integration-tests:
    runs-on: ubuntu-latest
    services:
      sqlite: ...
    steps:
      - run: pnpm test:integration
  e2e-tests:
    runs-on: windows-latest
    steps:
      - run: pnpm test:e2e
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - run: k6 run tests/performance/k6-load.js
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm audit --prod
      - run: secret-scan
```

---

## 4. Test Environments

| Environment | Purpose | Data |
|-------------|---------|------|
| Local dev | Developer iteration | Synthetic |
| CI | Automated gates | Fixture seed |
| Staging | Pre-release validation | Anonymized production clone |
| COP (Copy of Production) | Final validation | Production mirror |
| Production | Live users | Real |

---

## 5. Go / No-Go Matrix

| Category | Criteria | Status |
|----------|----------|--------|
| Functional | 100% critical path tests pass | ⬜ |
| Integration | All cross-app flows pass | ⬜ |
| Performance | p95 < 500 ms, error < 0.1% | ⬜ |
| Security | 0 critical/high findings | ⬜ |
| Resilience | RTO < 15 min, RPO < 1 h | ⬜ |
| Accessibility | 0 axe violations on critical pages | ⬜ |
| Documentation | All runbooks reviewed | ⬜ |
| Stakeholder | Signed release approval | ⬜ |

---

## 6. Post-Release Monitoring

- Sentry alerts for crashes / errors
- Cloudflare analytics for Worker latency
- Custom dashboard for fleet health
- Weekly error-budget review
- Monthly disaster-recovery drill
