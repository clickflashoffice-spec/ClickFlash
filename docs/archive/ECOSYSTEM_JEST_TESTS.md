# ClickFlash Ecosystem Jest Tests

Complete Jest test suite for all 6 applications in the ClickFlash ecosystem.

## Test Structure

```
ClickFlash/
├── jest.config.ecosystem.js          # Root ecosystem test config
├── package.json                       # Root test scripts
│
├── apps/
│   ├── master/
│   │   ├── src/
│   │   │   ├── services/api/__tests__/
│   │   │   │   ├── faceService.test.ts        # Face enrollment/login
│   │   │   │   ├── userService.test.ts        # User CRUD + face status
│   │   │   │   ├── syncVerification.test.ts   # Master→Hub sync
│   │   │   │   ├── albumService.test.ts       # Existing
│   │   │   │   ├── kioskService.test.ts       # Existing
│   │   │   │   └── photoService.test.ts       # Existing
│   │   │   ├── components/__tests__/
│   │   │   │   ├── Login.face.test.tsx        # Face login UI
│   │   │   │   └── FaceEnrollmentSection.test.tsx
│   │   │   └── setupTests.ts
│   │   └── jest.config.js
│   │
│   ├── management/
│   │   ├── backend/src/__tests__/
│   │   │   └── server.test.ts                 # Hub API tests
│   │   └── jest.config.js
│   │
│   ├── gallery/
│   │   ├── src/__tests__/
│   │   │   └── orderAccess.test.ts            # Gallery order lookup
│   │   └── jest.config.js
│   │
│   ├── touch/
│   │   ├── src/__tests__/
│   │   │   └── kioskSync.test.ts              # Touch→Master sync
│   │   └── jest.config.js
│   │
│   ├── moneytrash/
│   │   └── package.json                       # Add jest config
│   │
│   └── website/
│       └── package.json                       # Add jest config
│
└── test-results/
    └── junit-ecosystem.xml                    # CI test report
```

## Running Tests

### Run all ecosystem tests
```bash
npm run test:ecosystem
```

### Run tests for specific app
```bash
# Master only
cd apps/master && npm test

# Management only
cd apps/management && npm test

# Gallery only
cd apps/gallery && npm test

# Touch only
cd apps/touch && npm test
```

### Run with coverage
```bash
npm run test:ecosystem:coverage
```

### Run in CI mode
```bash
npm run test:ecosystem:ci
```

## Test Coverage by App

### Master App (48 tests)

| Module | Tests | Coverage |
|--------|-------|----------|
| Face Service | 6 | Face enrollment, login, errors |
| User Service | 14 | CRUD, face status, descriptors |
| Sync Verification | 12 | Master→Hub data integrity |
| Album Service | Existing | - |
| Kiosk Service | Existing | - |
| Photo Service | Existing | - |
| Login Component | 8 | Face login UI, permissions |
| Face Enrollment | 8 | Enrollment flow, states |

### Management Hub (12 tests)

| Module | Tests | Coverage |
|--------|-------|----------|
| Health Check | 2 | Status endpoint |
| Authentication | 4 | Registration, login, hardware lock |
| Order Operations | 3 | Order lookup by credentials/token |
| Sync Operations | 2 | Operation log sync |
| Fleet Management | 2 | Heartbeat, fleet status |
| CORS | 1 | Preflight handling |

### Customer Gallery (8 tests)

| Module | Tests | Coverage |
|--------|-------|----------|
| Order Lookup | 4 | PIN/email, magic link, 404 handling |
| Photo Access | 3 | Photo fetch, download URLs |
| Security | 1 | Auth requirements |

### Touch Kiosk (8 tests)

| Module | Tests | Coverage |
|--------|-------|----------|
| LAN Communication | 3 | QR pairing, HMAC signing |
| Order Creation | 2 | Order sync to Master |
| WebSocket Sync | 1 | Connection, heartbeat |
| Offline Queue | 2 | Queueing, sync recovery |

## Key Test Scenarios

### 1. Face Authentication Flow (Master)
```
✅ Face enrollment success
✅ Face enrollment failure (no face detected)
✅ Face login success
✅ Face login failure (not recognized)
✅ Face login rejection (non-staff role)
✅ Staff authorization (Master vs Management portal)
```

### 2. Sync Pipeline (Master ↔ Hub)
```
✅ Operation logs marked as synced
✅ Order data integrity check
✅ Hub authentication
✅ Order retrieval from Hub
✅ Gallery API access verification
✅ Photo sync verification
✅ Data mismatch detection
```

### 3. Customer Access (Gallery)
```
✅ Order lookup by PIN + email
✅ Order lookup by magic link
✅ Invalid credentials handling
✅ Photo gallery display
✅ Signed download URLs
```

### 4. Kiosk Sync (Touch ↔ Master)
```
✅ QR code pairing
✅ HMAC-signed requests
✅ Expired timestamp rejection
✅ Invalid signature rejection
✅ Order creation sync
✅ Album pull from Master
✅ Offline mutation queueing
✅ Queue sync recovery
```

### 5. Hub API Security
```
✅ Desk registration
✅ Hardware fingerprint locking
✅ JWT authentication
✅ CORS handling
✅ Order credential validation
```

## Mock Strategy

### Global Mocks
- `fetch` - HTTP requests
- `WebSocket` - Real-time connections
- `navigator.mediaDevices` - Camera access
- `window.matchMedia` - Responsive design
- `IntersectionObserver` - Lazy loading

### App-Specific Mocks
- `pb` (PocketBase) - Database operations
- `stripe` - Payment processing
- `face-api` - Face recognition
- `electron` - Desktop APIs

## Adding New Tests

### API Service Test
```typescript
import { serviceName } from '../serviceName';

describe('Service Name', () => {
    beforeEach(() => jest.clearAllMocks());
    
    it('should do something', async () => {
        // Arrange
        const mockData = { id: 'test' };
        mockCollection.getOne.mockResolvedValueOnce(mockData);
        
        // Act
        const result = await serviceName.method();
        
        // Assert
        expect(result).toEqual(expected);
    });
});
```

### Component Test
```typescript
import { render, screen, fireEvent } from '@testing-library/react';

describe('Component', () => {
    it('renders correctly', () => {
        render(<Component {...props} />);
        expect(screen.getByText('Expected')).toBeInTheDocument();
    });
});
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Ecosystem Tests
  run: npm run test:ecosystem:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Coverage Requirements

| App | Branches | Functions | Lines | Statements |
|-----|----------|-----------|-------|------------|
| Master | 60% | 60% | 60% | 60% |
| Management | 50% | 50% | 50% | 50% |
| Gallery | 70% | 70% | 70% | 70% |
| Touch | 50% | 50% | 50% | 50% |
| **Ecosystem** | **60%** | **60%** | **60%** | **60%** |

## Test Reports

### JUnit XML
Location: `test-results/junit-ecosystem.xml`

### HTML Coverage
Location: `coverage/lcov-report/index.html`

Open in browser:
```bash
npx serve coverage/lcov-report
```

## Troubleshooting

### Test Timeouts
```javascript
// jest.config.js
testTimeout: 10000;
```

### Module Resolution
```javascript
moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
}
```

### Async Testing
```typescript
await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument();
});
```

## Test Count Summary

| App | Unit Tests | Integration Tests | Total |
|-----|------------|-------------------|-------|
| Master | 40 | 8 | 48 |
| Management | 8 | 4 | 12 |
| Gallery | 6 | 2 | 8 |
| Touch | 6 | 2 | 8 |
| **Total** | **60** | **16** | **76** |
