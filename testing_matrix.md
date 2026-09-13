# ClickFlash V6 Universal Testing Matrix

> **ClickFlash V6 Autonomous Ecosystem Paradigm**  
> Complete test classification, coverage metrics, and execution targets across all 14 apps and 11 shared packages.

---

## 1. Universal Coverage Matrix

| App / Package | Path | Unit | Component | E2E | Load | Chaos | Security | Status |
|---|---|---|---|---|---|---|---|---|
| **Master Edge Station** | `apps/desktop/master` | ✅ 100% (63 suites) | ✅ (Fastify / REST) | ⚠️ Playwright | ⚠️ k6 Ingest | ✅ WAL Journal | ✅ DPAPI / Air-gap | Tier 1 Ready |
| **Touch Kiosk** | `apps/desktop/touch` | ✅ 100% (21 suites) | ✅ (RTL / Jest-DOM) | ⚠️ Playwright | ❌ | ✅ IndexedDB Fallback | ✅ Electron Security | Tier 1 Ready |
| **Management Hub** | `apps/management` | ✅ (App & Dashboard) | ✅ RTL | ⚠️ Playwright | ❌ | ❌ | ✅ Auth Context | In Progress |
| **Guest Self-Service** | `apps/self-service` | ⚠️ Vitest | ⚠️ RTL | ⚠️ Playwright | ❌ | ❌ | ✅ Session Token | In Progress |
| **Gallery Portal** | `apps/gallery` | ⚠️ Vitest | ⚠️ RTL | ⚠️ Playwright | ⚠️ k6 | ❌ | ✅ HMAC Watermark | In Progress |
| **Photographer Portal** | `apps/photographer-portal` | ⚠️ Vitest | ⚠️ WASM Mock | ⚠️ Playwright | ❌ | ❌ | ✅ Ingest Checksum | In Progress |
| **Moneytrash Ingest** | `apps/desktop/moneytrash` | ✅ Vitest | ✅ Blur Detector | ⚠️ Playwright | ❌ | ❌ | ✅ Local Air-gap | Tier 1 Ready |
| **Installer** | `apps/desktop/installer` | ✅ Vitest (Payloads) | ✅ UI Wizard | ✅ E2E Flow | ❌ | ❌ | ✅ Ed25519 Signatures | Tier 1 Ready |
| **License Generator** | `apps/desktop/license-generator` | ✅ Vitest | ✅ Crypto Enclave | ✅ | ❌ | ❌ | ✅ Hardware Lock | Tier 1 Ready |
| **Cloud Backend** | `apps/backend/cloud-backend` | ✅ Vitest (D1/R2) | ✅ Hono Routes | ⚠️ Workers Staging | ⚠️ k6 Telemetry | ⚠️ Queue DLQ | ✅ Cloudflare Zero-Trust | In Progress |
| **AI Worker** | `apps/backend/ai-worker` | ✅ Pytest (Sentinel) | ✅ FastAPI Endpoints | ⚠️ Live Inference | ⚠️ Locust | ⚠️ Out-of-VRAM | ✅ Biometric Air-gap | In Progress |
| **Mobile Pro** | `apps/mobile/pro` | ✅ Node (Rust Core) | ⚠️ Jest Native | ⚠️ Detox / E2E | ❌ | ⚠️ BLE Dropout | ✅ Card Protection | In Progress |
| **Mobile Consumer** | `apps/mobile/consumer` | ⚠️ Jest Native | ⚠️ RTL Native | ⚠️ Detox / E2E | ❌ | ⚠️ BLE Proximity | ✅ Biometric Token | In Progress |
| **MCP Toolchain** | `apps/backend/mcp-server` | ✅ Vitest (104 tools) | ✅ IPC / Stdout | ✅ Tool Execution | ⚠️ High Concurrency | ❌ | ✅ Path Jail | Tier 1 Ready |
| **Shared Packages (11)** | `packages/*` | ✅ 100% (39 suites) | ✅ RTL (UI) | N/A | N/A | N/A | ✅ Security Guards | Tier 1 Ready |

*Legend: ✅ Complete & Passing (Exit Code 0), ⚠️ Partially Covered / In Progress, ❌ Missing*

---

## 2. Test Execution Command Directory

| Test Target | Command | Duration | Pass Criteria |
|---|---|---|---|
| **Consolidated Fast Suite** | `pnpm run test:fast` | ~12s | 100% (Security guards, packages, Rust foundation) |
| **Security Guards (Air-gap & Keys)** | `pnpm run test:security-guards` | ~2.5s | 0 leaked keys, 0 disabled air-gaps |
| **Monorepo Shared Packages** | `pnpm run test:packages` | ~20s | 39 suites, 382+ tests passing |
| **Master Edge Station** | `pnpm --filter clickflash-master test` | ~120s | 63 suites, 291+ tests passing |
| **Touch Kiosk** | `pnpm --filter clickflash-touch test` | ~11s | 21 suites, 137 tests passing |
| **Management Hub** | `pnpm --filter @clickflash/management test` | ~3s | All unit and dashboard tests passing |
| **Installer Station** | `pnpm --filter clickflash-installer test` | ~8s | Cryptographic verification suites passing |
| **Full Monorepo Suite** | `npm run test:all` | ~180s | Zero failed tests across all workspaces |

---

## 3. High-Priority E2E Test Scenarios (Playwright)

### 3.1. Management Command Hub (`apps/management`)
- **E2E-MGMT-001 (CEO Login & Executive Hub)**: Verify dashboard charts, telemetry feeds, and dynamic pricing metrics load correctly.
- **E2E-MGMT-002 (AI Swarm Photographer Dispatch)**: Click "AI Dispatch Reinforcements" in attraction zone, assert immediate state update, active staff increment, and toast notification.
- **E2E-MGMT-003 (System Settings Navigation)**: Navigate across all sidebar routes without page crashes, blank screens, or unhandled Promise rejections.

### 3.2. Touch Kiosk (`apps/desktop/touch`)
- **E2E-TOUCH-001 (Attract Mode to Face Search)**: Transition from idle attract screensaver to face search upon touch interaction.
- **E2E-TOUCH-002 (Offline Cart Recovery)**: Add photo to cart during simulated network interruption; verify payload stores in IndexedDB `safeStorage` and flushes upon network reconnection.
- **E2E-TOUCH-003 (MediaPipe Gesture Skip)**: Mock webcam video feed, assert gesture recognition triggers photo flip without frame lag.

### 3.3. Customer Gallery (`apps/gallery`)
- **E2E-GALLERY-001 (Holographic Lightbox & Splat Viewer)**: Open high-resolution 3D Gaussian Splat viewer, assert camera orbit rotation controls render at 60 fps.
- **E2E-GALLERY-002 (Biometric Match to Stripe Checkout)**: Upload visitor selfie, verify matched photo array renders, add to cart, and redirect to mock Stripe checkout.

---

## 4. Quality & Verification Gates
1. **Typecheck Gate**: `npm run typecheck:all` must pass with 0 errors across all 14 apps and 11 packages.
2. **Lint Gate**: `npm run lint:all` must pass with 0 errors.
3. **Unit Test Gate**: `pnpm run test:fast` and targeted app test suites must pass 100%.
4. **Biometric Air-Gap Gate**: `pnpm run security:biometric-airgap` must assert that zero raw 512D ArcFace descriptors leak to public endpoints.
