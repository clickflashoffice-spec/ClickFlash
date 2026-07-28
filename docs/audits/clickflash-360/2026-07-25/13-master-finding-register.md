# Master Finding Register

This is the canonical deduplicated register. Other artifacts reference these IDs rather than creating new findings. Severity reflects credible impact plus preconditions; confidence reflects source evidence. “Open” means no remediation was performed in this audit.

## Summary

| ID | Severity | Confidence | Status | Root cause |
|---|---|---|---|---|
| CF360-SEC-001 | Critical | High | Open / release blocker | Cloud API lacks deny-by-default route authorization and object scoping |
| CF360-SEC-002 | Critical | High for tracking; Unknown for key validity | Open / incident blocker | Private-key-shaped PEM is tracked and has history |
| CF360-PRIV-001 | High; escalate to Critical if sensitive | High for tracking; Unknown for content | Open | SQLite WAL is tracked and has history |
| CF360-OPS-001 | High | High | Open / release blocker | CI definition is invalid and key quality/security checks are non-blocking |
| CF360-OPS-002 | High | High | Open / release blocker | Release jobs, artifact expectations, signing, and rollback evidence disagree |
| CF360-FUNC-001 | High | High | Open | MoneyTrash UI and native streaming contract are disconnected |
| CF360-DATA-001 | High | High for duplication; Medium for runtime impact | Open | No single schema/migration authority |
| CF360-FUNC-002 | High | High | Open / production prohibition | Ride Node treats a delay as upload success and deletes the local capture |
| CF360-ARCH-001 | High | High | Open | Several backend authorities duplicate policy and data ownership |
| CF360-TEST-001 | High | High | Open | Critical deployables and journeys lack enforced tests |
| CF360-OPS-003 | High if deployed; otherwise Medium | High | Open | Update Server is placeholder/orphaned but remains deployable |
| CF360-SEC-003 | High | Medium-High | Open | CORS/session/IPC controls are inconsistent and not centrally verified |
| CF360-ARCH-002 | Medium | High | Open | Orphan packages and committed generated outputs obscure maintained scope |
| CF360-UX-001 | Medium | High for evidence gap; Unknown for violations | Open | No complete-process accessibility assurance |
| CF360-PERF-001 | Medium | Medium | Open | High-risk photo paths and large modules lack budgets/measurements |
| CF360-DOC-001 | High | High | Open | Documentation collapses planned, implemented, validated, and production-ready states |

---

<a id="cf360-sec-001"></a>

## CF360-SEC-001 — Cloud API authorization and object-scope failure

- **Severity / confidence / status:** Critical / High / Open, immediate production and release blocker.
- **Scope:** `apps/cloud-backend/src/index.ts`; `apps/cloud-backend/src/routes/gallery.ts`; deployed Cloud Backend route family.
- **Evidence:** EVID-0010; ACT-CLOUD-001 through ACT-CLOUD-003. Selected handlers use `JWT_SECRET || 'fallback-secret'`; download URL checks only the Bearer prefix; file lookup is not bound to the token event; raw export/job/manifest and multiple sensitive mutation routes have no visible authorization guard.
- **Impact:** An unauthenticated or merely authenticated caller could access/export other customers’ photos/RAW paths or perform sensitive configuration, franchise, payroll, theme, or biometric-adjacent actions. Exact deployed exposure is Unknown.
- **Exploit preconditions:** Affected revision/routes must be deployed and reachable; photo/event identifiers may need to be guessed or learned. Fallback-token forgery additionally requires the runtime secret to be absent.
- **Counterevidence/mitigations:** Some gallery routes verify JWTs; Cloudflare edge controls may exist outside the repository. No source evidence proves a complete edge policy or object-level enforcement.
- **Immediate containment:** Edge-block affected routes; make RAW objects private; confirm/rotate `JWT_SECRET`; invalidate affected tokens; inspect access/audit logs; preserve incident evidence.
- **Long-term remediation:** Central deny-by-default authentication middleware; explicit role/action policy; immutable tenant/event principal; scoped queries using both object ID and authorized scope; field-level policy; expiring object URLs; redacted audit logs.
- **Acceptance criteria:** Generated route-policy inventory shows every non-public route guarded; no fallback secret; all object queries include principal scope; isolated DAST cannot cross event/tenant/role; access-log review shows no unexplained exposure.
- **Tests:** Missing/malformed/expired token, wrong role, wrong tenant/event/photo, ID enumeration, mass assignment, raw export, CORS, rate-limit and replay cases.
- **Owner:** Cloud Backend owner plus Security/Privacy lead; independent verifier required.
- **Standards mapping:** OWASP API Security 2023 API1 Broken Object Level Authorization, API2 Broken Authentication, API5 Broken Function Level Authorization, API8 Security Misconfiguration; OWASP ASVS 5 authentication, session, access-control, data-protection and API areas.

<a id="cf360-sec-002"></a>

## CF360-SEC-002 — Tracked private-key-shaped PEM

- **Severity / confidence / status:** Critical / High that path/history exist; Unknown whether usable / Open incident blocker.
- **Scope:** `payload_private_key.pem` and repository history (path/metadata only).
- **Evidence:** EVID-0005. `git ls-files` and path-only history identify the file and earlier commit `a9a66b12`; contents were deliberately not opened or printed.
- **Impact:** If real or ever trusted, repository readers/history consumers could sign licenses, payloads, updates, or impersonate a trusted publisher.
- **Exploit preconditions:** The file contains real private material and the corresponding public trust remains active or historical artifacts accept it.
- **Counterevidence/mitigations:** It may be synthetic/revoked; no content or current trust-store validation was performed.
- **Immediate containment:** Restrict repository/artifact access; use an approved responder to fingerprint/classify without disclosure; revoke/rotate every potentially corresponding trust anchor; pause signing/release.
- **Long-term remediation:** Hardware/managed signing service, non-exportable keys, short-lived CI identity, protected approvals, secret scanning and history purge with collaborator coordination.
- **Acceptance criteria:** Approved incident record establishes classification; affected public keys/trust stores rotated/revoked; clean current tree and rewritten reachable history verified by path/status scans; signed clean-room test succeeds only with new trust.
- **Tests:** Current/history secret scans, trust-store/revocation verification, signature acceptance/rejection tests, CI permission review.
- **Owner:** Security incident commander and Release Engineering.
- **Standards mapping:** OWASP ASVS 5 cryptography, secrets and secure build/deployment areas; supply-chain key-management practice.

<a id="cf360-priv-001"></a>

## CF360-PRIV-001 — Tracked SQLite WAL

- **Severity / confidence / status:** High, escalate to Critical if credentials/customer/biometric/payment data are confirmed / High tracking confidence, content Unknown / Open.
- **Scope:** `apps/touch/pb_data/touch.db-wal` and history.
- **Evidence:** EVID-0005. File is tracked, currently 16,512 bytes, and has prior history; contents were not opened.
- **Impact:** WAL pages can retain deleted or transient database values and create privacy, credential, or corruption risk.
- **Exploit preconditions:** WAL contains sensitive/non-synthetic data and repository/history is accessible.
- **Counterevidence/mitigations:** It may be empty/synthetic; no content classification was authorized.
- **Immediate containment:** Restrict access; have an approved privacy/security responder classify offline; rotate exposed credentials if any; preserve chain of custody.
- **Long-term remediation:** Ignore all runtime DB/WAL/SHM files; synthetic fixtures only; purge history after incident approval; add pre-commit/CI binary-data policies and retention controls.
- **Acceptance criteria:** Data-classification record; required notices/rotation completed; no runtime DB artifacts in reachable history; synthetic bootstrap reproduces Touch without the WAL.
- **Tests:** Path/history scans, fixture bootstrap, privacy deletion/retention test.
- **Owner:** Touch owner, Privacy, and Security incident response.
- **Standards mapping:** OWASP ASVS 5 data protection; privacy minimization, retention, disposal, and incident response principles.

<a id="cf360-ops-001"></a>

## CF360-OPS-001 — CI is invalid and fail-open

- **Severity / confidence / status:** High / High / Open release blocker.
- **Scope:** `.github/workflows/ci.yml`, `pr.yml`, quarterly scans, root aggregate scripts.
- **Evidence:** EVID-0009, EVID-0012. Unique-key parsing fails on duplicate `on`, `concurrency`, `env`, `jobs`, and `with`; critical audit and several PR checks are `continue-on-error`; TruffleHog uses mutable `@main`; aggregate filters omit surfaces.
- **Impact:** Changes can merge/deploy without trustworthy lint, type, security, coverage, or surface-completeness evidence.
- **Exploit/failure preconditions:** Workflow is used as a required gate or engineers rely on its displayed status.
- **Counterevidence/mitigations:** Ten other workflow files parse; local checks can still be run manually.
- **Immediate containment:** Disable automated deploy/release from unverified commits; require manual evidence for every deployable.
- **Long-term remediation:** One valid CI graph generated from manifest inventory; pinned action SHAs; blocking lint/type/test/coverage/audit/secret scan; required branch checks; clean-checkout reproducibility.
- **Acceptance criteria:** All workflow YAML parses uniquely; every deployable maps to required blocking jobs; deliberate failing fixture blocks merge; branch protection verifies exact checks.
- **Tests:** YAML lint, action pin policy, matrix coverage test, fail-closed canary changes, clean checkout.
- **Owner:** Platform/CI and repository maintainers.
- **Standards mapping:** OWASP ASVS 5 secure development/build; SLSA-style provenance and reproducible build controls.

<a id="cf360-ops-002"></a>

## CF360-OPS-002 — Release pipeline and artifact trust are broken

- **Severity / confidence / status:** High / High / Open release blocker.
- **Scope:** `.github/workflows/release.yml`, desktop manifests/scripts, local release artifacts.
- **Evidence:** EVID-0009 and EVID-0013. Master/Installer jobs do not package what upload steps expect; Touch uses Windows packaging on macOS; web/mobile filters mismatch package names; local executables are `NotSigned`.
- **Impact:** Releases can fail, omit products, upload stale/wrong files, or distribute untrusted executables without safe rollback.
- **Failure preconditions:** Tag/release workflow is invoked or local artifacts are distributed.
- **Counterevidence/mitigations:** Packaging/signing scripts and hardened Electron settings exist; no successful clean release evidence was found in this audit.
- **Immediate containment:** Pause publication/installation; quarantine unsigned artifacts; require manual artifact-hash and signature verification.
- **Long-term remediation:** Explicit per-platform package jobs; immutable artifact handoff; SBOM/provenance; managed code signing/notarization; install/start/update/downgrade tests; staged rollout and rollback.
- **Acceptance criteria:** Clean tagged build emits declared artifacts; hashes flow unchanged to release; OS signature verification succeeds; package smoke and rollback pass on supported matrix; stale files cannot be uploaded.
- **Tests:** Clean-room build, missing-artifact negative test, signature/notarization, installer privilege, update tamper and rollback.
- **Owner:** Release Engineering and desktop owners.
- **Standards mapping:** Electron Security Checklist current-version/fuses/update trust; OWASP ASVS secure build/deployment; supply-chain provenance practice.

<a id="cf360-func-001"></a>

## CF360-FUNC-001 — MoneyTrash upload entry and cancellation are disconnected

- **Severity / confidence / status:** High / High / Open.
- **Scope:** `apps/moneytrash/src/App.tsx`, `src/services/tauriService.ts`, `desktopBatchUploadService.ts`, bridge/test code.
- **Evidence:** EVID-0008. Visible picker calls `read_file`, which deliberately throws; drag/drop does not establish required native paths; native cancellation exists but no active-upload cancel control was found. Focused service tests pass.
- **Impact:** Primary upload workflows fail or cannot be safely cancelled, undermining the product’s core purpose.
- **Failure preconditions:** Current UI is used in native mode (the default observed).
- **Counterevidence/mitigations:** Electron streaming/cancellation implementation and compile/test evidence exist; the defect is the integration seam, not absence of all backend capability.
- **Immediate containment:** Mark feature unavailable; prevent users from trusting unsuccessful uploads; retain originals.
- **Long-term remediation:** Route selection/drop through one typed native descriptor and streaming session; expose cancel/resume; persist queue/checksums; remove obsolete Tauri whole-file path or correctly isolate legacy mode.
- **Acceptance criteria:** Packaged app selects files/folders and drops files; streams multi-GB batch with bounded memory; cancel/resume/restart work; success requires verified remote acknowledgement.
- **Tests:** File/folder/drop, Unicode/long paths, large batches, disconnect, retry, cancellation, crash recovery, duplicate/checksum, Windows packaged app.
- **Owner:** MoneyTrash desktop owner.
- **Standards mapping:** Electron privileged-boundary guidance; reliability/data-integrity and accessible status/cancellation principles.

<a id="cf360-data-001"></a>

## CF360-DATA-001 — Competing schema and migration authorities

- **Severity / confidence / status:** High / High for duplication, Medium for exact production impact / Open.
- **Scope:** All SQL/migration families in `packages/database`, apps, Workers, Master C++, and archive docs.
- **Evidence:** EVID-0015. Approximately 843 migration/schema-related files; 110 byte-identical SQL groups; multiple active runners; `packages/database` has 240 SQL files but no discovered consumer.
- **Impact:** Clean install, upgrade, rollback, backup restore, and mixed-version clients can diverge or corrupt/lose data.
- **Failure preconditions:** Different runners target the same logical store or deploy out of order; exact production binding remains Unknown.
- **Counterevidence/mitigations:** Some families may intentionally target distinct databases; duplication alone does not prove live conflict.
- **Immediate containment:** Freeze destructive/remote schema changes; inventory deployed database IDs and migration ledgers; take verified backups.
- **Long-term remediation:** One named authority per datastore; immutable ordered migrations; compatibility policy; generated schema/contracts; transactional forward/restore strategy; archive non-runtime copies.
- **Acceptance criteria:** Every datastore maps to one owner/ledger; clean install and N-1 upgrade converge to identical schema; restore and failed-migration rehearsal pass; no unowned active SQL.
- **Tests:** Schema diff, migration idempotency, concurrent client compatibility, rollback/restore with synthetic data.
- **Owner:** Data platform owner plus each Worker/app owner.
- **Standards mapping:** OWASP ASVS data protection/integrity; operational change and backup controls.

<a id="cf360-func-002"></a>

## CF360-FUNC-002 — Ride Node deletes after simulated upload

- **Severity / confidence / status:** High / High / Open; prohibit production/customer data.
- **Scope:** `apps/ride-node`, especially upload worker.
- **Evidence:** EVID-0016. Worker sleeps, logs upload success, then deletes the local capture; no remote durable acknowledgement exists.
- **Impact:** Irrecoverable loss of customer photos and false operational reporting.
- **Failure preconditions:** Ride Node is run on non-synthetic captures with cleanup enabled.
- **Counterevidence/mitigations:** Surface is version `0.1` and appears experimental; production deployment was not proven.
- **Immediate containment:** Label simulator; disable deletion; keep it out of deploy/start documentation and production networks.
- **Long-term remediation:** Durable spool, content hash, idempotent remote API, explicit verified acknowledgement, retry/backoff/dead-letter, disk-pressure policy, observability.
- **Acceptance criteria:** Fault-injected tests prove the sole local copy survives every failure; deletion occurs only after server-side hash/object verification and durable ledger commit.
- **Tests:** Offline, timeout, partial upload, duplicate, remote 5xx, crash/restart, disk full, corrupt file, acknowledgement replay.
- **Owner:** Ride/edge capture owner.
- **Standards mapping:** Data integrity, resilience, logging truthfulness, safe failure.

<a id="cf360-arch-001"></a>

## CF360-ARCH-001 — Fragmented backend policy and ownership

- **Severity / confidence / status:** High / High / Open.
- **Scope:** Cloud Backend and Gallery, Management, MoneyTrash, Update Workers plus direct clients.
- **Evidence:** EVID-0004, EVID-0010, EVID-0015. Several route, CORS, auth and schema implementations overlap without one contract/policy authority.
- **Impact:** Authorization, validation, error behavior, CORS, schema evolution, observability and incident response drift independently.
- **Failure preconditions:** Multiple services remain active for related tenants/photos/orders/configuration.
- **Counterevidence/mitigations:** Product-specific Workers can be valid bounded contexts; the problem is undocumented boundaries and duplicated cross-cutting controls.
- **Immediate containment:** Publish ownership, route/domain/data matrix; stop adding duplicate endpoints.
- **Long-term remediation:** Define bounded contexts; one identity/policy enforcement layer; versioned contracts; one schema owner per store; shared telemetry/error standards.
- **Acceptance criteria:** Every endpoint/data object has one owner and policy; no overlapping mutation authority; contract tests enforce client compatibility.
- **Tests:** API schema diff, policy matrix, consumer contract and cross-service trace tests.
- **Owner:** Architecture council and backend leads.
- **Standards mapping:** Zero-trust least privilege; OWASP ASVS architecture/access-control areas.

<a id="cf360-test-001"></a>

## CF360-TEST-001 — Critical paths lack enforced verification

- **Severity / confidence / status:** High / High / Open.
- **Scope:** Cloud Backend, mobile apps, Ride Node, Master C++, Update Server, cross-product journeys and CI.
- **Evidence:** EVID-0014. No test files found in those deployables; Photographer test exits success; coverage thresholds often not invoked; critical Cloud auth has no negative suite.
- **Impact:** Security, data loss, accessibility, upgrade and hardware regressions can ship undetected.
- **Failure preconditions:** Surfaces are released/deployed or relied on.
- **Counterevidence/mitigations:** Approximately 382 test-like files exist overall, with strong Master coverage; one MoneyTrash focused suite passed.
- **Immediate containment:** Remove untested surfaces from release matrices; require manual critical-journey evidence.
- **Long-term remediation:** Risk-based unit/contract/integration/E2E/fault/accessibility/release suites tied to generated surface/route inventory.
- **Acceptance criteria:** Every deployable has blocking tests and named critical journeys; deliberate defects fail CI; skips/no-op tests are budgeted and owned.
- **Tests:** Strategy in `10-quality-reliability-test-matrix.md`.
- **Owner:** Quality Engineering with surface owners.
- **Standards mapping:** OWASP ASVS verification practice; WCAG complete-process conformance testing.

<a id="cf360-ops-003"></a>

## CF360-OPS-003 — Placeholder orphan Update Server is deployable

- **Severity / confidence / status:** High if deployed/consumed, otherwise Medium / High / Open.
- **Scope:** `workers/update-server`, deployment workflow, Electron updater configuration.
- **Evidence:** EVID-0017. Placeholder signature and URL values, wildcard CORS, deployment matrix entry, no discovered source consumer; Electron clients use GitHub update config.
- **Impact:** Operators may deploy a false update authority, expose misleading metadata, or split the release trust chain.
- **Failure preconditions:** Worker is deployed, routed, or adopted by a client.
- **Counterevidence/mitigations:** No consumer was found, reducing current exploit likelihood.
- **Immediate containment:** Remove from deployment matrix or block public route; document GitHub as canonical current channel.
- **Long-term remediation:** Either delete/archive it or implement signed metadata, private artifact policy, client pinning, staged rollout, telemetry and rollback.
- **Acceptance criteria:** Exactly one documented update authority; no placeholders; client integration and tamper/rollback tests pass; unused service cannot deploy.
- **Tests:** Consumer search, metadata signature, expired/replay/tamper, wrong-channel and rollback tests.
- **Owner:** Release Engineering.
- **Standards mapping:** Electron update/security guidance; software supply-chain provenance.

<a id="cf360-sec-003"></a>

## CF360-SEC-003 — Inconsistent CORS, session, and IPC boundary controls

- **Severity / confidence / status:** High / Medium-High / Open.
- **Scope:** Worker CORS handlers, browser token storage patterns, Electron IPC handlers.
- **Evidence:** EVID-0010 and EVID-0011. Wildcard or reflected origins appear in several Workers; browser `localStorage` token patterns exist; comprehensive IPC sender validation was not established.
- **Impact:** Cross-origin abuse, token theft after XSS, or privileged native invocation can magnify another vulnerability.
- **Exploit preconditions:** Credentials/CORS combination, XSS/untrusted content, or compromised renderer is required depending vector.
- **Counterevidence/mitigations:** Electron renderer defaults are hardened; not every wildcard response permits credentialed access; source scan did not prove an exploit for every surface.
- **Immediate containment:** Restrict origins/methods/headers per environment; review credential flags; shorten/rotate browser sessions; block remote/untrusted renderer content.
- **Long-term remediation:** Central CORS policy, secure HttpOnly session design where appropriate, CSP, IPC allowlist with sender/schema validation, navigation/window restrictions.
- **Acceptance criteria:** Automated origin matrix rejects untrusted sites; no long-lived sensitive token in script-readable storage without approved threat model; every privileged IPC validates sender and input.
- **Tests:** CORS preflight/credential tests, XSS/session theft exercise, IPC sender spoof/schema fuzz, navigation/openExternal cases.
- **Owner:** Security platform and surface owners.
- **Standards mapping:** OWASP API8; OWASP ASVS session/browser/API controls; Electron checklist items 5, 7, 13-15, 17, 20.

<a id="cf360-arch-002"></a>

## CF360-ARCH-002 — Orphan packages and generated output obscure scope

- **Severity / confidence / status:** Medium / High / Open.
- **Scope:** packages `api`, `database`, `errors`, `test-utils`, `utils`; `packages/ui/storybook-static`; `packages/validation/coverage`; empty `services/platform`.
- **Evidence:** EVID-0006 and EVID-0018. No manifest/source consumers found for five packages; 62 Storybook-static and 17 coverage files are tracked; `services/platform` is empty/untracked.
- **Impact:** Stale code/artifacts can be mistaken for authoritative implementation or evidence, increase scan/review cost, and hide ownership gaps.
- **Failure preconditions:** Teams consume or rely on stale outputs/docs.
- **Counterevidence/mitigations:** External consumers outside the monorepo may exist; generated artifacts may be intentionally published.
- **Immediate containment:** Label owner/lifecycle and exclude stale output from readiness claims.
- **Long-term remediation:** Prove external consumers or archive packages; generate reports in CI artifacts; publish supported package catalog.
- **Acceptance criteria:** Every package has owner, consumer, versioning/support status; generated output policy is enforced; empty placeholders removed or chartered.
- **Tests:** Dependency graph, publish/consumer contract, generated-cleanliness check.
- **Owner:** Monorepo maintainers.
- **Standards mapping:** Maintainability and supply-chain inventory practice.

<a id="cf360-ux-001"></a>

## CF360-UX-001 — Accessibility is not verified across complete processes

- **Severity / confidence / status:** Medium / High for verification gap, Unknown for exact violations / Open.
- **Scope:** All web, desktop renderer, kiosk and mobile UIs.
- **Evidence:** EVID-0007 and EVID-0018; approximately 4,026 interactive occurrences; no full keyboard/AT/zoom/contrast/device evidence.
- **Impact:** Customers/staff with disabilities may be unable to authenticate, find photos, buy/download, operate kiosks, upload, install, or recover from errors.
- **Failure preconditions:** Specific control/state fails assistive use; exact prevalence requires runtime testing.
- **Counterevidence/mitigations:** Native elements, labels and component patterns are present in samples; absence of evidence is not proof of universal nonconformance.
- **Immediate containment:** Avoid conformance claims; provide assisted/alternative path for critical customer operations.
- **Long-term remediation:** Shared accessible primitives, complete-process test plan, AT/device matrix, design tokens and regression gates.
- **Acceptance criteria:** WCAG 2.2 A/AA complete-page/process evidence for critical journeys, with automated and manual results and no unresolved blockers.
- **Tests:** Keyboard, screen reader, 200/400% zoom, reflow, contrast, reduced motion, touch targets, error/status, accessible authentication.
- **Owner:** Design Systems/Accessibility lead and product owners.
- **Standards mapping:** WCAG 2.2 A/AA, especially 1.1.1, 1.3.1, 1.4.x, 2.1.1, 2.4.x, 2.5.7/8, 3.3.x, 4.1.2/3.

<a id="cf360-perf-001"></a>

## CF360-PERF-001 — No measured performance envelope

- **Severity / confidence / status:** Medium / Medium / Open.
- **Scope:** Photo ingestion, grids/previews, upload/export, Workers/D1/R2, desktop startup and large modules.
- **Evidence:** EVID-0018. Several 1,000-2,800-line critical modules and image-heavy paths; no benchmark results.
- **Impact:** UI stalls, memory exhaustion, slow kiosks, costly Worker/storage operations and unreliable large-batch uploads may emerge at real workload.
- **Failure preconditions:** Representative catalog/file sizes, devices or concurrency exceed unmeasured capacity.
- **Counterevidence/mitigations:** Streaming/caching/thumbnail patterns exist in parts; static size does not prove runtime slowness.
- **Immediate containment:** Define supported workload limits; retain originals; monitor before scale.
- **Long-term remediation:** Budgets, representative datasets, profiling/tracing, bounded streaming/concurrency, query/cache tuning, modularization guided by measurements.
- **Acceptance criteria:** Budgets in `11-performance-operations-release-readiness.md` pass at p50/p95/p99 with memory/CPU/network/storage evidence.
- **Tests:** Load/soak, large RAW batch, slow network, low disk/memory, catalog scale, queue backlog and cost profile.
- **Owner:** Performance/Observability plus surface owners.
- **Standards mapping:** Operational resilience and capacity-management practice.

<a id="cf360-doc-001"></a>

## CF360-DOC-001 — Readiness documentation is materially inaccurate

- **Severity / confidence / status:** High / High / Open.
- **Scope:** Root README, task ledger, release/security checklists, architecture/deployment docs.
- **Evidence:** EVID-0019 and DRIFT-001 through DRIFT-014. “6/6 Complete (100%)” conflicts with the actual surface inventory and open critical/high conditions.
- **Impact:** Leaders/operators may approve release, close incidents, or omit surfaces based on false assurance.
- **Failure preconditions:** Documentation is treated as current operational truth.
- **Counterevidence/mitigations:** Many documents contain useful plans and prior evidence; drift does not make all content false.
- **Immediate containment:** Add No-Go/superseded banners and link this audit; require source/command evidence for decisions.
- **Long-term remediation:** Generate inventories, distinguish lifecycle states, attach commit/time/evidence/owner to every readiness claim, expire stale reports.
- **Acceptance criteria:** Docs match manifest/deployment/route inventories; no unsupported completion language; CI drift check fails on mismatch.
- **Tests:** Documentation assertion lint, generated inventory diff, periodic owner attestation.
- **Owner:** Engineering leadership, release manager, documentation owners.
- **Standards mapping:** Auditability, configuration management, secure lifecycle governance.
