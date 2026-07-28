# Findings and Surface Scorecards

## Canonical findings revalidated

The July 25 canonical register remains the full finding authority. Current checks re-confirm:

| Finding | Current status | Fresh evidence |
|---|---|---|
| CF360-SEC-001 Cloud authorization/object scope | Open, Critical | Fallback secret, unscoped download lookup, unguarded export/settings/biometric/payroll families remain |
| CF360-SEC-002 Tracked PEM | Open, Critical pending classification | Path remains tracked at current HEAD |
| CF360-PRIV-001 Tracked Touch WAL | Open, High pending classification | Path remains tracked at current HEAD |
| CF360-OPS-001 Invalid/fail-open CI | Open, High | `ci.yml` unique-key parsing still fails |
| CF360-OPS-002 Release/artifact trust | Open, High | Four sampled executables remain unsigned; release filters remain inconsistent |
| CF360-FUNC-001 MoneyTrash integration seam | Open, High | Visible picker still calls disabled `read_file`; upload service requires native paths |
| CF360-DATA-001 Schema authority | Open, High | No current ownership/migration decision or restore proof discovered |
| CF360-FUNC-002 Ride data loss | Open, High | Simulated upload still deletes source capture |
| CF360-ARCH-001 Backend ownership | Open, High | Cloud Backend plus three product Workers retain overlapping policy/data surfaces |
| CF360-TEST-001 Critical verification gaps | Open, High | Multiple release-scope type failures; mobile and Cloud coverage remain insufficient |
| CF360-OPS-003 Placeholder Update Server | Open, High if deployed | Pending/example signatures and URLs remain deployable configuration |
| CF360-SEC-003 Inconsistent boundaries | Open, High | Localized tests pass, but no ecosystem policy or route-generated deny suite exists |
| CF360-ARCH-002 Scope/generated-output drift | Open, Medium | Experimental/orphan/generated surfaces remain production-adjacent |
| CF360-UX-001 Accessibility assurance | Open, Medium | No complete-process runtime/assistive-technology evidence |
| CF360-PERF-001 Performance envelope | Open, Medium | No representative measured workload results |
| CF360-DOC-001 Documentation drift | Open, High | Six-app/complete/readiness claims still conflict with inventory and blockers |

## New execution findings

### CF360-VAL-001 — Release-scope TypeScript gates fail

- **Priority/confidence:** P1 / Confirmed
- **Affected:** Master, Management, Mobile Photographer, Cloud Backend
- **Impact:** Current HEAD cannot pass a complete release type gate; errors touch auth/request state,
  payroll behavior, mobile logging imports, JWT usage, and Worker runtime assumptions.
- **Remediation:** Fix root causes per surface, add first-class Cloud Backend typecheck, and make a
  manifest-generated type matrix required in CI.
- **Acceptance:** All deployable surfaces pass clean-checkout no-emit checks on the supported Node
  version; deliberate type failures block merge.

### CF360-TEST-002 — Worker tests mutate tracked audit logs

- **Priority/confidence:** P2 / Confirmed
- **Affected:** Management Worker, MoneyTrash Worker, repository hygiene
- **Impact:** Tests dirty the worktree, can couple results to prior executions, and may commit
  generated security/audit events.
- **Remediation:** Inject isolated temporary log sinks, keep fixtures immutable, ignore runtime
  logs, and add a post-test clean-tree gate.
- **Acceptance:** Repeated tests are deterministic and leave `git status --short` unchanged.

## Current per-surface disposition

| Surface | Static coverage | Fresh validation | Production disposition |
|---|---|---|---|
| Master | Deep representative | Typecheck FAIL; security tests PASS | No-Go until compile, signing, migration, restore, packaged journey gates |
| Touch | Deep representative | Typecheck PASS; security tests PASS | No-Go until WAL incident, signing, hardware/offline/recovery gates |
| MoneyTrash | Deep critical path | Typecheck/test PASS | No-Go until picker/drop/cancel/resume packaged flow works |
| Management UI | Representative | Typecheck FAIL | No-Go until compile, permissions, destructive/financial journey gates |
| Gallery UI | Representative | Typecheck PASS | No-Go through Cloud authorization/payment/download dependencies |
| Website | Route-complete static | Typecheck PASS | Conditional; runtime, deploy, forms, a11y, performance unknown |
| Cloud Backend | Deep security trace | Typecheck FAIL; no complete auth suite | Immediate No-Go |
| Installer | Representative security | Typecheck and 9 security tests PASS | No-Go until signing/install/update/rollback proof |
| License Generator | Representative | Typecheck and 11 tests PASS | Conditional; key custody/revocation/distribution unknown |
| MCP Server | Static only | No focused test/type gate | No-Go production |
| Docs | Static | Test/lint scripts are no-op | Supporting only; not release evidence |
| Mobile Client | Static | Starter/no release gate | Experimental |
| Mobile Customer | Static | No test/type/release proof | No-Go |
| Mobile Photographer | Static | Typecheck FAIL; test is no-op | No-Go |
| Mobile Staff | Static | No test/type/release proof | No-Go |
| Ride Node | Deep destructive path | No safe runtime test | Prohibited on customer data |
| Master C++ | Static | No meaningful test/release gate | Experimental |
| Gallery Worker | Representative | Typecheck + 31 tests PASS | Conditional; deployed config/migration/rollback unknown |
| Management Worker | Representative | No-emit + 60 tests PASS | Conditional; CORS/authority/deploy/data ownership unresolved |
| MoneyTrash Worker | Representative | Typecheck + 20 tests PASS; dirties logs | Conditional; remote/storage/recovery unknown |
| Update Server | Static complete | No tests; placeholder feed | No-Go / remove from deploy scope |

Shared packages remain supporting or orphaned as classified in the July 25 scorecards. Package
presence is not treated as proof of cross-ecosystem adoption.

