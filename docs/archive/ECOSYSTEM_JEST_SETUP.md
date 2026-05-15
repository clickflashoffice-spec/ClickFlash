# Ecosystem Jest Test Setup

Complete Jest test configuration for the ClickFlash ecosystem.

## Test Structure

```
ClickFlash/
├── apps/master/
│   ├── src/
│   │   ├── services/api/__tests__/     # API service tests
│   │   │   ├── faceService.test.ts     # Face enrollment/login tests
│   │   │   ├── userService.test.ts     # User CRUD + face status tests
│   │   │   ├── syncVerification.test.ts # Sync pipeline tests
│   │   │   ├── albumService.test.ts    # Existing
│   │   │   ├── kioskService.test.ts    # Existing
│   │   │   └── photoService.test.ts    # Existing
│   │   ├── components/__tests__/       # Component tests
│   │   │   └── Login.face.test.tsx     # Face login UI tests
│   │   ├── components/settings/__tests__/
│   │   │   └── FaceEnrollmentSection.test.tsx
│   │   └── setupTests.ts               # Global test setup
│   └── jest.config.js                  # Jest configuration
└── package.json                        # Root test scripts
```

## Running Tests

### Run all tests
```bash
cd apps/master
npm test
```

### Run specific test file
```bash
npm test -- faceService.test.ts
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run with coverage
```bash
npm run test:coverage
```

## Test Coverage Areas

### 1. Face Authentication (faceService.test.ts)
- ✅ Face enrollment
- ✅ Face login success
- ✅ Face login failure (not recognized)
- ✅ Face login rejection (non-staff)
- ✅ Network error handling

### 2. User Management (userService.test.ts)
- ✅ Get user with face descriptor
- ✅ Check face enrollment status
- ✅ Update user face descriptor
- ✅ CRUD operations

### 3. Face Enrollment UI (FaceEnrollmentSection.test.tsx)
- ✅ Render enrollment prompt
- ✅ Render registered state
- ✅ Open face scan modal
- ✅ Successful enrollment flow
- ✅ Error handling
- ✅ Loading states

### 4. Login Flow (Login.face.test.tsx)
- ✅ Face ID button rendering
- ✅ Modal interaction
- ✅ Staff authorization (Master Portal)
- ✅ Management role authorization (Management Portal)
- ✅ Permission denial for non-staff

### 5. Sync Verification (syncVerification.test.ts)
- ✅ Operation log status
- ✅ Order data integrity
- ✅ Hub authentication
- ✅ Order retrieval from Hub
- ✅ Gallery API access
- ✅ Photo sync verification
- ✅ Data mismatch detection

## Mock Strategy

### API Mocks
- `pb` (PocketBase) - Database operations
- `fetch` - Hub API calls
- `faceService` - Face recognition API

### Component Mocks
- `FaceScanModal` - Camera capture modal
- Media devices API - Camera access

### Environment Mocks
- `window.matchMedia` - Responsive design
- `IntersectionObserver` - Lazy loading
- `ResizeObserver` - Responsive components
- `navigator.mediaDevices` - Camera

## Adding New Tests

### API Service Test Template
```typescript
import { serviceName } from '../serviceName';
import { mockCollection, resetPbMocks } from '../../__mocks__/pb';

jest.mock('../../pb', () => ({
    pb: { collection: jest.fn(() => mockCollection) }
}));

describe('Service Name', () => {
    beforeEach(() => resetPbMocks());
    
    it('should do something', async () => {
        // Arrange
        mockCollection.getOne.mockResolvedValueOnce(mockData);
        
        // Act
        const result = await serviceName.method();
        
        // Assert
        expect(result).toEqual(expected);
    });
});
```

### Component Test Template
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import Component from '../Component';

jest.mock('../../services/api/service', () => ({
    service: { method: jest.fn() }
}));

describe('Component', () => {
    it('renders correctly', () => {
        render(<Component {...props} />);
        expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
});
```

## CI/CD Integration

Tests run automatically in CI with:
```bash
npm run test:ci
```

Configuration:
- `--ci`: CI mode
- `--coverage`: Generate coverage report
- `--maxWorkers=2`: Limit parallelism

## Coverage Goals

| Area | Target | Current |
|------|--------|---------|
| API Services | 80% | 🔄 |
| Components | 70% | 🔄 |
| Utils | 60% | 🔄 |
| E2E Critical Paths | 90% | 🔄 |

## Troubleshooting

### Test Timeouts
Increase timeout in `jest.config.js`:
```javascript
testTimeout: 10000;
```

### Module Resolution
Add to `moduleNameMapper` in `jest.config.js`:
```javascript
'^@/(.*)$': '<rootDir>/src/$1'
```

### Async Operations
Use `waitFor` for async assertions:
```typescript
await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument();
});
```
