# ClickFlash Testing Guide

> Comprehensive testing strategy for the ClickFlash ecosystem

---

## 📋 Testing Overview

### Testing Pyramid
```
    /\
   /  \     E2E Tests (Playwright)
  /----\
 /      \   Integration Tests
/--------\
----------  Unit Tests (Jest)
```

### Test Coverage Goals
| Level | Target | Current | Status |
|-------|--------|---------|--------|
| Unit Tests | 80% | ~20% | 🔄 In Progress |
| Integration | 70% | ~10% | 🔄 In Progress |
| E2E Tests | 90% | ~60% | 🔄 In Progress |

---

## 🧪 Unit Testing (Jest)

### Setup
```bash
# All apps already have Jest configured
# Run tests for specific app
cd apps/master && npm test
cd apps/touch && npm test
```

### Test File Structure
```
src/
├── components/
│   ├── Dashboard.tsx
│   └── __tests__/
│       └── Dashboard.test.tsx
├── services/
│   ├── apiService.ts
│   └── __tests__/
│       └── apiService.test.ts
└── utils/
    ├── helpers.ts
    └── __tests__/
        └── helpers.test.ts
```

### Example Unit Test
```typescript
// apps/master/src/components/__tests__/StatCard.test.tsx
import { render, screen } from '@testing-library/react';
import StatCard from '../common/StatCard';

describe('StatCard', () => {
  it('renders with correct props', () => {
    render(
      <StatCard 
        title="Revenue" 
        value="$1,234" 
        icon={<svg data-testid="icon" />} 
      />
    );
    
    expect(screen.getByText('REVENUE')).toBeInTheDocument();
    expect(screen.getByText('$1,234')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(
      <StatCard 
        title="Orders" 
        value="10" 
        icon={<svg />}
        onClick={handleClick}
      />
    );
    
    screen.getByText('10').click();
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Running Unit Tests
```bash
# Master App
cd apps/master
npm test
npm test -- --coverage
npm test -- --watch

# Touch App
cd apps/touch
npm test

# Management Hub
cd apps/management
npm test

# All apps
npm run test:all  # From root
```

---

## 🔗 Integration Testing

### API Integration Tests
```typescript
// apps/master/src/services/__tests__/apiIntegration.test.ts
import { apiService } from '../apiService';

describe('API Integration', () => {
  beforeAll(async () => {
    // Start test server
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it('fetches albums successfully', async () => {
    const albums = await apiService.getAlbums();
    expect(albums).toBeDefined();
    expect(Array.isArray(albums)).toBe(true);
  });

  it('creates and deletes an order', async () => {
    const order = await apiService.createOrder({
      clientName: 'Test Client',
      total: 100
    });
    expect(order.id).toBeDefined();

    await apiService.deleteOrder(order.id);
    const deleted = await apiService.getOrder(order.id);
    expect(deleted).toBeNull();
  });
});
```

### Database Integration Tests
```typescript
// apps/master/backend/__tests__/database.test.ts
import { dbManager } from '../shared/db';

describe('Database Integration', () => {
  beforeEach(() => {
    // Use in-memory database for tests
    dbManager.useTestDatabase();
  });

  it('creates and retrieves a photo', () => {
    const photoId = dbManager.createPhoto({
      name: 'test.jpg',
      albumId: 'album-123'
    });

    const photo = dbManager.getPhoto(photoId);
    expect(photo.name).toBe('test.jpg');
  });
});
```

---

## 🎭 E2E Testing (Playwright)

### Setup
```bash
# Already configured in apps/master and apps/touch
npm run test:e2e
```

### Test Structure
```
apps/master/tests/
├── e2e/
│   ├── auth.spec.ts
│   ├── albums.spec.ts
│   ├── orders.spec.ts
│   ├── dashboard.spec.ts
│   └── offline.spec.ts
├── fixtures/
│   └── test-data.ts
└── helpers/
    └── test-helpers.ts
```

### Example E2E Test
```typescript
// apps/master/tests/e2e/albums.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Albums Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8090');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('create new album', async ({ page }) => {
    await page.click('text=Albums');
    await page.click('text=Create Album');
    
    await page.fill('[name="title"]', 'Test Album');
    await page.fill('[name="customerEmail"]', 'customer@test.com');
    await page.click('text=Create');
    
    await expect(page.locator('text=Test Album')).toBeVisible();
  });

  test('upload photos to album', async ({ page }) => {
    await page.click('text=Albums');
    await page.click('text=Test Album');
    
    // Upload test image
    const input = page.locator('input[type="file"]');
    await input.setInputFiles('tests/fixtures/test-image.jpg');
    
    await expect(page.locator('text=Upload complete')).toBeVisible();
  });

  test('delete album', async ({ page }) => {
    await page.click('text=Albums');
    
    // Open action menu
    await page.click('[data-testid="album-menu"]').first();
    await page.click('text=Delete');
    
    // Confirm deletion
    await page.click('text=Confirm');
    
    await expect(page.locator('text=Album deleted')).toBeVisible();
  });
});
```

### Running E2E Tests
```bash
# Start dev server first
cd apps/master && npm run dev:full

# Run tests
cd apps/master
npm run test:e2e

# Run specific test
npm run test:e2e -- albums.spec.ts

# Run with UI
npm run test:e2e -- --ui

# Run in headed mode
npm run test:e2e -- --headed
```

---

## 📱 Cross-Browser Testing

### Supported Browsers
| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ✅ Supported |
| Firefox | Latest | ✅ Supported |
| Edge | Latest | ✅ Supported |
| Safari | 15+ | ✅ Supported |

### Playwright Config
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

---

## 🔒 Security Testing

### Security Test Checklist
- [ ] SQL Injection attempts blocked
- [ ] XSS payloads sanitized
- [ ] CSRF tokens validated
- [ ] Rate limiting enforced
- [ ] Authentication bypass attempts fail
- [ ] Authorization checks work
- [ ] File upload restrictions
- [ ] Input validation

### Running Security Tests
```bash
# Use pentest-checklist skill
cd apps/master
npm run test:security

# Manual security audit
npm audit
```

---

## ⚡ Performance Testing

### Lighthouse CI
```bash
# Install Lighthouse
npm install -g @lhci/cli

# Run Lighthouse
lhci autorun
```

### Performance Budgets
| Metric | Budget | Target |
|--------|--------|--------|
| First Contentful Paint | < 1.5s | < 1.0s |
| Largest Contentful Paint | < 2.5s | < 2.0s |
| Time to Interactive | < 3.5s | < 3.0s |
| Cumulative Layout Shift | < 0.1 | < 0.05 |

### Load Testing
```bash
# Using k6
k6 run load-test.js
```

```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:8090/api/albums');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## 🔄 Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [master, touch, management, gallery]
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd apps/${{ matrix.app }}
          npm install
          
      - name: Run linter
        run: |
          cd apps/${{ matrix.app }}
          npm run lint
          
      - name: Run type check
        run: |
          cd apps/${{ matrix.app }}
          npx tsc --noEmit
          
      - name: Run unit tests
        run: |
          cd apps/${{ matrix.app }}
          npm test -- --coverage
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: apps/${{ matrix.app }}/coverage/lcov.info
```

---

## 📊 Test Reporting

### Coverage Reports
```bash
# Generate coverage report
npm test -- --coverage --coverageReporters=html

# View report
open coverage/index.html
```

### Test Results
```bash
# JUnit XML output
npm test -- --reporters=default --reporters=jest-junit
```

---

## 🎯 Testing Best Practices

### DO ✅
- Write tests before fixing bugs
- Test user workflows, not implementation
- Use meaningful test descriptions
- Keep tests independent
- Use test data factories
- Mock external dependencies

### DON'T ❌
- Test implementation details
- Skip error cases
- Share state between tests
- Write flaky tests
- Ignore test failures
- Over-mock

---

## 🚀 Quick Start Commands

```bash
# Run all tests
npm run test:all

# Run tests for specific app
cd apps/master && npm test

# Run E2E tests
cd apps/master && npm run test:e2e

# Run with coverage
npm test -- --coverage

# Run linting
npm run lint

# Run type checking
npx tsc --noEmit
```

---

## 📚 Testing Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Patterns Skill](.agent/skills/testing-patterns/SKILL.md)

---

*Last Updated: 2026-01-31*
