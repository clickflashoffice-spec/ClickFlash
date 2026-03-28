# E2E Tests with Playwright

## Overview

End-to-end tests for the Master App using Playwright.

## Test Structure

```
tests/e2e/
├── helpers/
│   └── auth.ts          # Authentication helpers
├── auth.spec.ts         # Login/logout tests
├── albums.spec.ts       # Album CRUD tests
├── photo-editing.spec.ts # Photo editing tests
├── settings.spec.ts     # Settings tests
└── offline.spec.ts      # Offline functionality tests
```

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test auth.spec.ts

# Run with UI mode
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Generate report
npx playwright show-report
```

## Test Data Attributes

Components should have `data-testid` attributes for reliable selectors:

```tsx
<button data-testid="login-button">Login</button>
<input data-testid="username-input" />
```

## Authentication

Tests use a helper to log in before each test:

```typescript
import { login } from './helpers/auth';

test.beforeEach(async ({ page }) => {
    await login(page);
});
```

## Offline Testing

Playwright can simulate offline mode:

```typescript
await page.context().setOffline(true);
// ... test offline behavior
await page.context().setOffline(false);
```

## Best Practices

1. Use `data-testid` for selectors instead of CSS classes
2. Group related tests with `test.describe`
3. Use `test.beforeEach` for common setup
4. Test user flows, not implementation details
5. Keep tests independent (no shared state)
