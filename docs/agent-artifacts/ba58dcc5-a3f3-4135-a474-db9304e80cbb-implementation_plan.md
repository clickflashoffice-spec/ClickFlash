# Production Code Audit: ClickFlash Ecosystem

This document outlines the strategy for conducting a comprehensive, line-by-line production code audit of the entire ClickFlash ecosystem to ensure corporate-level professional quality, as requested via the `/production-code-audit` skill.

Due to the size of the monorepo (comprising 6 major apps and 7 shared packages), executing a single sequential audit is inefficient and risks context exhaustion. Therefore, we will orchestrate this using parallel subagents and automated tooling.

## User Review Required

> [!WARNING]
> **Massive Automated Refactoring**
> This process will autonomously modify code across the entire ecosystem. It will fix security vulnerabilities, refactor god classes, optimize performance (N+1 queries, bundle sizes), and enforce corporate standards. 
> 
> Ensure you have committed all current work and pushed it to a remote branch before we proceed.

## Open Questions

> [!IMPORTANT]
> 1. **Focus Areas:** Are there any specific apps or packages you want to prioritize or exclude from the audit?
> 2. **Destructive Changes:** The audit may aggressively break up large classes or remove unused code. Are you comfortable with significant structural refactoring, provided tests pass?
> 3. **Testing Pipeline:** We will rely on `pnpm run test:all` to verify that our changes do not break functionality. Are the current tests reliable enough to gate these changes?

## Proposed Changes

We will divide the audit into distinct phases and execution tracks. We will spawn specialized subagents to audit and fix individual boundaries in parallel.

### 1. Phase 1: Packages Audit & Hardening

We must first ensure the foundational packages are rock-solid, as all apps depend on them.
- Subagent 1: Audit `packages/config` and `packages/logger`
- Subagent 2: Audit `packages/database` and `packages/validation`
- Subagent 3: Audit `packages/ui`, `packages/types`, and `packages/test-utils`

### 2. Phase 2: Web & Cloud Apps

Once packages are secured, we will move to the web-facing applications, focusing heavily on security (OWASP), performance, and bundle optimization.
- Subagent 4: Audit `apps/website` (Next.js 15 + Tailwind 4)
- Subagent 5: Audit `apps/management` (React + Vite)
- Subagent 6: Audit `apps/gallery` (React + Stripe)

### 3. Phase 3: Desktop Kiosk & Core Systems

Finally, we will audit the Electron/Tauri applications, with a focus on IPC security, memory leaks, and local resource optimization.
- Subagent 7: Audit `apps/master` (Master Portal)
- Subagent 8: Audit `apps/touch` (Touch Kiosk)
- Subagent 9: Audit `apps/moneytrash` (Next.js 16 + Tauri)

### 4. Phase 4: Ecosystem-Wide Tooling

- We will run `pnpm run lint:all` and `pnpm run typecheck:all` to enforce consistency.
- We will integrate strict CI checks if any are missing.
- We will consolidate duplicate dependencies and update the root `turbo.json` if needed.

## Verification Plan

### Automated Tests
- The build must succeed: `pnpm run build:all`
- All unit and integration tests must pass: `pnpm run test:all`
- All linters and typechecks must pass: `pnpm run lint:all` & `pnpm run typecheck:all`

### Manual Verification
- We will provide a comprehensive report detailing metrics before and after the audit.
- You will need to spin up the local development environment (`pnpm run dev:legacy`) to manually verify cross-app IPC and UI functionality.
