# Part 3: 9-Layer Production QA Gauntlet & Layer 1 Restoration

Our audit of the roadmap progression revealed that **Part 2: Standalone Infrastructure Tools (`apps/installer` + `apps/license-generator`)** is already fully implemented and verified (all unit/IPC suites passing 100%).

We are now advancing to **Part 3: 9-Layer Production QA Gauntlet**. During our baseline diagnostic assessment across the ecosystem, we discovered that while `@clickflash/validation` (44/44) and `clickflash-touch` (95/95) pass 100%, **`apps/master` currently has 2 failing test suites (3 tests)** in Layer 1 due to the recent introduction of Ed25519 hardware binding (`si.uuid()`) in `LicenseService`.

This plan covers restoring 100% passing status to Layer 1 and executing verification across the full 9-Layer Gauntlet.

---

## User Review Required

> [!IMPORTANT]
> `verifyChecksum` in `LicenseService` (`apps/master/backend/services/license-service.ts`) was recently made `async` (`Promise<boolean>`) to support system hardware fingerprint lookups via `si.uuid()` during Ed25519 digital signature checks. However, callers inside `setLicenseKey` and the unit test suites were not updated to `await` this method. This causes `!this.verifyChecksum(key)` to evaluate `!(Promise)` which is always `false`, resulting in invalid license keys being accepted locally and test assertions receiving Promise objects. We will make all `verifyChecksum` invocations properly `await`ed and fix the corresponding tests.

---

## Open Questions

None. The requirements for the 9-Layer Production QA Gauntlet are strictly specified in `roadmap.md` and all test specifications exist under `tests/ecosystem/` and `tests/resilience/`.

---

## Proposed Changes

### Layer 1: Master Backend (`apps/master`)

#### [MODIFY] [license-service.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/services/license-service.ts)
- Update `setLicenseKey(key: string)` to `await this.verifyChecksum(key)` on line 29:
  ```ts
  if (!await this.verifyChecksum(key)) {
      this.logger.warn(`[LicenseService] Invalid checksum for key: ${key}`);
      return false;
  }
  ```

#### [MODIFY] [backend/__tests__/licenseService.test.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/__tests__/licenseService.test.ts)
- Ensure all calls to `licenseService.setLicenseKey` and `licenseService.getLocalLicenseStatus()` in mocks properly reflect the async checksum verification without returning unresolved Promise objects where values are expected.

#### [MODIFY] [backend/tests/licenseService.test.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/tests/licenseService.test.ts)
- Update unit tests for `verifyChecksum` to `await service.verifyChecksum(...)` (`expect(await service.verifyChecksum(key)).toBe(true)` and `expect(await service.verifyChecksum('INVALID-KEY-123')).toBe(false)`).

---

### Layer 2 - Layer 9: Gauntlet Verification Strategy

We will systematically run and verify each layer of the 9-layer gauntlet:
1. **Layer 1 (Unit & API Integration)**: `pnpm --filter @clickflash/validation test && pnpm --filter clickflash-touch test && pnpm --filter clickflash-master test`
2. **Layer 2 (Web E2E)**: `pnpm --filter main-website run test:e2e && pnpm --filter star-master-customer run test:e2e && pnpm --filter star-master-management run test:e2e && pnpm --filter moneytrash-uploader run test:e2e`
3. **Layer 3 (Desktop E2E)**: Electron IPC channel verification across Master and Touch via `tests/ecosystem/desktop-hardware.spec.ts`.
4. **Layer 4 (Cross-App Sync Gauntlet)**: mDNS Bonjour & WebSocket sync via `tests/ecosystem/layer4-sync.spec.ts` & `cross-app-workflow.spec.ts`.
5. **Layer 5 (Load & Stress)**: Offline SQLite transaction batching and queue ingestion via `tests/ecosystem/offline-online.spec.ts`.
6. **Layer 6 (Security & Pen-Testing)**: Zero third-party SaaS verification & Ed25519 offline license tamper-proofing via `tests/ecosystem/security.spec.ts` and standalone scripts (`ssrf-guard.mjs`, etc.).
7. **Layer 7 (Visual Regression)**: Responsive Tailwind dark mode & glassmorphism via `tests/ecosystem/visual.spec.ts`.
8. **Layer 8 (Accessibility)**: ARIA labels, contrast ratios, and keyboard/touch navigation via `tests/ecosystem/a11y.spec.ts`.
9. **Layer 9 (Chaos & Recovery)**: Queue retry logic and SQLite rollback via `tests/resilience/chaos-resilience.test.ts`.

---

## Verification Plan

### Automated Tests
1. **Layer 1 Verification**:
   ```bash
   pnpm --filter clickflash-master test
   ```
   Must pass 54/54 test suites (100% pass rate).
2. **Layer 9 & Ecosystem Verification**:
   ```bash
   pnpm --filter @clickflash/validation run test
   pnpm --filter clickflash-installer test
   pnpm --filter clickflash-license-generator test
   ```

### Manual Verification
- Verify that `setLicenseKey` rejects malformed strings (`CF-LIVE-1234-5678-9012-3456-BADX`) locally and accepts properly signed Ed25519 keys.
