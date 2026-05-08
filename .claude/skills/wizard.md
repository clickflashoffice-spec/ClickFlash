---
name: wizard
description: Plan-first, test-driven development workflow. Invoke before implementing any feature or non-trivial change.
triggers:
  - implement
  - build feature
  - add feature
  - create
  - new feature
---

# Wizard: Plan-First TDD Workflow

## When to invoke
Before writing any code for a new feature, significant refactor, or change touching >3 files.
Skipping planning creates context debt that costs more tokens to fix later.

## Steps

### 1. Clarify (max 2 questions)
- What is the exact input/output?
- Does this touch security-sensitive code (auth, payments, file uploads, CORS)?

### 2. Locate existing patterns first
Search before writing anything new:
```bash
# Find similar components
ls apps/<app>/src/components/
# Check shared packages
ls packages/utils/src/ packages/shared/src/ packages/lib/src/
# Find existing API routes
ls apps/<app>/backend/src/routes/
```

### 3. Write a numbered implementation plan
List exact files to create/modify. Flag:
- Security implications (auth, CORS, CSP, rate limiting)
- State management choice (React Query vs Zustand vs Context)
- Breaking changes to shared `packages/`
- Whether a top-level `<ErrorBoundary>` is in `main.tsx`

### 4. Write failing tests first
Backend: Jest unit tests in `apps/<app>/backend/__tests__/`
Frontend: React Testing Library in `apps/<app>/src/`
Tests define the contract before implementation.

### 5. Implement to pass tests
Enforce CLAUDE.md rules during implementation:
- `npx tsx` not bare `tsx` in npm scripts
- `npm --prefix apps/<app>` from repo root
- `@tanstack/react-query` for all server data (never `useState`)
- `ErrorBoundary` present in `main.tsx`
- Zod `^4.1.x` for input validation

### 6. Verify
```bash
npm --prefix apps/<app> run lint
npm --prefix apps/<app> run typecheck
npm --prefix apps/<app> test
```

### 7. Commit
```
type(scope): description
```
Single scope in kebab-case — `feat(gallery)` not `feat(gallery,master)`.
