# Per-App Assessment Report: MONEYTRASH

## 1. Overview
- **App Directory**: `apps/moneytrash`
- **Total Files**: 124
- **Estimated LOC**: N/A
- **Has package.json**: Yes
- **Has tsconfig.json**: Yes
- **Framework/Tech**: React

## 2. Dependencies
- **Production Dependencies**: 15
- **Dev Dependencies**: 18
- **Dependency Mismatches vs Workspace**: 0

## 3. Security Surface
- **.env Files**: 2
- **Secret Exposures Detected**: 3

### Secret Findings
- `apps\moneytrash\.env`: API_KEY_GENERIC
- `apps\moneytrash\.env`: DATABASE_URL
- `apps\moneytrash\.env.example`: DATABASE_URL

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
