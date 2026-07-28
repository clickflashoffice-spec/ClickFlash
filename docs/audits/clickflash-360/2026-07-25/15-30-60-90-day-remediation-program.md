# 30/60/90-Day Remediation Program

The clock starts only after accountable owners and change/incident authority are assigned. Security containment runs immediately and is not deferred to a milestone.

## Days 0-30 — Contain and establish truth

| Workstream | Deliverables | Exit gate |
|---|---|---|
| Incident/security | Contain CF360-SEC-001; classify PEM/WAL; rotate/revoke; access-log and R2 exposure review; documented notification decision | Independent deny tests and DAST pass; incident commander signs containment |
| CI/release | Valid unique-key workflows; blocking required checks; immutable action pins; complete manifest-driven matrix; release automation paused until proven | Deliberate failures block; all deployables represented |
| Inventory/ownership | One owner and lifecycle for every app/Worker/package/service; exact deployed revisions/bindings/domains/database IDs | Signed system-of-record table |
| Data safety | Verified backups; migration ledgers captured; remote/destructive changes frozen; Ride deletion disabled | Restore smoke on synthetic/isolated copy; no sole-copy deletion |
| MoneyTrash | One native streaming entry path; visible cancellation; package-level smoke design | Selection/drop/cancel packaged smoke passes |
| Documentation | No-Go banners; replace 100% claims; link findings/evidence | Drift review passes |

**Day-30 decision:** production remains No-Go unless all Critical findings are closed with independent evidence. High findings can be risk-accepted only by named accountable leadership with expiry and containment.

## Days 31-60 — Unify controls and prove critical journeys

| Workstream | Deliverables | Exit gate |
|---|---|---|
| Identity/policy | Central auth middleware/policy library; public-route allowlist; tenant/event/object scoped repositories; audit events | Generated route-policy matrix and negative suite cover 100% of routes |
| Contracts/data | Versioned API schemas; bounded-context decision; one migration authority per datastore; N-1 compatibility plan | Clean install and upgrade converge; schema diff clean |
| Quality | Unit/contract/integration/fault suites for Cloud, MoneyTrash, gallery commerce/download, Touch offline/order | Required CI runs and fails closed |
| Native security | IPC inventory, sender/input validation, narrow bridges, CSP/navigation/window policy | Packaged-app adversarial IPC suite passes |
| Privacy/accessibility | Data inventory/retention/consent/deletion plan; critical journey WCAG 2.2 test protocol | Privacy and accessibility owners accept test evidence |
| Operations | Correlation IDs, redaction, route/queue metrics, alerts, runbooks, ownership | Synthetic failures trigger actionable alerts |

**Day-60 decision:** only isolated canary/staging release is eligible, and only for surfaces whose Critical/High blockers and rollback gates are closed.

## Days 61-90 — Establish trustworthy release and target architecture

| Workstream | Deliverables | Exit gate |
|---|---|---|
| Artifact trust | Clean reproducible builds, SBOM/provenance, managed signing/notarization, artifact promotion | OS verifies signatures; hashes/provenance match promoted artifacts |
| Update/install | Canonical updater decision; signed metadata; install/update/downgrade/rollback matrix | Tamper, interruption and rollback tests pass |
| Schema resilience | Backup/restore and failed-migration game day; retention/deletion automation | RPO/RTO and data-integrity targets achieved |
| Performance | Representative datasets; p50/p95/p99, memory, queue and cost telemetry; budget regressions | Budgets pass on minimum supported hardware |
| Accessibility | Complete-process manual + automated evidence across customer/operator journeys | No unresolved WCAG 2.2 A/AA blocker in release scope |
| Architecture | Ratified bounded contexts; deprecate orphan services/packages/generated outputs; mobile scope decision | Architecture decision records and migration roadmap approved |
| Release governance | Canary, health, rollback, incident drill and owner sign-off | Go/No-Go checklist fully evidenced |

## Program governance

- Weekly risk review uses finding IDs, not narrative status.
- Evidence must state commit, environment, timestamp, command/test, owner and retention location.
- A finding closes only when its acceptance criteria and regression tests pass; code merge alone is insufficient.
- Exceptions require scope, compensating controls, accountable approver, expiration, and automatic re-open.
- Production changes, key rotation, history rewrite, migrations and releases remain approval-gated.

## Outcome metrics

| Metric | Day 30 | Day 60 | Day 90 |
|---|---:|---:|---:|
| Open Critical findings | 0 target | 0 | 0 |
| Deployables in required CI | 100% | 100% | 100% |
| Non-public routes with negative auth tests | Inventory complete | 100% | 100% |
| Datastores with one migration owner | 100% mapped | 100% implemented | Restore rehearsed |
| Signed production desktop artifacts | No release | Candidate only | 100% |
| Critical journeys with fault tests | Plan complete | Customer/upload paths | All release scope |
| Critical journeys with accessibility evidence | Protocol complete | Customer paths | All release scope |
