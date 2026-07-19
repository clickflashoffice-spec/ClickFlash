# ClickFlash Phase 5: Full 17-Layer Ecosystem Audit & Production Staging/Deployment

You selected **both**: expanding the security and licensing audit to cover the remaining 8 layers of the 17-layer ecosystem **and** staging/deploying the rebuilt production binaries (`license-generator`, `installer`, `master`, and Cloudflare Workers).

## User Review Required

> [!IMPORTANT]
> **Production Staging Scope:**
> We have already verified the core 9 layers locally and rebuilt the binaries. In this phase, we will:
> 1. Audit and verify the remaining layers (10 through 17).
> 2. Execute local production verification builds.
> 3. Prepare deployment scripts and run verification against Cloudflare Workers and staging environments.
> Please review the expanded checklist below and click **Proceed** to begin execution.

## Proposed Changes / Plan of Action

---

### Phase C: Expanded Ecosystem Verification (Layers 10-17)

We will systematically verify that there are no broken dependencies, insecure endpoints, or missing authorization gates across the rest of the monorepo.

#### 10. Customer Gallery & Edge Worker (`apps/gallery` + `workers/gallery-worker`)
- **Action**: Audit `apps/gallery` and `workers/gallery-worker` for secure photo serving, Stripe webhook handling, and watermark/access enforcement.
- **Verification**: Ensure gallery worker checks token signatures or R2 path tokens properly.

#### 11. Website & Landing Page (`apps/website`)
- **Action**: Verify `apps/website` (Next.js 15) builds cleanly and correctly links to onboarding and customer portals.
- **Verification**: Run `npm run build` inside `apps/website` or verify zero broken imports.

#### 12. Cloud Backend & Update Infrastructure (`apps/cloud-backend`, `workers/moneytrash-worker`, `workers/update-server`)
- **Action**: Audit `workers/update-server` to verify how OTA updates and binaries (`master`, `touch`, `installer`) are served and validated.
- **Verification**: Verify update checking mechanics and ensure compatibility with our newly generated Ed25519 builds.

#### 13. Mobile Applications (`apps/mobile-customer` & `apps/mobile-staff`)
- **Action**: Verify API configurations and authentication flows in the mobile apps.
- **Verification**: Ensure they correctly interface with `apps/master` and `workers/management-worker`.

#### 14. Core API & Contracts (`packages/api`, `packages/types`, `packages/validation`)
- **Action**: Verify type safety, Zod schemas, and API contracts shared between frontend apps and backend workers.
- **Verification**: Run type checks (`tsc --noEmit`) across shared packages.

#### 15. Shared Infrastructure (`packages/database`, `packages/config`, `packages/logger`)
- **Action**: Ensure `DatabaseManager` and SQLite/SQLCipher configurations handle encrypted and plaintext states cleanly without throwing unhandled exceptions.
- **Verification**: Review error handling and verify clean initialization.

#### 16. Shared UI & Telemetry (`packages/ui`, `packages/shared`, `packages/telemetry-web`)
- **Action**: Verify shared UI tokens and telemetry reporting endpoints.
- **Verification**: Audit `telemetry-web` for zero-console-log compliance and clean error swallowing/reporting.

#### 17. CI/CD & Production Deployment Scripts (`deploy_mgmt_v2.bat`, `wrangler.toml` configurations)
- **Action**: Audit all deploy scripts (`deploy_mgmt_v2.bat`, etc.) and Wrangler configurations across workers (`workers/management-worker`, `workers/gallery-worker`, etc.).
- **Verification**: Ensure production flags, environment secrets (`LICENSE_PRIVATE_KEY`, `LICENSE_PUBLIC_KEY`), and D1 bindings are properly configured for live deployment.

---

### Phase D: Staging & Production Deployment

#### 1. Re-verify Release Artifacts
- Confirm the built binaries for `apps/license-generator` and `apps/installer` exist in their respective `release`/`dist` directories and are ready for distribution.

#### 2. Cloudflare Worker Deployment & Dry-Run
- Run syntax and configuration checks on `workers/management-worker`.
- Verify/prepare the deployment sequence (`wrangler deploy` or `deploy_mgmt_v2.bat`) for the Cloudflare worker infrastructure so you can deploy to live production with zero downtime.

## Verification Plan

### Automated Tests & Checks
- Run typechecking and build validation where applicable across layers 10-17.
- Execute deployment configuration validation (`npx wrangler dry-run` or `--dry-run` checks where supported, or inspect generated bundle sizes).
- Summarize all release artifacts and exact commands to go live in `walkthrough.md`.
