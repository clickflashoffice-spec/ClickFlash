## Summary

<!-- 1-3 bullet points describing what this PR does and why -->

-

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactor (no functional changes)
- [ ] Documentation
- [ ] CI/CD or infrastructure
- [ ] Dependencies update

## Affected Apps

- [ ] Master (Electron)
- [ ] Touch (Electron kiosk)
- [ ] Gallery (CF Worker)
- [ ] Management (CF Worker)
- [ ] Website (Next.js)
- [ ] MoneyTrash (Tauri)
- [ ] Packages (`@clickflash/types`, `ui`)
- [ ] None (docs, CI, config only)

## Testing Checklist

- [ ] `npm run typecheck:all` passes (0 errors across all apps)
- [ ] `npm run lint:all` passes for affected apps
- [ ] Unit tests pass (`pnpm --filter <app> test`)
- [ ] E2E tests pass for affected flows (if applicable)
- [ ] Architecture boundaries respected (no cross-app imports)
- [ ] Manually tested in dev environment

## Security Checklist (if applicable)

- [ ] No secrets in code or config files
- [ ] Input validation with Zod for new endpoints
- [ ] Rate limiting on new auth endpoints
- [ ] CORS not widened beyond required origins

## Screenshots / Recordings

<!-- If UI changes, add before/after screenshots -->

## Notes for Reviewers

<!-- Any context, trade-offs, or areas to focus review on -->
