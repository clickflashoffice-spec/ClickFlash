# Cloud Pipeline Audit

**Date:** 2026-07-18  
**Status:** Focused checkpoint complete; ecosystem audit remains active  
**Deployment performed:** No

## Scope

This checkpoint traced the repository's current Cloudflare deployment paths,
database migrations, Website API ownership, production-origin policy, and the
public access-code boundary. Gallery remains an online-only application.

## Canonical Cloud Surfaces

| Surface | Canonical project evidenced by CI/config | Runtime data |
| --- | --- | --- |
| Gallery API and shared Website API | `workers/gallery-worker` | Gallery D1, Website D1, R2 |
| Management API | `workers/management-worker` | Management D1, Gallery/backup R2 |
| MoneyTrash API | `workers/moneytrash-worker` | MoneyTrash D1/R2 bindings |
| Desktop update metadata/artifacts | `workers/update-server` | Update R2 |
| Gallery UI | `apps/gallery` | Cloudflare Pages; online-only |
| Management UI | `apps/management` | Cloudflare Pages |
| Public Website | `apps/website` | Existing Git/Cloudflare integration |

The isolated `apps/cloud-backend` surface had no current source, CI, or script
owner after the Management license flow was migrated. It has been retired from
the workspace instead of preserving a second auth/payment/license authority.

## Findings and Remediation

### CP-001: The local deployment script targeted deleted backends

The old `scripts/deploy-cloud.ps1` referenced `apps/management/backend` and
`apps/gallery/backend`, which are not the canonical CI worker projects.

The script now validates and dry-runs all four canonical workers, builds the
three web frontends, maps every D1 migration target explicitly, defaults to
staging, rejects placeholder staging database IDs, and protects remote
migrations/deployments with PowerShell `ShouldProcess`. Production is selected
explicitly with Wrangler's top-level environment argument.

### CP-002: Website D1 schema had no migration path

Gallery Worker binds both Gallery D1 and Website D1, but only the Gallery D1
migration directory was wired. Binding-specific migration directories are now
configured, following Cloudflare's documented `migrations_dir` support:
[Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).

`workers/gallery-worker/migrations/website/001_public_api_tables.sql` creates
the Website API tables and compatibility columns used by the current route
implementations.

### CP-003: Production CORS accepted deceptive and provider-wide origins

Management Worker previously accepted hostname suffixes such as
`evilclickflash.com`, every `pages.dev`/`workers.dev` origin, and localhost in
production. It also allowed disallowed requests to execute without CORS response
headers.

Production now uses exact configured origins, rejects disallowed explicit
origins with 403 before route execution, adds `Vary: Origin`, and limits wildcard
and localhost behavior to non-production environments.

### CP-004: Two workers implemented incompatible Website APIs

The Website build targets `gallery-backend`, whose Gallery Worker owns
`WEBSITE_DB`. Management Worker also exposed an unreferenced copy with different
tables, response fields, and redirect rules; its auth catch-all could intercept
those nominally public routes. The Management copy is removed. Gallery Worker
now owns one extracted, Zod-validated `/api/website/*` route module matching the
Website frontend contract.

### CP-005: Access-code contracts were incompatible and redirect trust was weak

Management accepted any six-character string without a database match, while
Gallery returned camelCase fields the Website did not consume and trusted a
stored redirect URL. The canonical implementation now normalizes, format-limits,
and rate-limits codes; requires an active, unexpired D1 record with an album ID;
returns the frontend's `gallery_info`/`redirect_url` fields; and constructs the
redirect from the configured online Gallery root only. Gallery is never a
packaged/local target.

### CP-006: Public form input reached notification HTML without escaping

Booking/contact inputs now use bounded Zod schemas and normalized email fields.
Booking notification HTML escapes every customer-controlled value, and mail is
sent only when the Resend secret plus explicit sender and recipient settings are
configured. Contact, booking, and access-code routes retain D1-backed per-IP
rate limits.

### CP-007: Provisioning and licensing failed open

Desk registration previously enforced the provisioning secret only when one
happened to be configured. Public onboarding could issue licenses, an unsigned
onboarding webhook could change plans, and the Management UI called an
unimplemented admin route without a JWT while presenting fabricated RSA data.

Registration now fails closed when provisioning is not configured and uses a
constant-time header/body compatibility check. The unsigned webhook is removed
in favor of the Stripe-signature-verifying billing webhook. License generation
requires an Admin/CEO JWT and a configured private key, validates bounded input,
persists the license, and signs a hardware-bound Ed25519 key. The UI sends its
session JWT, downloads the real license object, and no longer seeds fake records.

### CP-008: Generated web mirrors bypassed canonical ownership

`apps/website/public/manage` and `public/gallery` contained roughly 15 MB of
checked-in build output, including the retired license client. Canonical CI
already deploys Management and Gallery as independent online Pages apps. The
generated mirrors and the obsolete script that recreated them are removed.

### CP-009: Production deployment and key rotation had conflicting owners

CI, release, and two deployment workflows could all mutate production. Two used
deleted backend paths; the tag release coupled desktop publishing to a cloud
redeploy. A scheduled key job called a missing JavaScript artifact, edited local
checkout `.env` files, and never propagated rotated values to Cloudflare.

CI is now side-effect free, Pages and Worker deployments have separate canonical
workflows and production concurrency guards, Worker migrations run before their
deployments, and desktop release no longer deploys cloud services. The unsafe
rotation job and obsolete deploy script are removed. Secret audit/provisioning
now targets the canonical Workers through Wrangler, defaults to staging, and
requires production to be selected explicitly.

### CP-010: Billing trusted caller-controlled commercial fields

Checkout previously accepted caller-provided Stripe price IDs, return URLs, and
customer identity, while webhook fulfillment had no durable event claim. The
Management Worker now derives the Pro price and HTTPS return URL from
server-owned configuration, requires the authenticated session identity,
rejects duplicate active subscriptions, and supplies a deterministic Stripe
idempotency key. Webhook processing verifies the Stripe signature, claims each
event in D1, retries stale or failed claims safely, and fulfills only sessions
tagged for the Management product. Checkout creates the paid studio and a
pending destination, but does not mint a device license from a destination ID.
Hardware-bound issuance requires the real OS UUID through authenticated admin
or protected provisioning. Cancellation revokes matching licenses and
downgrades the studio.

### CP-011: Management production schema drifted from its migration ledger

A fresh isolated Management D1 applied all 42 migrations only after repairing
legacy ordering and duplicate-column assumptions. The reconciled chain defers
indexes until their columns exist, reserves obsolete alignment migrations as
safe no-ops, and creates the current order and destination columns in the first
migration that can do so safely.

Read-only inspection found that production records only
`001_initial_schema.sql` as applied even though its schema contains columns from
later/manual changes. Applying the next recorded migration would fail on an
existing column. Production also lacks current feature tables including
`studios`, `licenses`, `stripe_webhook_events`, `refresh_tokens`, and
`oauth_device_codes`. Management migrations and deployment therefore remain
blocked pending an authorized backup, migration-adoption plan, and maintenance
window. The canonical Worker workflow is manual-only so this unsafe state cannot
be reached by an ordinary push.

## Validation Evidence

- Gallery D1 local migrations: 13 commands applied successfully across the
  existing security/commerce migrations.
- Website D1 local migration: 14 commands applied successfully.
- Gallery Worker: typecheck passed; 4 suites and 31 tests passed, including 8
  canonical Website API contract/security tests.
- Management Worker: typecheck passed; 11 suites and 60 tests passed, including
  CORS, provisioning, billing, webhook idempotency, admin-role, and
  hardware-bound licensing boundaries.
- Management D1: all 42 migrations applied successfully to a fresh isolated
  local database after legacy ordering reconciliation. Read-only production
  inspection confirmed the migration-ledger drift described in CP-011; no
  remote mutation was performed.
- Management UI: typecheck passed; 8 active suites and 54 tests passed (1 suite
  and 8 tests remain intentionally skipped); production build passed.
- Website: typecheck passed; 2 suites and 6 tests passed; production build
  completed with the canonical Gallery API URL supplied explicitly after the
  generated Gallery/Management mirrors were removed.
- Licensing package: Ed25519-only build passed; 1 suite and 2 tests passed.
- Production Wrangler dry runs passed for Gallery, Management, MoneyTrash, and
  Update workers; no upload/deployment occurred.
- Gallery production dry-run bundle after consolidation: 595.98 KiB,
  gzip 102.12 KiB.
- Management production dry-run bundle after hardening: 1927.14 KiB,
  gzip 326.98 KiB.
- The rewritten full production pipeline completed under `-WhatIf`; every
  remote mutation was reported but not executed.
- Frozen offline installation passed across the reduced 28-project workspace;
  the four edited GitHub workflows parse as YAML and the canonical secret script
  passes `bash -n` syntax validation.

## Remaining Risks

1. Management production D1 cannot safely run the checked-in migrations until
   its ledger and manually evolved schema are backed up and reconciled in an
   explicitly authorized maintenance window.
2. Booking/contact retention, notification delivery, and abuse behavior still
   require an explicitly authorized staging smoke test.
3. Several staging D1 IDs remain placeholders; the deploy script intentionally
   fails closed until real IDs are provisioned.
4. Automated key rotation remains intentionally disabled until a secrets manager
   can rotate providers and all consumers atomically; the current tool is manual.
5. The older broad Management `server.test.ts` suite remains ignored and contains unrelated
   stale route expectations. Focused current tests cover this checkpoint only.
6. Website production builds still report existing advisory lint warnings and
   a workspace-root warning caused by another lockfile above the repository.
7. No global monorepo typecheck result is claimed; the earlier broad run did not
   complete.

## Exit Criteria for Cloud Phase

- Back up and reconcile the Management production migration ledger before any
  Management Worker deployment.
- Complete email, auth/authorization, rate-limit, and secret matrices.
- Run Website form/access-code contract smoke tests against authorized staging.
- Replace staging placeholders and validate remote migrations in an explicitly
  authorized staging change window.
- Add every canonical worker and frontend to enforced aggregate CI.
