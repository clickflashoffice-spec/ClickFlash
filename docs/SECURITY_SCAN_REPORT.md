# ClickFlash v2.0 — Security Scan Report

> **Scan Date**: 2026-08-07 | **Scanner**: Automated grep-based code quality analysis
> **Scope**: All apps/ and packages/ source files (excluding node_modules, dist, build)

---

## Executive Summary

| Category | Count | Severity | Status |
|----------|-------|----------|--------|
| Hardcoded Secrets | 7 files | 🔴 High | Action Required |
| console.log in prod | 0 files | 🟢 Clean | Passing |
| @ts-ignore/@ts-expect-error | 44 files | 🟡 Medium | Track & reduce |
| Unsafe `any` types | 389 files | 🟡 Medium | Progressive cleanup |
| Skipped tests | 13 files (24 cases) | 🔵 Low | Audit conditionals |
| TODO/FIXME markers | 3 files | 🔵 Low | Convert to backlog |
| process.env in frontend | 7 files | 🔵 Low | Standardize wrappers |

---

## 1. Hardcoded Secrets 🔴 HIGH

**7 non-test production files** contain default/placeholder credentials.

### Affected Files
| File | Finding |
|------|---------|
| [`initializationApi.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/management/src/services/api/initializationApi.ts#L51) | Default password placeholder |
| [`systemService.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/touch/src/services/api/systemService.ts#L378) | Fallback credential |
| [`pbManagement.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/management/src/services/pbManagement.ts#L413) | Default password |
| [`defaultUserConfig.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/touch/backend/shared/defaultUserConfig.ts#L39) | Default admin config |
| [`settings.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/website/src/lib/settings.ts#L129) | Configuration default |

### Recommendation
- Replace all `DEFAULT_PASSWORD_PLACEHOLDER` and `password: "admin"` with environment variables
- Enforce pre-commit secret scanning via `gitleaks` or `git-secrets`
- Add `no-hardcoded-credentials` ESLint rule

---

## 2. console.log in Production 🟢 CLEAN

**0 production frontend files** contain `console.log` statements.

> ✅ ESLint `no-console` rule is enforced. Maintain this in CI pipeline.

---

## 3. TypeScript Suppressions 🟡 MEDIUM

**44 files** use `@ts-ignore` or `@ts-expect-error` directives.

### Top Affected Areas
| File | Type |
|------|------|
| [`healthCheck.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/middleware/healthCheck.ts#L106) | Backend |
| [`FulfillmentService.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/services/FulfillmentService.ts#L3) | Backend |
| [`WalletService.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/services/WalletService.ts#L64) | Backend |
| [`security.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/src/middleware/security.ts) | Frontend |
| [`pb.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/src/services/pb.ts) | Frontend |

### Recommendation
- Replace `@ts-ignore` with ambient `.d.ts` declarations for untyped packages (e.g., `archiver`)
- Require explanatory comments for all `@ts-expect-error` usage
- Track count — target: reduce to <20 for v2.1

---

## 4. Unsafe `any` Types 🟡 MEDIUM

**389 files** contain explicit `: any` type annotations.

### Top Affected Areas
| File | Area |
|------|------|
| [`cloud-backend/src/index.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/cloud-backend/src/index.ts) | Worker |
| [`cloudApiService.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/gallery/src/services/cloudApiService.ts) | Gallery |
| [`studioAgentService.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/management/src/services/studioAgentService.ts) | Management |
| [`systemController.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/controllers/systemController.ts) | Master |
| [`tokenEncryption.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/installer/src/services/tokenEncryption.ts) | Installer |

### Recommendation
- Enable `@typescript-eslint/no-explicit-any` as a warning (not error) progressively
- Priority: replace `any` in security-critical paths (tokenEncryption, cloudApiService)
- Target: reduce to <200 for v2.1

---

## 5. Skipped Tests 🔵 LOW

**13 test files** with 24 skipped test cases/suites.

### Affected Files
| File | Reason |
|------|--------|
| [`checkout-api.spec.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/gallery/tests/e2e/checkout-api.spec.ts#L53) | Conditional (Stripe key) |
| [`logger.test.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/management/src/utils/__tests__/logger.test.ts#L12) | Unconditional skip |
| [`orders.test.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/routes/__tests__/orders.test.ts#L1) | Unconditional skip |
| [`kiosk-security.spec.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/tests/e2e/kiosk-security.spec.ts#L26) | Conditional (hardware) |
| [`home.spec.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/website/e2e/home.spec.ts#L459) | Partial skip |

### Recommendation
- Audit unconditionally skipped tests (`orders.test.ts`, `logger.test.ts`) — fix or delete
- Conditional skips for hardware/API keys are acceptable
- Add CI reporting for skip count trend

---

## 6. TODO/FIXME Markers 🔵 LOW

**3 files** contain TODO/FIXME comments.

| File | Comment |
|------|---------|
| [`CustomerLayout.tsx`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/gallery/src/components/customer/CustomerLayout.tsx) | TODO |
| [`tools.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/mcp-server/src/tools.ts) | TODO |
| [`mqttClientService.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/touch/backend/services/mqttClientService.ts) | TODO |

### Recommendation
- Convert to tracked GitHub Issues or backlog items
- Remove inline TODO comments after tracking

---

## 7. `process.env` in Frontend 🔵 LOW

**7 files** directly access `process.env` in frontend/renderer code.

### Affected Files
| File | Usage |
|------|-------|
| [`useFeatureFlag.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/src/hooks/useFeatureFlag.ts#L30) | Feature flag check |
| [`logger.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/touch/src/utils/logger.ts#L48) | Log level config |
| [`env.ts`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/website/src/lib/env.ts#L20) | Centralized (OK) |
| [`layout.tsx`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/website/src/app/layout.tsx#L83) | SSR context (OK) |
| [`GlobalErrorBoundary.tsx`](file:///c:/Users/alamo/Desktop/ClickFlash/apps/touch/src/components/common/GlobalErrorBoundary.tsx#L81) | Error reporting |

### Recommendation
- Electron apps can use `process.env` safely (Node.js context via preload)
- Website (Next.js) should use `NEXT_PUBLIC_*` prefix convention
- Standardize all frontend env access through central `env.ts` wrappers

---

## Quality Gates Status

### Typecheck Results (2026-08-07)
| App | Status | Notes |
|-----|--------|-------|
| Master | ✅ Pass | 3 tsconfig targets all clean |
| Touch | ❌ Fail | Missing `vite/client` and `vitest/globals` type defs |
| Management | ⏳ Blocked | Sequential after Touch |
| Gallery | ⏳ Blocked | Sequential after Touch |
| Website | ⏳ Blocked | Sequential after Touch |
| MoneyTrash | ⏳ Blocked | Sequential after Touch |
| Installer | ⏳ Blocked | Sequential after Touch |
| License Gen | ⏳ Blocked | Sequential after Touch |
| Mobile | ⏳ Blocked | Sequential after Touch |

### Touch Typecheck Fix Required
The Touch app's `tsconfig.json` declares `"types": ["node", "vite/client", "w3c-web-serial", "jest", "vitest/globals"]` but `vite` and `vitest` packages are not installed as devDependencies (they exist in node_modules via workspace hoisting but TypeScript can't resolve the type definitions).

**Fix**: Add `vite` and `vitest` to Touch's `package.json` devDependencies, or remove them from the `types` array if they're unused.
