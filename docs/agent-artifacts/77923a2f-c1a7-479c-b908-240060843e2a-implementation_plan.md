# Finalize ClickFlash Ecosystem

This plan follows the `/acceptance-orchestrator` workflow to finalize the ClickFlash ecosystem. Since we don't have a linked issue tracker, this plan will act as the **Issue Gate** and **DoD (Definition of Done)** definition.

## Goal
Perform a complete end-to-end verification and cleanup of the entire ClickFlash ecosystem (6 apps + shared packages) to ensure it is in a "finalized" and releasable state.

## Definition of Done (Acceptance Criteria)
To consider the ecosystem finalized and reach the `accepted` state, the following must be proven with runtime evidence:
- [ ] Safe cleanup of caches/build outputs executes successfully.
- [ ] Type-checking passes across all apps with no errors.
- [ ] Linting passes across all apps with no warnings/errors.
- [ ] Test suite passes across the ecosystem with no failures.

## User Review Required

> [!IMPORTANT]
> Since this is an ecosystem-wide operation, please review the Acceptance Criteria above. Are there any specific apps (e.g., Master Portal, Touch Kiosk) or additional checks (e.g., E2E testing or build packaging) you want included in the Definition of Done before we execute?

## Proposed Execution Plan

I will run the following commands in sequence as part of the `closed-loop-delivery` phase. If any command fails, I will halt and debug the failure (or escalate if blocked):

1. **Cleanup**: `pnpm run clean:safe`
2. **Typecheck**: `pnpm run typecheck:all`
3. **Lint**: `pnpm run lint:all`
4. **Test**: `pnpm run test:all`

## Verification Plan

### Automated Verification
- I will verify the exit codes of the above `pnpm` scripts. 
- A successful `0` exit code for all checks will act as the required runtime evidence for the Acceptance Criteria.
- If everything passes, the state machine will move to `accepted`. If errors occur that I cannot resolve after 2 iteration rounds, I will move the state to `escalated`.
