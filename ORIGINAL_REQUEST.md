# Original User Request

## Initial Request — 2026-09-17T15:29:26Z

# Mission: ClickFlash Monorepo Production-Readiness Audit & Blocker Resolution

## Identity & Paths
- Role: Project Orchestrator
- Working Directory: c:\Users\alamo\Desktop\ClickFlash\.agents\orchestrator_prod_audit_1
- Project Root: c:\Users\alamo\Desktop\ClickFlash
- Original Request: c:\Users\alamo\Desktop\ClickFlash\.agents\ORIGINAL_REQUEST.md (and c:\Users\alamo\Desktop\ClickFlash\ORIGINAL_REQUEST.md)

## Objective
Execute a comprehensive, production-readiness audit of the ClickFlash monorepo (14 applications, 11 shared packages built with TypeScript, React 19, Electron 39, Expo React Native, Cloudflare Workers, FastAPI, Rust facade). Identify and fix every blocker preventing real customer-facing deployment, then verify all fixes.

## Requirements Overview
- **R1. Fix all existing TypeScript and test failures:**
  - 2 TypeScript errors in `apps/desktop/touch`:
    1. `setTimeout` returns `Timeout` not `number` at `src/hooks/useKioskInactivityGuard.ts:44`
    2. mock-uuid string literal type mismatch in `src/services/__tests__/touchSyncClient.webrtc.test.ts:31`
  - 1 test failure in `apps/mobile/pro`:
    `tests/rust-core-foundation.test.ts` — Rust Core native module mock returns generic strings instead of matching test assertions (e.g., `'registered offline via Rust Core'`). Fix mock returns in `modules/clickflash-rust-core/index.ts`.
- **R2. Deep architecture and code quality audit:**
  - Audit every app and package for: files exceeding 500 lines, excessive `any` types, `@ts-ignore`/`@ts-expect-error`, circular dependencies, dead code, unused exports, prop-drilling.
  - Produce findings report and fix the most impactful issues.
- **R3. Security audit:**
  - Scan for hardcoded secrets/API keys, `eval()`, unescaped `innerHTML`/`dangerouslySetInnerHTML`, SQL injection (string concatenation), missing input validation on API routes, insecure crypto.
  - Fix any critical or high-severity findings.
- **R4. Performance audit:**
  - Audit synchronous file I/O blocking event loop (`readFileSync`/`writeFileSync` in server paths), missing DB transactions in multi-query loops, N+1 query patterns, unbounded memory growth (`useEffect` cleanup, event listener leaks), bundle size.
  - Fix blocking issues.
- **R5. Testing coverage expansion:**
  - Review test coverage across all 14 apps and 11 packages.
  - Add meaningful Vitest tests for untested critical paths (API route handlers, state management stores, service modules).
- **R6. Accessibility and i18n audit:**
  - Scan frontend components for WCAG violations (plain `div` instead of `button`, missing `tabIndex`, `onKeyDown`, `aria-label`, hardcoded English strings bypassing i18n).
  - Fix the most impactful accessibility violations.
- **R7. CI/CD and infrastructure audit:**
  - Review `.github/workflows/` (unpinned actions, missing caching, redundant steps, security checks) and Docker configs (running as root, single-stage builds, health checks).
  - Fix any findings.

## Acceptance Criteria
- `npm run typecheck:all` exits 0 with 0 errors across all workspaces.
- `pnpm run test:all` exits 0 with all test suites passing (0 failures).
- No source file (excluding tests and generated code) exceeds 600 lines.
- Zero `@ts-ignore` annotations in production source (test files excepted).
- All `any` type annotations in API route handlers and service modules replaced with proper types.
- Zero hardcoded secrets, API keys, or passwords in any source file.
- Zero `eval()` calls in production source.
- All SQL queries use parameterized queries — zero string concatenation patterns.
- Zero synchronous file I/O (`readFileSync`, `writeFileSync`) in server-side request handlers/workers.
- All multi-query database loops wrapped in transactions.
- All interactive photo grid elements use semantic HTML (`button` or `a`) with `tabIndex` and keyboard event handlers.
- Comprehensive `audit_report.md` produced in workspace root documenting findings, fixes, and recommendations.

## Environment & Constraints
- Platform: Windows (PowerShell / pwsh).
- Docker Desktop is NOT available — do not run Docker commands.
- Monorepo tools: pnpm workspaces + Turborepo.
- Test runner: Vitest. Note: Vitest `pool: 'forks'` can leak `vi.mock` module overrides between files — prefer `vi.spyOn` over `vi.mock`.
- Timers: `setTimeout`/`setInterval` must NOT use `window.` prefix in source code.
- Rust Core: `apps/mobile/pro/modules/clickflash-rust-core` is a JS facade with mock fallbacks.

## Execution Directives
- Create and maintain `progress.md`, `plan.md`, and `BRIEFING.md` in your working directory `c:\Users\alamo\Desktop\ClickFlash\.agents\orchestrator_prod_audit_1`.
- Spawn specialists (e.g. explorers, workers, reviewers, checkers) using distinct working directories under `.agents/`.
- Once all requirements are fulfilled, all acceptance criteria are verified, and `audit_report.md` is complete, notify the parent Sentinel via `send_message` with your completion report.

## 2026-09-17T15:42:50Z

Use a very large team of agents. Perform a comprehensive, production-readiness audit of the ClickFlash monorepo — an enterprise-grade automated photography concession and edge-to-cloud resort media platform. The monorepo spans 14 applications and 11 shared packages built with TypeScript, React 19, Electron 39, Expo React Native, Cloudflare Workers, FastAPI, and Rust. The goal is to identify and fix every blocker preventing a real customer-facing deployment, then verify the fixes.

Working directory: c:\Users\alamo\Desktop\ClickFlash
Integrity mode: development

## Context

The monorepo currently has:
- **2 TypeScript errors** in `apps/desktop/touch`: (1) `setTimeout` returns `Timeout` not `number` at `src/hooks/useKioskInactivityGuard.ts:44`, (2) mock-uuid string literal type mismatch in `src/services/__tests__/touchSyncClient.webrtc.test.ts:31`
- **1 test failure** in `apps/mobile/pro`: `tests/rust-core-foundation.test.ts` — the Rust Core native module mock stubs return generic strings (e.g. `'mocked_booking'`) but test assertions expect real content (e.g. `'registered offline via Rust Core'`). The mock returns in `modules/clickflash-rust-core/index.ts` must match what the tests assert.
- **An improvements backlog** at `improvements_backlog.md` with ~15 open items spanning architecture, frontend, backend, security, and testing categories.

The verification commands are:
- Typecheck: `npm run typecheck:all` (must exit 0 with 0 errors)
- Tests: `pnpm run test:all` (all test suites must pass)
- Lint: `npm run lint:all`

**Important constraints:**
- This runs on Windows. Docker Desktop is NOT available — no Docker commands.
- The monorepo uses `pnpm` workspaces with Turborepo.
- Vitest is the test runner. Vitest `pool: 'forks'` can leak `vi.mock` module overrides between files — use `vi.spyOn` instead of `vi.mock` when possible.
- Timer functions (`setTimeout`, `setInterval`) must NOT use `window.` prefix in source code — bare globals work in both Node and JSDOM/Vitest environments.
- The Rust Core module (`apps/mobile/pro/modules/clickflash-rust-core`) is a JS facade with mock fallbacks — the actual Rust FFI is not available in this environment.

## Prior work (from previous failed run)

A previous orchestrator run dispatched 3 explorer agents but they died before completing. Their dispatch plan is at `c:\Users\alamo\Desktop\ClickFlash\.agents\orchestrator_prod_audit_1\DISPATCH.md`. You may use a DIFFERENT working directory (e.g. `.agents/orchestrator_prod_audit_2`) to avoid conflicts. Read the prior dispatch plan for context but start fresh.

## Requirements

### R1. Fix all existing TypeScript and test failures
Resolve the 2 typecheck errors in `apps/desktop/touch` and the 1 test failure in `apps/mobile/pro` so that `npm run typecheck:all` and `pnpm run test:all` both pass cleanly with zero errors.

### R2. Deep architecture and code quality audit
Audit every app and package in the monorepo for: files exceeding 500 lines, excessive `any` type usage, `@ts-ignore`/`@ts-expect-error` annotations, circular dependencies, dead code, unused exports, and prop-drilling anti-patterns. Produce a findings report and fix the most impactful issues.

### R3. Security audit
Scan the entire codebase for: hardcoded secrets or API keys, `eval()` usage, `innerHTML`/`dangerouslySetInnerHTML` without sanitization, SQL injection patterns (string concatenation in queries), missing input validation on API routes, and insecure cryptographic practices. Fix any critical or high-severity findings.

### R4. Performance audit
Identify: synchronous file I/O blocking the event loop (`readFileSync`, `writeFileSync` in server paths), missing database transaction wrappers around multi-query loops, N+1 query patterns, unbounded memory growth (missing cleanup in `useEffect`, event listener leaks), and bundle size issues. Fix blocking issues.

### R5. Testing coverage expansion
Review test coverage across all 14 apps and 11 packages. Add meaningful tests for any untested critical paths — particularly API route handlers, state management stores, and service modules. Every new test must pass in the Vitest environment.

### R6. Accessibility and i18n audit
Scan frontend components for WCAG violations: interactive elements using plain `div` instead of `button`, missing `tabIndex`, `onKeyDown`, `aria-label` attributes, and hardcoded English strings that bypass internationalization. Fix the most impactful accessibility violations.

### R7. CI/CD and infrastructure audit
Review `.github/workflows/` for: unpinned action versions, missing caching, redundant steps, and missing security checks. Review Docker configurations for: running as root, single-stage builds, health checks. Fix any findings.

## Acceptance Criteria

### Typecheck and Tests
- [ ] `npm run typecheck:all` exits with code 0 and reports 0 errors across all workspaces
- [ ] `pnpm run test:all` exits with code 0 and all test suites pass with 0 failures

### Code Quality
- [ ] No source file (excluding tests and generated code) exceeds 600 lines
- [ ] Zero `@ts-ignore` annotations remain in production source (test files excepted)
- [ ] All `any` type annotations in API route handlers and service modules are replaced with proper types

### Security
- [ ] Zero hardcoded secrets, API keys, or passwords in any source file
- [ ] Zero `eval()` calls in production source
- [ ] All SQL queries use parameterized queries — zero string concatenation patterns

### Performance
- [ ] Zero synchronous file I/O (`readFileSync`, `writeFileSync`) in any server-side request handler or worker
- [ ] All multi-query database loops are wrapped in transactions

### Accessibility
- [ ] All interactive photo grid elements use semantic HTML (`button` or `a`) with `tabIndex` and keyboard event handlers

### Audit Report
- [ ] A comprehensive `audit_report.md` is produced in the working directory documenting all findings, fixes applied, and remaining recommendations
