# Touch Kiosk E2E Tests

## Test Files

### 1. `kiosk-flow.spec.ts` (Existing)
- **Tests**: 2
- **Covers**: Basic customer journey, offline mode
- **Status**: Has some failures due to UI changes

### 2. `touch-kiosk-e2e.spec.ts` (New)
- **Tests**: 16
- **Covers**: 
  - Photo Search Flows (room number, face recognition)
  - Cart and Checkout Flow
  - Offline Mode
  - Master Synchronization
  - Accessibility and UX
  - Language and Localization
- **Status**: 5 passing, 11 failing (needs UI selector updates)

### 3. `test-touch-e2e.ps1` (Test Runner)
- PowerShell script to run E2E tests with server health checks

## UI Button Reference

The WelcomeScreen has these main buttons:

| Button Title | Description | Test Selector |
|--------------|-------------|---------------|
| "View All Photos" | Browse complete gallery | `getByRole('button').filter({ hasText: 'View All Photos' })` |
| "Find by Room" | Enter room number | `getByRole('button').filter({ hasText: 'Find by Room' })` |
| "Search by Face" | Face recognition search | `getByRole('button').filter({ hasText: 'Search by Face' })` |
| "Tap Wristband" | RFID login (optional) | `getByRole('button').filter({ hasText: 'Tap Wristband' })` |

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/touch-kiosk-e2e.spec.ts

# Run with UI
npx playwright test --headed

# Run with PowerShell script
cd scripts
.\test-touch-e2e.ps1
```

## Current Status

| Test Suite | Passing | Failing | Notes |
|------------|---------|---------|-------|
| kiosk-flow.spec.ts | 0 | 2 | Needs selector updates |
| touch-kiosk-e2e.spec.ts | 5 | 11 | Modal handling issues |
| **Total** | **5** | **13** | **28% passing** |

## Known Issues

1. **Modal Interception**: Dialog modals intercept button clicks
2. **Selector Mismatch**: Some selectors don't match actual UI elements
3. **Timing**: Need better wait conditions for animations

## Next Steps

1. Update selectors to match actual UI elements
2. Add proper modal handling (close/dismiss where needed)
3. Add data-testid attributes to components for reliable selection
4. Fix timing issues with animation waits
