# ClickFlash Ecosystem - Production Test Plan

> **Version:** 1.0.0 | **Date:** 2026-06-13 | **Status:** Draft
> **Scope:** All 7 ClickFlash apps (Master, Touch, MoneyTrash, Gallery, Management, Website, Installer)

---

## 1. Executive Summary

This document defines the comprehensive production testing strategy for the ClickFlash photography ecosystem. It covers all testing layers from unit tests to full end-to-end production simulations, ensuring each app meets quality standards before deployment.

**Key Principles:**
- **Non-destructive testing** - No test data pollutes production databases
- **Automated execution** - All tests run via CI/CD pipelines
- **Real environment testing** - Tests execute against actual deployed services
- **Security-first** - Security tests run before every deployment

---

## 2. Test Architecture

### 2.1 Testing Pyramid

```
                    /\
                   /  \
                  / E2E \           <- 5% of tests (critical paths)
                 /--------\
                /          \
               / Integration \      <- 15% of tests (API contracts)
              /--------------\
             /                \
            /    Unit Tests     \   <- 80% of tests (business logic)
           /----------------------\
```

### 2.2 Test Categories

| Category | Purpose | Tools | Frequency |
|----------|---------|-------|-----------|
| **Smoke** | Verify services are alive | Custom scripts | Every 5 min |
| **Unit** | Test individual functions | Jest | Every commit |
| **Integration** | Test API contracts | Jest + Supertest | Every commit |
| **E2E** | Test full user journeys | Playwright | Every PR |
| **Security** | Find vulnerabilities | Custom + OWASP | Every PR |
| **Performance** | Load and stress testing | Artillery | Weekly |
| **Visual** | UI regression testing | Playwright | Every PR |
| **Accessibility** | WCAG compliance | axe-core | Every PR |

---

## 3. App-Specific Test Plans

### 3.1 Master App (React + Electron)

#### Unit Tests
- **Album Management**: CRUD operations, sorting, filtering
- **Order Processing**: Price calculation, discount application
- **Photo Editor**: Filter application, crop/resize, export formats
- **Kiosk Pairing**: QR generation, token validation, mDNS discovery
- **Database**: Migration execution, encryption, backup

#### Integration Tests
- **API Communication**: REST endpoints, WebSocket events
- **File System**: Photo import, export, temp cleanup
- **External Services**: Stripe payments, Resend emails

#### E2E Tests (Playwright)
```typescript
// Critical paths:
1. Login → Create Album → Upload Photos → Edit Photo → Export
2. Login → Create Order → Add Items → Process Payment → Print Receipt
3. Login → Pair Kiosk → Verify Connection → Transfer Photos
4. Login → Generate Report → Export CSV → Verify Data
5. Login → Settings → Backup Database → Restore Backup
```

#### Security Tests
- **Authentication**: Token expiration, refresh flow, brute force protection
- **Authorization**: Role-based access, resource isolation
- **Input Validation**: SQL injection, XSS, path traversal
- **File Upload**: Malicious file rejection, size limits

#### Performance Tests
- **Startup Time**: < 3 seconds cold start
- **Photo Load**: < 500ms for 100 thumbnails
- **Export Speed**: 100 photos in < 30 seconds
- **Memory Usage**: < 512MB during normal operation

---

### 3.2 Touch App (React + Electron)

#### Unit Tests
- **UI Components**: Button grid, photo carousel, cart sidebar
- **State Management**: Cart operations, kiosk config, connection status
- **Payment Flow**: Stripe integration, cash handling, receipt generation

#### Integration Tests
- **Master Communication**: API polling, WebSocket fallback
- **Printer Integration**: CUPS commands, paper size detection
- **Scanner Integration**: Barcode reading, QR parsing

#### E2E Tests (Playwright)
```typescript
// Critical paths:
1. Boot → Load Config → Display Products → Select Items → Checkout
2. Boot → Enter Album Code → Load Photos → Select Photos → Checkout
3. Boot → Scan QR → Load Order → Process Payment → Print Receipt
4. Boot → Admin Menu → Update Prices → Verify Display
5. Boot → Connection Lost → Reconnect → Resume Session
```

#### Security Tests
- **API Validation**: Request signing, nonce verification
- **Local Storage**: Data encryption, tamper detection
- **Physical Security**: Admin lock, session timeout

#### Performance Tests
- **Boot Time**: < 10 seconds from power-on
- **Photo Load**: < 2 seconds for album display
- **Payment Processing**: < 5 seconds end-to-end
- **UI Responsiveness**: < 100ms button feedback

---

### 3.3 MoneyTrash (Cloudflare Workers + D1)

#### Unit Tests
- **API Handlers**: Request parsing, response formatting, error handling
- **Database Queries**: CRUD operations, joins, aggregations
- **Auth Middleware**: JWT validation, role checking, rate limiting

#### Integration Tests
- **D1 Database**: Connection pooling, transaction handling, migrations
- **R2 Storage**: File upload/download, signed URLs, CORS
- **KV Cache**: Get/set/delete, TTL handling, namespace isolation
- **Queue Processing**: Message handling, retry logic, dead letter

#### E2E Tests (Playwright + API)
```typescript
// Critical paths:
1. Health Check → Verify all endpoints respond
2. Authentication → Login → Access Protected Route → Logout
3. Product CRUD → Create → Read → Update → Delete
4. Order Flow → Create Order → Process Payment → Fulfill
5. File Upload → Upload Photo → Verify Storage → Download
6. Webhook → Trigger Event → Verify Delivery → Retry Failed
```

#### Security Tests
- **CORS Policy**: Origin validation, method restrictions
- **Rate Limiting**: Burst handling, header accuracy
- **SQL Injection**: Parameterized queries, input sanitization
- **XSS Prevention**: Output encoding, CSP headers

#### Performance Tests
- **API Response**: p95 < 100ms, p99 < 500ms
- **Concurrent Users**: 1000 simultaneous requests
- **Database Queries**: < 50ms for complex joins
- **Cold Start**: < 200ms Worker initialization

---

### 3.4 Gallery (Cloudflare Workers + D1)

#### Unit Tests
- **Gallery Renderer**: Template processing, photo grid, lightbox
- **Share Links**: Token generation, expiration handling
- **Download Handler**: ZIP creation, streaming, progress

#### Integration Tests
- **D1 Reads**: Photo metadata, album structure, access control
- **R2 Delivery**: CDN caching, image optimization, range requests
- **Email Delivery**: Template rendering, attachment handling

#### E2E Tests (Playwright)
```typescript
// Critical paths:
1. Visit Gallery → Load Album → View Photos → Open Lightbox
2. Visit Gallery → Enter Access Code → View Private Album
3. Visit Gallery → Select Photos → Download ZIP → Verify Contents
4. Visit Gallery → Share Album → Open Link → Verify Access
5. Visit Gallery → Mobile View → Swipe Photos → Download
```

#### Security Tests
- **Access Control**: Public vs private albums, token validation
- **File Disclosure**: Directory traversal, ID enumeration
- **Rate Limiting**: Download abuse, scraping protection

#### Performance Tests
- **Page Load**: < 2 seconds for 50-photo gallery
- **Image Delivery**: < 100ms for cached images
- **ZIP Generation**: < 10 seconds for 100 photos
- **Mobile Performance**: Lighthouse score > 90

---

### 3.5 Management Hub (Cloudflare Workers + D1)

#### Unit Tests
- **Dashboard Logic**: KPI calculations, trend analysis, alerts
- **User Management**: CRUD operations, role assignment, invitations
- **Studio Settings**: Configuration validation, feature flags

#### Integration Tests
- **Multi-tenant Queries**: Data isolation, cross-studio access prevention
- **Analytics Pipeline**: Event ingestion, aggregation, reporting
- **Notification System**: Email queue, template rendering, delivery tracking

#### E2E Tests (Playwright)
```typescript
// Critical paths:
1. Login → Dashboard → View KPIs → Drill Down → Export Report
2. Login → Users → Invite User → Accept Invitation → Verify Access
3. Login → Settings → Update Config → Verify Change → Revert
4. Login → Analytics → Set Date Range → View Chart → Export Data
5. Login → Notifications → Create Campaign → Send → Track Opens
```

#### Security Tests
- **Multi-tenancy**: Cross-studio data access prevention
- **Admin Privileges**: Super-admin vs studio-admin boundaries
- **Audit Logging**: All actions logged, tamper-proof storage

#### Performance Tests
- **Dashboard Load**: < 3 seconds for 1000-studio view
- **Report Generation**: < 10 seconds for 30-day report
- **Concurrent Admins**: 50 simultaneous dashboard sessions

---

### 3.6 Website (Next.js + Cloudflare Pages)

#### Unit Tests
- **Page Components**: Hero, features, pricing, contact
- **Form Validation**: Input sanitization, error messages, submission
- **SEO Metadata**: Title, description, structured data, OpenGraph

#### Integration Tests
- **API Routes**: Form submission, newsletter signup, contact email
- **Static Generation**: Build process, ISR, fallback handling
- **Image Optimization**: Next.js Image component, Cloudflare Images

#### E2E Tests (Playwright)
```typescript
// Critical paths:
1. Homepage → Scroll → Click CTA → Pricing Page → Select Plan → Signup
2. Homepage → Blog → Click Article → Read → Share → Comment
3. Homepage → Contact → Fill Form → Submit → Verify Success
4. Homepage → Features → Click Feature → Learn More → Download
5. Homepage → Pricing → Compare Plans → FAQ → Contact Sales
```

#### Security Tests
- **XSS Vectors**: Reflected XSS, stored XSS, DOM-based XSS
- **Form Abuse**: Rate limiting, honeypot fields, CAPTCHA
- **Dependency Scan**: npm audit, Snyk, Dependabot

#### Performance Tests
- **Lighthouse Score**: > 90 for all categories
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Mobile Performance**: 3G network simulation, < 5s load

---

### 3.7 Installer (Electron + Playwright E2E)

#### Unit Tests
- **Wizard Logic**: Step progression, validation, state management
- **File Operations**: Copy, verify, rollback, cleanup
- **Registry/Config**: Windows registry, macOS plist, Linux desktop

#### Integration Tests
- **Download Manager**: Resume, verify, retry, proxy support
- **Update Server**: Version check, delta updates, full updates
- **Permission Handling**: UAC elevation, sudo, pkexec

#### E2E Tests (Playwright)
```typescript
// Critical paths:
1. Launch Installer → Welcome → Accept License → Select Location → Install → Finish
2. Launch Installer → Detect Previous Version → Offer Update → Download → Install → Restart
3. Launch Installer → Custom Install → Select Components → Verify Space → Install → Verify
4. Launch Installer → Network Error → Retry → Success → Complete
5. Launch Installer → Cancel → Confirm → Cleanup → Exit
```

#### Security Tests
- **Code Signing**: Certificate validation, hash verification
- **Download Integrity**: Checksum verification, signature validation
- **Privilege Escalation**: UAC bypass attempts, sandbox escape

#### Performance Tests
- **Install Time**: < 2 minutes for full installation
- **Update Time**: < 30 seconds for delta update
- **Download Speed**: Resume from 50% in < 5 seconds

---

## 4. Cross-Cutting Test Concerns

### 4.1 Kiosk Pairing (Master ↔ Touch)

#### Pairing Flow Tests
```typescript
1. Master: Generate QR → Display QR
2. Touch: Scan QR → Parse Token → Validate Token
3. Touch: Send Pairing Request → Master: Accept Request
4. Master: Verify Connection → Touch: Confirm Connection
5. Master: Send Album → Touch: Receive Album → Display Photos
6. Touch: Create Order → Master: Receive Order → Process Payment
7. Master: Send Update → Touch: Apply Update → Restart
```

#### Failure Recovery Tests
```typescript
1. Network Interruption → Reconnect → Resume Transfer
2. Master Crash → Restart → Reconnect → Sync State
3. Touch Crash → Restart → Reconnect → Resume Session
4. Invalid Token → Reject → Log → Alert
5. Timeout → Retry → Exponential Backoff → Fail Gracefully
```

### 4.2 Cloudflare Workers Inter-communication

#### Service Mesh Tests
```typescript
1. MoneyTrash → Gallery: Share album data, verify consistency
2. MoneyTrash → Management: Sync studio data, verify KPIs
3. Gallery → Management: Track analytics, verify reporting
4. Update Server → All Apps: Push update, verify delivery
5. D1 → R2: Photo metadata sync, verify integrity
```

### 4.3 Database Consistency

#### Migration Tests
```typescript
1. Fresh Install: Run all migrations → Verify schema → Seed data
2. Upgrade v1→v2: Apply migration → Verify data → Rollback → Verify
3. Upgrade v2→v3: Apply migration → Verify data → Rollback → Verify
4. Corrupted DB: Detect corruption → Repair → Verify → Alert
```

---

## 5. Test Automation Framework

### 5.1 Directory Structure

```
test-suite/
├── package.json
├── jest.config.js
├── playwright.config.ts
├── global-setup.ts
├── global-teardown.ts
├── setup.ts
├── apps/
│   ├── master/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── touch/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── moneytrash/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── gallery/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── management/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── website/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── installer/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── security/
│   ├── auth.test.ts
│   ├── xss.test.ts
│   ├── sqli.test.ts
│   ├── headers.test.ts
│   └── owasp.test.ts
├── performance/
│   ├── load-test.yml
│   ├── api-load-test.yml
│   ├── website-load-test.yml
│   └── k6-script.js
└── utils/
    ├── test-data.ts
    ├── mock-server.ts
    ├── api-client.ts
    └── helpers.ts
```

### 5.2 CI/CD Pipeline Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:smoke

  unit:
    runs-on: ubuntu-latest
    needs: smoke
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3

  integration:
    runs-on: ubuntu-latest
    needs: unit
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:integration

  security:
    runs-on: ubuntu-latest
    needs: unit
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:security

  e2e:
    runs-on: ubuntu-latest
    needs: [integration, security]
    strategy:
      matrix:
        project: [master, touch, website]
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e:${{ matrix.project }}
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: e2e-report-${{ matrix.project }}
          path: test-results/

  performance:
    runs-on: ubuntu-latest
    needs: e2e
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:performance
```

---

## 6. Test Data Management

### 6.1 Test Data Strategy

| Environment | Data Source | Refresh Frequency | Size |
|-------------|-------------|-------------------|------|
| **Local** | Seeded fixtures | Every test run | 100 records |
| **CI** | Generated snapshots | Daily | 1000 records |
| **Staging** | Production anonymized | Weekly | 10K records |
| **Production** | Real user data | N/A | Live |

### 6.2 Fixture Examples

```typescript
// test-suite/utils/test-data.ts
export const testAlbums = [
  {
    id: 'album-1',
    name: 'Wedding Sample',
    description: 'A beautiful wedding album',
    photos: 50,
    status: 'published',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'album-2',
    name: 'Portrait Session',
    description: 'Professional headshots',
    photos: 25,
    status: 'draft',
    createdAt: '2026-02-01T00:00:00Z'
  }
];

export const testOrders = [
  {
    id: 'order-1',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    items: [
      { productId: 'photo-1', quantity: 2, price: 10.00 }
    ],
    total: 20.00,
    status: 'completed',
    createdAt: '2026-01-15T00:00:00Z'
  }
];

export const testUsers = [
  {
    id: 'user-1',
    email: 'admin@test.com',
    password: 'TestPassword123!',
    role: 'admin',
    studioId: 'studio-1'
  },
  {
    id: 'user-2',
    email: 'photographer@test.com',
    password: 'TestPassword123!',
    role: 'photographer',
    studioId: 'studio-1'
  }
];
```

---

## 7. Security Testing

### 7.1 OWASP Top 10 Coverage

| # | Vulnerability | Test Approach | Status |
|---|--------------|-------------|--------|
| 1 | Broken Access Control | Automated + Manual | ✅ Implemented |
| 2 | Cryptographic Failures | Automated scanning | ✅ Implemented |
| 3 | Injection (SQL, XSS, Command) | Fuzzing + SAST | ✅ Implemented |
| 4 | Insecure Design | Threat modeling | 🔄 In Progress |
| 5 | Security Misconfiguration | CIS benchmarks | ✅ Implemented |
| 6 | Vulnerable Components | Dependency scanning | ✅ Implemented |
| 7 | Auth Failures | Brute force, session tests | ✅ Implemented |
| 8 | Data Integrity Failures | Checksum verification | ✅ Implemented |
| 9 | Logging Failures | Audit trail validation | ✅ Implemented |
| 10 | SSRF | URL validation tests | ✅ Implemented |

### 7.2 Security Test Examples

```typescript
// test-suite/security/xss.test.ts
describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '<svg onload=alert(1)>',
    '\\x3cscript\\x3ealert(1)\\x3c/script\\x3e'
  ];

  test.each(xssPayloads)('rejects XSS payload: %s', async (payload) => {
    const response = await api.post('/albums', {
      name: payload,
      description: payload
    });
    
    expect(response.status).toBe(400);
    expect(response.body.name).not.toContain('<script>');
  });
});

// test-suite/security/sqli.test.ts
describe('SQL Injection Prevention', () => {
  const sqliPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE albums; --",
    "1 UNION SELECT * FROM users",
    "' AND 1=1 --",
    "\\" OR \\"1\\"=\\"1"
  ];

  test.each(sqliPayloads)('rejects SQLi payload: %s', async (payload) => {
    const response = await api.get(`/albums?id=${encodeURIComponent(payload)}`);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid input');
  });
});
```

---

## 8. Performance Testing

### 8.1 Load Test Scenarios

```yaml
# test-suite/performance/load-test.yml
config:
  target: "https://moneytrash-api.clickflash-office.workers.dev"
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "API Health Check"
    weight: 10
    requests:
      - get:
          url: "/health"

  - name: "List Products"
    weight: 40
    requests:
      - get:
          url: "/products"

  - name: "Create Order"
    weight: 30
    requests:
      - post:
          url: "/orders"
          json:
            customerName: "Load Test"
            customerEmail: "load@test.com"
            items:
              - productId: "photo-1"
                quantity: 1
                price: 10.00
            total: 10.00

  - name: "Full Purchase Flow"
    weight: 20
    requests:
      - get:
          url: "/products"
      - think: 2
      - post:
          url: "/orders"
          json:
            customerName: "Load Test"
            customerEmail: "load@test.com"
            items:
              - productId: "photo-1"
                quantity: 1
                price: 10.00
            total: 10.00
      - think: 1
      - post:
          url: "/payments"
          json:
            orderId: "{{ orderId }}"
            paymentMethod: "card"
            token: "tok_test"
```

### 8.2 Performance Benchmarks

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API Response (p50) | < 50ms | > 100ms | > 500ms |
| API Response (p95) | < 100ms | > 200ms | > 1000ms |
| API Response (p99) | < 500ms | > 1000ms | > 5000ms |
| Database Query | < 50ms | > 100ms | > 500ms |
| Page Load (LCP) | < 2.5s | > 4s | > 6s |
| Time to Interactive | < 3.5s | > 6s | > 10s |
| Error Rate | < 0.1% | > 1% | > 5% |
| CPU Usage | < 50% | > 70% | > 90% |
| Memory Usage | < 70% | > 85% | > 95% |

---

## 9. Test Reporting

### 9.1 Report Formats

| Format | Purpose | Audience | Frequency |
|--------|---------|----------|-----------|
| **Console** | Quick feedback | Developers | Every run |
| **HTML** | Detailed analysis | QA Team | Every run |
| **JUnit XML** | CI integration | Jenkins/GitHub | Every run |
| **Coverage** | Code coverage | Tech Leads | Daily |
| **Dashboard** | Trend analysis | Management | Weekly |

### 9.2 Sample Report Structure

```
Test Report - 2026-06-13
========================

Summary
-------
Total Tests: 1,247
Passed: 1,234 (99.0%)
Failed: 8 (0.6%)
Skipped: 5 (0.4%)
Duration: 4m 32s

Coverage
--------
Statements: 87.3%
Branches: 82.1%
Functions: 91.5%
Lines: 88.7%

By App
------
Master:      312 tests, 99.4% pass, 85.2% coverage
Touch:       198 tests, 98.5% pass, 78.3% coverage
MoneyTrash:  245 tests, 99.2% pass, 92.1% coverage
Gallery:     156 tests, 98.7% pass, 88.5% coverage
Management:  187 tests, 99.5% pass, 90.2% coverage
Website:     123 tests, 97.6% pass, 75.8% coverage
Installer:    86 tests, 98.8% pass, 72.4% coverage

Security
--------
XSS:          45/45 passed
SQLi:         32/32 passed
Auth:         28/28 passed
Headers:      15/15 passed
OWASP:        50/50 passed

Performance
-----------
API p50:      42ms ✅
API p95:      89ms ✅
API p99:      312ms ✅
Page LCP:     1.8s ✅
TTI:          2.9s ✅

Failures
--------
1. Master: AlbumEditor - Photo crop fails on WebP (known issue #234)
2. Touch: PaymentFlow - Stripe timeout on slow network (flakey)
3. Website: ContactForm - Rate limit triggers on CI (expected)
4. MoneyTrash: Webhook - Delivery retry exhausted (intermittent)
5. Gallery: Download - ZIP creation timeout for 500+ photos (perf)
6. Management: Report - CSV export fails for > 10K rows (memory)
7. Installer: Update - Delta patch fails on Windows 11 (new)
8. E2E: KioskPairing - mDNS discovery timeout in CI (network)

Recommendations
---------------
1. Fix WebP crop issue before next release
2. Add retry logic for Stripe timeouts
3. Increase ZIP creation timeout or add pagination
4. Investigate Windows 11 delta patch failure
```

---

## 10. Test Environment Management

### 10.1 Environment Matrix

| Environment | Purpose | Data | Access | Auto-deploy |
|-------------|---------|------|--------|-------------|
| **Local** | Development | Fixtures | Developers | Manual |
| **CI** | Automated testing | Generated | CI/CD | Every commit |
| **Staging** | Pre-release | Anonymized prod | QA Team | Every PR merge |
| **Canary** | Gradual rollout | Production 5% | DevOps | Manual |
| **Production** | Live users | Real | End users | Manual approval |

### 10.2 Environment Configuration

```typescript
// test-suite/config/environments.ts
export const environments = {
  local: {
    master: 'http://localhost:8090',
    touch: 'http://localhost:3001',
    moneytrash: 'http://localhost:8787',
    gallery: 'http://localhost:8788',
    management: 'http://localhost:8789',
    website: 'http://localhost:3000',
    installer: 'http://localhost:3002'
  },
  staging: {
    master: 'https://staging-master.clickflash.com',
    touch: 'https://staging-touch.clickflash.com',
    moneytrash: 'https://staging-api.clickflash.com',
    gallery: 'https://staging-gallery.clickflash.com',
    management: 'https://staging-hub.clickflash.com',
    website: 'https://staging.clickflash.com',
    installer: 'https://staging-installer.clickflash.com'
  },
  production: {
    master: 'https://master.clickflash.com',
    touch: 'https://touch.clickflash.com',
    moneytrash: 'https://moneytrash-api.clickflash-office.workers.dev',
    gallery: 'https://gallery-backend.clickflash-office.workers.dev',
    management: 'https://management-hub.clickflash-office.workers.dev',
    website: 'https://clickflash-website.pages.dev',
    installer: 'https://clickflash-update-server.clickflash-office.workers.dev'
  }
};
```

---

## 11. Test Maintenance

### 11.1 Flaky Test Management

| Strategy | Implementation |
|----------|---------------|
| **Retry Logic** | Max 3 retries with exponential backoff |
| **Isolation** | Each test gets fresh database transaction |
| **Synchronization** | Explicit waits instead of implicit timeouts |
| **Determinism** | Fixed dates, seeded random numbers |
| **Cleanup** | AfterEach hooks for resource cleanup |

### 11.2 Test Update Process

1. **Feature Development**: Write tests before code (TDD)
2. **Bug Fix**: Add regression test reproducing the bug
3. **Refactoring**: Ensure tests still pass after changes
4. **Dependency Update**: Run full suite after major updates
5. **Performance Regression**: Add benchmark for affected area

---

## 12. Appendices

### Appendix A: Test Tools Reference

| Tool | Version | Purpose |
|------|---------|---------|
| Jest | 29.7.0 | Unit/Integration testing |
| Playwright | 1.40.0 | E2E testing |
| Artillery | 2.0.0 | Load testing |
| axe-core | 4.8.0 | Accessibility testing |
| OWASP ZAP | 2.14.0 | Security scanning |
| Snyk | Latest | Dependency scanning |
| Codecov | Latest | Coverage reporting |

### Appendix B: Test Account Credentials

| Environment | Role | Email | Password |
|-------------|------|-------|----------|
| Local | Admin | admin@test.com | TestPassword123! |
| Local | Photographer | photo@test.com | TestPassword123! |
| Local | Customer | customer@test.com | TestPassword123! |
| Staging | Admin | staging-admin@clickflash.com | [Vault] |
| Production | Admin | [Service Account] | [Vault] |

### Appendix C: Emergency Contacts

| Role | Name | Contact | Escalation |
|------|------|---------|------------|
| QA Lead | [TBD] | qa@clickflash.com | 24h |
| DevOps | [TBD] | devops@clickflash.com | 24h |
| Security | [TBD] | security@clickflash.com | 1h |
| On-call | [TBD] | pagerduty@clickflash.com | 15min |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-06-13 | Hermes Agent | Initial release |

---

*ClickFlash Production Test Plan v1.0.0*
*Prepared by: Hermes Agent*
*Date: 2026-06-13*
