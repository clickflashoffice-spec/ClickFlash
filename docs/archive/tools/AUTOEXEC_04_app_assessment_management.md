# Per-App Assessment Report: MANAGEMENT

## 1. Overview
- **App Directory**: `apps/management`
- **Total Files**: 474
- **Estimated LOC**: N/A
- **Has package.json**: Yes
- **Has tsconfig.json**: Yes
- **Framework/Tech**: React

## 2. Dependencies
- **Production Dependencies**: 21
- **Dev Dependencies**: 26
- **Dependency Mismatches vs Workspace**: 0

## 3. Security Surface
- **.env Files**: 4
- **Secret Exposures Detected**: 4

### Secret Findings
- `apps\management\backend\.env`: JWT_SECRET
- `apps\management\backend\.env`: API_KEY_GENERIC
- `apps\management\backend\.env.example`: JWT_SECRET
- `apps\management\backend\.env.example`: API_KEY_GENERIC

## 4. Test Coverage
- **Test Files**: 0
- **Test Types**: None detected

## 5. Database / Migrations
- **Migration Files**: 0
- **Duplicate Prefixes**: 0

## 6. Code Quality Signals
- **TypeScript Config Present**: Yes
- **Lint Script Present**: Yes
- **Typecheck Script Present**: Yes

## 7. Recommendations
- [ ] Add unit/integration tests (Jest/Vitest/Playwright)
- [ ] **URGENT**: Rotate exposed secrets and purge from git history
- [ ] Review and patch known vulnerabilities from npm audit
