# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Finalize the ClickFlash photography ecosystem by implementing the remaining missing core features to a production-ready standard.

Working directory: c:/Users/alamo/Desktop/ClickFlash
Integrity mode: demo

## Requirements

### R1. Monetization and Growth
Implement the missing Phase 5 features: tiered freemium pricing with usage limits, a referral program tracking commissions, a real-time analytics dashboard for studio owners, and a white-label configuration system.

### R2. ML Services Integration
Implement the missing MLWorker integrations in the master-cpp backend, specifically auto-culling logic, face detection, and model training triggers.

### R3. Ecosystem Polish
Resolve all remaining `TODO` comments across the codebase and ensure all apps pass the pre-commit checklist (linting, type checking, tests).

## Acceptance Criteria

### Verification
- [ ] A simulation script successfully runs through the monetization and growth flows (signup, upgrade, referral, analytics) without errors.
- [ ] An API test against the C++ backend for face detection returns valid JSON with bounding boxes.
- [ ] `npm run lint:all` and `npm run test:all` pass with 0 errors across the ecosystem.

---
*Next: when approved → delegate via invoke_subagent*
