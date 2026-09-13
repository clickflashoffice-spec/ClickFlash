# ClickFlash V6 Testing Matrix

## Test Methodologies
1. **Unit Testing (Vitest)**: Fast, deterministic logic verification (Current state: 100% Pass across UI and Touch apps).
2. **Component Integration**: React Testing Library rendering interactive DOM graphs.
3. **End-to-End (Playwright)**: Full browser automation across the Management Hub, Gallery, and Self-Service apps.
4. **Load & Stress (k6 / Artillery)**: Simulating 5,000 concurrent guest WebSockets.
5. **Chaos Engineering**: Random failure injection in network layers, Redis queue truncation, and disk quotas.
6. **Security & SAST**: Continuous vulnerability scanning.

## Application Coverage Map
| App/Service | Unit | Integration | E2E | Load | Chaos |
| --- | --- | --- | --- | --- | --- |
| pps/desktop/master | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ |
| pps/desktop/touch | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| pps/desktop/installer | ✅ | ✅ | ✅ | ❌ | ❌ |
| pps/management | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| pps/gallery | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| pps/backend/cloud-backend| ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ |

*Legend: ✅ Excellent, ⚠️ Needs Improvement, ❌ Missing*

## Upcoming Phase 4 Expansion
During the Phase 4 Controlled Takeover, we will inject real k6 load tests and chaos simulation against the local dockerized variants of these services to shift the ❌ and ⚠️ markers to ✅.


# ClickFlash Frontend Testing Matrix

This matrix maps out the required end-to-end (E2E) Playwright tests and unit/component tests required to achieve comprehensive coverage for the frontend applications in the ClickFlash ecosystem.

## 1. Apps to Cover
- **Management Command Hub** (`apps/management`)
- **Desktop Kiosk / Touch** (`apps/desktop/touch`)
- **Gallery Web / Mobile** (`apps/gallery`)
- **Photographer Portal** (`apps/photographer-portal` - if exists)
- **Self Service Kiosk** (`apps/self-service` - if exists)

---

## 2. Playwright E2E Test Suite (`tests/ecosystem/`)

### 2.1. Management Command Hub (`apps/management`)
| Feature | Scenario | Status |
|---------|----------|--------|
| **Authentication** | Login as CEO, Login as Admin, invalid credentials | Needed |
| **Fleet Ops** | View live edge node status, detect offline cameras | Needed |
| **Staff & HR** | View staff leaderboards, add new staff member | Needed |
| **CRM** | Search for high-value leads, verify Lead Scoring UI | Needed |
| **AI Command** | Send "Deploy WhatsApp Swarm" command via AI Command View | Needed |
| **Financials** | Check multi-venue revenue breakdown, arbitrary currency toggle | Needed |

### 2.2. Desktop Touch / Kiosk (`apps/desktop/touch`)
| Feature | Scenario | Status |
|---------|----------|--------|
| **Kiosk Sync** | Discover Master Node, sync recent photos via WebRTC/Bonjour | Needed |
| **Liveness Guard** | Fallback to idle video if face isn't detected for 30s | Needed |
| **MediaPipe Gestures**| User swipes right via MediaPipe hand gesture to skip photo | Needed |
| **Face Search** | Customer scans face, retrieves matching photos from SQLite | Needed |
| **Offline Cart** | Add to cart while disconnected, flush queue when online | Needed |

### 2.3. Gallery Backend/Frontend (`apps/gallery`)
| Feature | Scenario | Status |
|---------|----------|--------|
| **Immersive Lightbox** | Click thumbnail, view fullscreen, navigate left/right, pinch zoom | Needed |
| **AI Face Search** | Upload selfie or take photo, match photos, Add All to Cart | Needed |
| **Checkout Flow** | Complete Stripe checkout with multiple items (watermarks removed) | Needed |
| **Magic Links** | Auto-login via WhatsApp Magic Link, verify correct gallery loaded | Needed |

---

## 3. Unit & Component Tests (Vitest) 

### 3.1 `apps/management`
- **Views**: Each view component (e.g. `DashboardView`, `FleetView`, `AICommandView`) must be tested to ensure correct rendering, loading state handling, and data mapping.
- **Contexts/Hooks**: `AuthContext` needs full branch coverage (login success, login failure, logout).
- **Navigation**: Sidebar routing needs to verify that clicking tab changes `window.location.hash` and correctly loads dynamically imported lazy components (with Suspense/loaders).

### 3.2 `apps/desktop/touch`
- **Hooks**: `useDebounce`, `useKioskInactivityGuard`, `useLocalStorage` need 100% path coverage.
- **Services**: Mock WebRTC data channels for `touchSyncClient`.
- **Workers**: Test `faceSearch.worker` with synthetic ArrayBuffers to simulate vector comparison.
- **Utils**: Full coverage for image processing and safe storage utilities.

### 3.3 `apps/gallery`
- **Components**: `GuestFaceSearchModal` needs camera error handling coverage, selfie capture mock, and face search failure branches.
- **Lightbox**: `ImmersiveLightboxV2` requires mocked touch/wheel events for zooming and swiping.

