# Dependency Alignment — Verification Checklist

## Root Configuration Applied

- [x] `pnpm.catalogs.default` added to root `package.json`
- [x] `pnpm.overrides` added for security-sensitive packages
- [x] Catalog includes 41 shared packages (react, typescript, vite, tailwind, etc.)

## Per-App Migration

- [ ] Replace version strings with `catalog:` in each app's `package.json`
  - gallery: 29 packages
  - master: 30 packages
  - touch: 28 packages
  - management: 24 packages
  - moneytrash: 14 packages
  - website: 13 packages
  - installer: 11 packages
- [ ] Run `pnpm install` to regenerate lockfile
- [ ] Run `pnpm audit --prod` to verify 0 high/critical
- [ ] Run `pnpm -r run typecheck`
- [ ] Run `pnpm -r run build`
- [ ] Run `pnpm -r run test:ci`

## CI Enforcement

- [ ] Add GitHub Action step: `pnpm audit --prod --audit-level high`
- [ ] Add GitHub Action step: `pnpm exec syncpack list-mismatches` (optional)

## Acceptance Criteria

- [ ] `pnpm audit --prod` returns 0 high/critical
- [ ] All apps build successfully
- [ ] All tests pass
- [ ] CI enforces audit and catalog compliance