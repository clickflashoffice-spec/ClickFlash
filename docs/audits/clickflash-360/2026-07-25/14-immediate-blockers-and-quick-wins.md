# Immediate Blockers and Quick Wins

No item below was implemented. Production, credential, history-rewrite, migration, release, and deploy actions require explicit authorization and appropriate incident/change control.

## Stop-ship / stop-deploy blockers

| Priority | Action | Why now | Exit evidence | Owner |
|---|---|---|---|---|
| B0-01 | Edge-block or disable affected Cloud Backend export/download/config/biometric/payroll routes | CF360-SEC-001 permits credible unauthorized data/action access | Deployed route inventory, deny tests, DAST and access-log review | Cloud + Security |
| B0-02 | Confirm, rotate and enforce strong `JWT_SECRET`; remove fallback behavior | Token forgery becomes possible if runtime secret is absent | Secret metadata/status, token invalidation record, negative tests; never print value | Cloud + Security |
| B0-03 | Classify/contain tracked PEM and WAL; rotate/revoke/purge as applicable | Potential signing and privacy incident | Approved incident record, trust rotation, history/path scan, legal/privacy decision | Incident commander |
| B0-04 | Pause release/deploy automation | CI and release evidence are not trustworthy | Valid blocking CI, clean release rehearsal, required checks | Release/Platform |
| B0-05 | Prohibit Ride Node on production/customer data | Current worker can delete sole copies after simulated success | Deletion disabled; durability suite passes | Ride owner |
| B0-06 | Quarantine unsigned desktop executables and placeholder update feed | Artifact authenticity/rollback not established | OS signature/provenance and tamper/rollback evidence | Release owner |
| B0-07 | Freeze destructive/remote migrations until database ownership is mapped | Multiple authorities can drift or damage data | Database ID/owner/ledger map and verified backups | Data owner |

## Safe quick wins after containment

| ID | Change | Effort | Risk | Acceptance |
|---|---|---:|---|---|
| QW-01 | Repair duplicate workflow YAML and add a unique-key parser gate | S | Low | All workflow files parse; duplicate-key fixture fails |
| QW-02 | Remove `continue-on-error` from required audit/lint/typecheck gates | S | Medium | Deliberate failure blocks PR; branch protection requires exact check |
| QW-03 | Pin third-party actions to reviewed immutable commit SHAs | S | Low | Policy check finds no mutable action refs |
| QW-04 | Generate CI matrix from workspace manifests, including Workers/services/mobile | M | Low | Every deployable in inventory maps to a required job |
| QW-05 | Remove Update Server from deploy matrix pending ownership decision | S | Low | Unowned placeholder cannot deploy |
| QW-06 | Label Mobile Client and Ride Node Experimental in product/release docs | S | Low | No production/readiness claim remains |
| QW-07 | Add ignores/policy for WAL/SHM/runtime DB and generated reports | S | Low after incident preservation | Synthetic fixtures work; no new runtime DB/report artifacts commit |
| QW-08 | Publish route-policy matrix and public-route allowlist | M | Low | Every route has owner, audience, auth, role, scope and rate-limit row |
| QW-09 | Wire MoneyTrash picker/drop to the native streaming descriptor | M | Medium | Packaged selection/drop succeeds with bounded memory |
| QW-10 | Expose upload cancel and retain originals until verified acknowledgement | M | Low | Cancel/restart tests pass; no sole-copy deletion |
| QW-11 | Correct release package filters and require artifact existence before upload | S | Low | Clean release dry-run emits exactly declared files |
| QW-12 | Add No-Go/superseded banner to stale readiness docs | S | Low | All active entry docs link current evidence and lifecycle |

## First 72 hours

1. Name incident, Cloud, Release, Data, Privacy and product owners.
2. Contain CF360-SEC-001 and verify deployed revision/routes without mutating data.
3. Classify the PEM/WAL under restricted handling and decide rotation, notification and history action.
4. Preserve Cloudflare/GitHub/access logs and inventory public R2 visibility.
5. Stop automated production deploy/release and publish internal No-Go notice.
6. Back up affected databases and record current migration ledgers before any change.
7. Create tracked remediation issues using the canonical IDs and acceptance criteria.

## Explicitly not a quick win

- Rewriting Git history before rotation/incident coordination.
- Deleting or altering the PEM/WAL to make scans green.
- Adding a single global auth check without object/role/tenant tests.
- Re-enabling a green workflow by suppressing parser/type/security failures.
- Consolidating hundreds of migrations without deployed-schema discovery and restore rehearsal.
- Shipping an unsigned artifact because the source build passed.
- Claiming WCAG conformance from an automated scanner.
