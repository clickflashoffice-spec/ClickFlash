# Documentation Drift Register

Repository documentation was treated as secondary evidence. “Complete”, “production”, “secure”, and checklist completion language was not accepted without source/config/validation evidence.

| Drift ID | Claim/source | Contradicting repository evidence | Impact | Required correction |
|---|---|---|---|---|
| DRIFT-001 | Root `README.md` presents a “complete 6-app” ecosystem and “6/6 Complete (100%)” | Repository has 17 app directories, 4 Workers, 13 packages, 2 service directories; mobile/native/update surfaces are incomplete/orphaned | Executive/release decisions use the wrong scope and readiness | Replace with generated inventory and lifecycle/readiness table |
| DRIFT-002 | `task.md` completion language for broad hardening/release work | Active Cloud Backend has critical authorization gaps; CI is invalid/non-blocking; local executables unsigned | False assurance | Link every completion mark to command, commit, artifact, and expiry/current-state check |
| DRIFT-003 | Credential containment/rotation items appear complete | `payload_private_key.pem` is tracked with repository history; runtime rotation/revocation cannot be proven from source | Incident may be prematurely closed | Mark open until approved classification, rotation/revocation, history purge, and verification |
| DRIFT-004 | Desktop/release checklists imply validation | Release jobs do not reliably package expected artifacts; inspected executables are `NotSigned` | Unsafe distribution | Add per-platform artifact/signature/provenance evidence and rollback result |
| DRIFT-005 | Mobile surfaces appear in product/release scope | One app is Expo starter, another contains starter residue, no tests/EAS config, release filter names do not match manifests | Nonexistent release readiness | Classify Experimental/Partial or fund a complete mobile release track |
| DRIFT-006 | Update Server is included in deployment workflow | Placeholder signature/URLs and no source consumer; clients use GitHub updater | Orphan service can be deployed and misinterpreted | Remove from deployment or define, implement, test, and document the canonical channel |
| DRIFT-007 | Worker/deploy workflows imply quality-gated deployment | `ci.yml` duplicate keys; audits/lint/typecheck can be non-blocking; Cloud Backend typecheck failed | Main can deploy without reliable gate | Make CI valid and required; capture deployment revision and evidence |
| DRIFT-008 | Shared architecture/packages imply consolidation | Five packages have no discovered consumers; local UI primitives remain duplicated | Maintenance scope and reuse are overstated | Publish supported package ownership/consumers and deprecate/archive unused units |
| DRIFT-009 | Database/migration documentation suggests an organized schema history | 843 migration/schema-related files across many authorities and 110 identical SQL groups | Upgrade/rollback instructions may target the wrong authority | Create datastore ownership map and generated migration ledger |
| DRIFT-010 | MoneyTrash UI copy presents working file/folder selection/upload | Primary UI calls deliberately rejected whole-file service; drop path lacks required native path | User-facing instructions lead to failure | Mark feature blocked until packaged journey is proven; update copy only with implementation |
| DRIFT-011 | Ride Node upload naming/logging implies remote success | Upload worker sleeps, logs success, then deletes local file | Catastrophic false operational signal | Label simulator/experimental and prohibit production data |
| DRIFT-012 | Security checklists imply coherent authorization | Active routes lack authentication/object scope and contain fallback JWT material | Checklist completion masks exploitable conditions | Replace checkbox with generated route-policy matrix and negative-test evidence |
| DRIFT-013 | Coverage thresholds imply enforced quality | Common CI paths run plain tests and multiple surfaces have no tests | Coverage claim can be bypassed | Enforce thresholds in required CI per deployable |
| DRIFT-014 | Vercel/Cloudflare Pages references coexist | Workflows and docs do not establish one environment/deployment authority | Configuration and incident ownership ambiguity | Document canonical host, project, domain, owner, and rollback per site |

## Documentation governance

1. Generate surface, manifest, route, migration, and workflow inventories in CI.
2. Every readiness statement must include scope, timestamp, audited commit, evidence command/artifact, and owner.
3. Ban “100%”, “production-ready”, and “secure” unless a defined gate is both complete and current.
4. Separate planned, implemented, validated, deployed, and observed-in-production states.
5. Mark archived reports and superseded runbooks with owner/date and remove them from active operational navigation.
6. Treat task ledgers as claims requiring current validation, not proof by themselves.

Finding: CF360-DOC-001. Evidence: EVID-0019.
