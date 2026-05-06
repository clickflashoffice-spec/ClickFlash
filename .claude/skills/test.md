---
name: test
description: TDD patterns and test commands for the ClickFlash monorepo. Run before writing implementation code.
triggers:
  - write tests
  - add tests
  - test coverage
  - TDD
  - unit test
  - integration test
---

# Test: TDD Patterns for ClickFlash

## Test commands

```bash
# Run tests for a specific app
npm --prefix apps/master test
npm --prefix apps/gallery test
npm --prefix apps/management test
npm --prefix apps/touch test
npm --prefix apps/website test

# With coverage report
npm --prefix apps/master run test:coverage

# CI mode (coverage threshold enforced, maxWorkers=2)
npm --prefix apps/master run test:ci

# E2E tests (from repo root)
npm run test:e2e

# Run single test file
npm --prefix apps/master test -- --testPathPattern="auth"

# Run with verbose output
npm --prefix apps/master test -- --verbose
```

## Test file locations

| App | Backend tests | Frontend tests |
|-----|--------------|----------------|
| master | `apps/master/backend/__tests__/` | `apps/master/src/` (co-located) |
| gallery | `apps/gallery/backend/src/__tests__/` | `apps/gallery/src/` |
| management | `apps/management/backend/src/__tests__/` | `apps/management/src/` |
| touch | — | `apps/touch/src/` |

## Patterns

### Backend route test (supertest)
```typescript
import { createApp } from '../server';
import request from 'supertest';

describe('POST /api/auth/login', () => {
  it('returns 429 after 5 rapid attempts', async () => {
    const app = createApp();
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    expect(res.status).toBe(429);
  });
});
```

### CF Worker test (gallery/management)
```typescript
// Mock the env object — CF Workers don't have Node test runners
const mockEnv = {
  DB: mockD1Binding,
  JWT_SECRET: 'test-secret-32-chars-minimum!!!!'
};
const response = await handler.fetch(new Request('https://test.com/api/photos'), mockEnv, mockCtx);
expect(response.status).toBe(200);
```

### React component test (React Testing Library)
```typescript
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

it('shows error boundary on fetch failure', async () => {
  render(<MyComponent />, { wrapper });
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});
```

## Deferred coverage gaps (from audit)
| ID | Gap | App |
|----|-----|-----|
| DEF-1 | Cart + checkout flow | touch |
| DEF-2 | HR/payroll routes | management |
| DEF-3 | httpOnly cookie auth flow | gallery, management |

Coverage threshold is enforced in Jest config — do NOT lower it.
