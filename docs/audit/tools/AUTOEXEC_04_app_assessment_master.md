# Per-App Assessment Report: MASTER

## 1. Overview
- **App Directory**: `apps/master`
- **Total Files**: 2475
- **Estimated LOC**: N/A
- **Has package.json**: Yes
- **Has tsconfig.json**: Yes
- **Framework/Tech**: React

## 2. Dependencies
- **Production Dependencies**: 58
- **Dev Dependencies**: 56
- **Dependency Mismatches vs Workspace**: 0

## 3. Security Surface
- **.env Files**: 12
- **Secret Exposures Detected**: 11

### Secret Findings
- `apps\master\.env`: JWT_SECRET
- `apps\master\.env`: API_KEY_GENERIC
- `apps\master\.env.example`: JWT_SECRET
- `apps\master\backend\.env`: JWT_SECRET
- `apps\master\backend\.env.example`: JWT_SECRET
- `apps\master\backend\setup\config-template.env`: JWT_SECRET
- `apps\master\ClickFlash-Master-test-hotel-2\.env`: JWT_SECRET
- `apps\master\ClickFlash-Master-test-hotel-2\.env`: API_KEY_GENERIC
- `apps\master\configs\club.env`: JWT_SECRET
- `apps\master\configs\concorde.env`: JWT_SECRET
- `apps\master\configs\occidental.env`: JWT_SECRET

## 4. Test Coverage
- **Test Files**: 0
- **Test Types**: None detected

## 5. Database / Migrations
- **Migration Files**: 0
- **Duplicate Prefixes**: 0

## 6. Code Quality Signals
- **TypeScript Config Present**: Yes
- **Lint Script Present**: Yes
- **Typecheck Script Present**: No

## 7. Recommendations
- [ ] Add unit/integration tests (Jest/Vitest/Playwright)
- [ ] **URGENT**: Rotate exposed secrets and purge from git history
- [ ] Review and patch known vulnerabilities from npm audit
