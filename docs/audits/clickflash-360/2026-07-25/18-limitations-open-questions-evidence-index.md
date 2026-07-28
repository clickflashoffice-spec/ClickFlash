# Limitations, Open Questions, and Evidence Index

This is the canonical evidence registry. Audit work began at commit `5026faedb5845a6000a86ffc1fbe66e702dc5c38`. During the audit, a concurrent user commit changed the repository to `00db089af53648c6693ab8b44feddeaa96d9a259` (`Standardize app scripts on pnpm`). Conclusions and final inventory were rebaselined to `00db089a`; the audit did not create that commit. Audit Markdown changes remain uncommitted.

## Evidence registry

### EVID-0001 — Git, branch, and concurrent-change baseline

- **Type/date:** Reproducible Git metadata commands, 2026-07-25.
- **Command/context:** `git status --short --branch --untracked-files=normal`; `git rev-parse HEAD`; `git branch --show-current`; `git describe --always --dirty`; `git diff --stat`; later `git log -1 --format=fuller`.
- **Result:** Start `5026faed...`, branch `main`, dirty worktree with 18 tracked batch-file edits plus untracked items. Concurrent commit `00db089a...` appeared during the audit and absorbed those pre-existing changes plus early audit skeletons.
- **Proves:** Revision transitions and observable worktree state.
- **Does not prove:** Authorship of individual pre-existing edits, correctness, production deployment, or ignored-file contents.
- **Links:** Audit identity, all surfaces, CMD-005/CMD-013.

### EVID-0002 — Host and tool baseline

- **Type/date:** Version commands, 2026-07-25.
- **Result:** Windows NT 10.0.26200.0; PowerShell 7.6.3; Git 2.52.0; Node 24.13.1; pnpm 10.28.2; npm 11.8.0; Python 3.11.0; CMake 4.3.0.
- **Proves:** Tools available on the audit host.
- **Does not prove:** Clean-environment reproducibility or compatibility with every package.
- **Links:** OPS-SURFACE, CMD-005.

### EVID-0003 — Governing instructions and root orchestration

- **Type/date:** Source/config inspection, 2026-07-25.
- **Paths:** `AGENTS.md`; `CLAUDE.md`; nested mobile instruction files; `package.json`; `pnpm-workspace.yaml`; `turbo.json`.
- **Proves:** Repository guardrails, aggregate scripts, workspace inclusion/exclusion and task graph declarations.
- **Does not prove:** That declarations are current or every package is covered by aggregates.
- **Links:** CF360-OPS-001, CF360-DOC-001.

### EVID-0004 — Direct surface and deployable inventory

- **Type/date:** Path/manifest parsing, 2026-07-25.
- **Command/context:** Direct-child enumeration under `apps`, `workers`, `packages`, `services`; manifest/name/version/script parsing; tracked-file counts.
- **Result:** 17 app directories, 4 Worker directories, 13 package directories and 2 service directories; 36 direct units. Fifteen apps have `package.json`; Ride Node has `pyproject.toml`; Master C++ has CMake; `apps/pb_data` has no manifest; `services/platform` has no tracked files.
- **Proves:** Current repository unit counts and manifest signals.
- **Does not prove:** Deployment, ownership, runtime correctness, or absence of nested runtimes.
- **Links:** inventory artifacts, CF360-ARCH-001, CF360-DOC-001.

### EVID-0005 — Sensitive-path metadata only

- **Type/date:** Safe path/status/size/history metadata, 2026-07-25.
- **Command/context:** `git ls-files -- '*.pem' '*.key' '*private_key*' '*secret*'`; path-only `git log -- <path>`; `Get-Item` length for WAL; no content commands.
- **Result:** `payload_private_key.pem` is tracked and appears in path history including `a9a66b12`. `apps/touch/pb_data/touch.db-wal` is tracked, 16,512 bytes at inspection, with prior path history.
- **Proves:** Tracked path, metadata and reachable path-history facts.
- **Does not prove:** Contents, validity, sensitivity, compromise, rotation/revocation or notification requirements.
- **Links:** CF360-SEC-002, CF360-PRIV-001.

### EVID-0006 — Manifest, dependency, and package-consumer inventory

- **Type/date:** JSON parsing and source-reference search, 2026-07-25.
- **Paths/context:** All package manifests, `pnpm-lock.yaml`, workspace config; exact package-name searches excluding caches/generated output.
- **Result:** Six `package-lock.json` files coexist with the pnpm root; packages `api`, `database`, `errors`, `test-utils`, and `utils` have no discovered manifest/source consumers; `shared` is only consumed by `api`; logger has broad references.
- **Proves:** In-repository declarations and discovered references.
- **Does not prove:** External consumers or runtime dynamic imports not expressed as names.
- **Links:** CF360-ARCH-002.

### EVID-0007 — Routes, screens, controls, and mobile maturity

- **Type/date:** Targeted `rg --files`, route/page pattern search and control-occurrence counts, 2026-07-25.
- **Paths:** Principal React/Next/Expo `src`/`app` trees and route/layout switches.
- **Result:** Route groups listed in `04-route-page-action-matrix.md`; approximately 4,026 interactive-control occurrences across seven largest UIs. Mobile Client contains Expo starter content; Photographer has starter residue; no mobile tests or EAS configuration were found.
- **Proves:** Static route/screen/control presence and maturity signals.
- **Does not prove:** Runtime reachability, visual correctness, accessibility, complete unique-control count or production publication.
- **Links:** CF360-TEST-001, CF360-UX-001, ROUTE-*.

### EVID-0008 — MoneyTrash critical upload trace

- **Type/date:** Source trace plus one focused test, 2026-07-25.
- **Paths/lines:** `apps/moneytrash/src/App.tsx:217-338` (selection flow; `read_file` calls at 244 and 313); `src/services/tauriService.ts:115-122`; `src/services/desktopBatchUploadService.ts:197-240`; desktop service test.
- **Result:** UI calls a deliberately rejected whole-file operation; native uploader requires `nativePath`; cancellation exists in service bridge. Focused test file passed 7/7.
- **Proves:** The contract mismatch and deliberate rejection; focused service behavior.
- **Does not prove:** Packaged runtime failure on every platform or absence of another hidden entrypoint.
- **Links:** CF360-FUNC-001, ACT-MON-001..003, VAL-002.

### EVID-0009 — CI, deploy, and release definitions

- **Type/date:** Workflow source inspection and unique-key parse, 2026-07-25.
- **Paths/lines:** `.github/workflows/ci.yml`; `pr.yml:126,131,270`; `release.yml:53-63,117,149`; `deploy.yml:41-44`; `cd.yml`; quarterly workflow.
- **Result:** 10 of 11 workflows parse; `ci.yml` fails duplicate-key parsing. Required-looking checks are non-blocking; release jobs/filters/platforms disagree with manifests and artifact expectations.
- **Proves:** Repository workflow definition defects.
- **Does not prove:** GitHub branch protection, historical run status, current production deployment, or external pipeline controls.
- **Links:** CF360-OPS-001, CF360-OPS-002, CF360-OPS-003, VAL-001.

### EVID-0010 — Cloud and Worker route/security trace

- **Type/date:** Static route and handler inspection, 2026-07-25.
- **Paths/lines:** `apps/cloud-backend/src/index.ts:25-35`; `src/routes/gallery.ts:18,71,93,133-183,192-287`; `src/routes/settings.ts:26-35,101-112,220-229`; `src/routes/photographers.ts:66-102`; Worker CORS handlers.
- **Result:** Fallback JWT secret; token/object-scope failures; unauthenticated-looking RAW export/job/manifest and sensitive settings/config/payroll/face-vector handlers; 46 route registrations counted under Cloud Backend routes.
- **Proves:** Missing controls in inspected source and precise action chains.
- **Does not prove:** Exact deployed revision, edge policy, actual exploit, data exposure, or production log history.
- **Links:** CF360-SEC-001, CF360-ARCH-001, CF360-SEC-003, ACT-CLOUD-001..003.

### EVID-0011 — Electron/native security configuration

- **Type/date:** BrowserWindow/webPreferences, preload/IPC, updater and CSP pattern search, 2026-07-25.
- **Result:** Sampled Electron windows consistently disable Node integration and enable context isolation/sandbox; no sampled unsafe webPreference flag contradicted this. Comprehensive privileged IPC sender validation was not established.
- **Proves:** Positive renderer configuration baseline and presence of privileged boundaries.
- **Does not prove:** Every runtime window, navigation, permission, preload exposure or IPC handler is safe.
- **Links:** CF360-SEC-003, CF360-FUNC-001, CF360-OPS-002.

### EVID-0012 — Focused type/test validation batch

- **Type/date:** Reviewed, credential-free package commands with before/after status, 2026-07-25.
- **Results:** MoneyTrash typecheck passed; Gallery Worker typecheck passed; Management Worker `build` was inspected as `tsc --noEmit` and passed; MoneyTrash Worker typecheck passed. Cloud Backend no-emit failed on Hono verify arity, missing logger aliases and missing `process`/`Buffer` typing, followed by package command-resolution failure.
- **Proves:** Attempted local compile health for exact scopes and current toolchain.
- **Does not prove:** Clean checkout, build/package/runtime, test coverage, production compatibility or causality of every Cloud error.
- **Links:** CF360-OPS-001, CF360-TEST-001, VAL-003..007.

### EVID-0013 — Local executable signature metadata

- **Type/date:** Read-only Windows Authenticode metadata, 2026-07-25.
- **Command:** `Get-AuthenticodeSignature -LiteralPath <latest inspected executable>` after packaging scripts/config were read.
- **Result:** Latest sampled Master, Touch, Installer and MoneyTrash executables report `NotSigned`.
- **Proves:** Those exact local files lack a valid Authenticode signature.
- **Does not prove:** Official release assets are identical, macOS notarization state, or signing-service availability.
- **Links:** CF360-OPS-002, VAL-008.

### EVID-0014 — Test and coverage inventory

- **Type/date:** Filename/config/script search, 2026-07-25.
- **Result:** About 382 tracked test-like files. Approximate surface counts: Master 179, Touch 23, Website 21, Management 14, Gallery 13, Installer 11, MoneyTrash 8; none found for Cloud Backend, four mobile apps, Ride Node, Master C++, or Update Server. Photographer test script exits success without a test.
- **Proves:** Static test inventory and manifest gate signals.
- **Does not prove:** Executed pass rate, meaningful assertion coverage, flakiness or coverage percentage.
- **Links:** CF360-TEST-001.

### EVID-0015 — Migration/schema inventory and duplicate hashes

- **Type/date:** Path inventory plus SHA-256 equality grouping of non-secret SQL, 2026-07-25.
- **Result:** Approximately 843 migration/schema-related tracked files; major SQL families include package database 240, Master 52 plus adjacent schemas, Touch 17, Cloud 8, Gallery 3, Management 42, MoneyTrash 3, Master C++ 57 and archive 207. 110 identical SQL hash groups, some spanning 11 paths.
- **Proves:** Duplication and multiple candidate authorities.
- **Does not prove:** Same target database, semantic conflict, applied production order or deployed schema.
- **Links:** CF360-DATA-001.

### EVID-0016 — Small/native runtime maturity

- **Type/date:** Manifest/source/entrypoint inspection, 2026-07-25.
- **Paths/lines:** `apps/ride-node/pyproject.toml`; `main.py:65-80`; `src/uploader.py:20-36`; `services/master-cpp/**`.
- **Result:** Ride Node is version 0.1 with simulated upload delay then deletion and no tests/CI/deploy. Master C++ has native/migration code but no discovered tests/CI and unclear production invocation.
- **Proves:** Source behavior and missing repository gates.
- **Does not prove:** Either is deployed or run on customer data.
- **Links:** CF360-FUNC-002, CF360-TEST-001.

### EVID-0017 — Update channel inventory

- **Type/date:** Source/config/consumer search, 2026-07-25.
- **Paths/lines:** `workers/update-server/index.ts:19-90,118`; `.github/workflows/deploy.yml:41-44`; Electron updater publish configuration.
- **Result:** Placeholder/pending and abbreviated signature strings, hard-coded release URLs, wildcard CORS, deploy entry, no source consumer; Electron apps use GitHub updater settings.
- **Proves:** Repository has two inconsistent update-channel concepts and placeholder Worker metadata.
- **Does not prove:** Worker deployment, DNS routing, external consumers or live GitHub release state.
- **Links:** CF360-OPS-003, CF360-OPS-002.

### EVID-0018 — Generated artifacts, UI duplication, and module-size indicators

- **Type/date:** Tracked-file classification and line/control counts, 2026-07-25.
- **Result:** `packages/ui/storybook-static` has 62 tracked files; `packages/validation/coverage` has 17. Duplicate local UI primitive families exist. Largest sampled modules range from about 1,169 to 2,829 lines.
- **Proves:** Maintained-scope ambiguity and static complexity/performance indicators.
- **Does not prove:** Runtime slowness, inaccessible behavior, or that artifacts are unintentionally committed.
- **Links:** CF360-ARCH-002, CF360-UX-001, CF360-PERF-001.

### EVID-0019 — Documentation/readiness claim comparison

- **Type/date:** Documentation treated as secondary evidence, compared to source/config/validation, 2026-07-25.
- **Paths:** Root `README.md` (including “complete 6-app” and “6/6 Complete” claims), `task.md`, audit/remediation/release/security docs, ADR headings.
- **Result:** Fourteen material drift classes recorded in `12-documentation-drift-register.md`.
- **Proves:** Current claims conflict with current repository evidence.
- **Does not prove:** Historical claims were false at their original date or all documentation is unusable.
- **Links:** CF360-DOC-001.

## Limitations

- **Source-read-only boundary:** No remediation, commit, staging, history rewrite, key rotation, migration, seed, deployment, release, upload, payment, production query or destructive action occurred.
- **Runtime boundary:** No broad build, full lint/type/test, packaged-app launch, browser E2E, hardware, camera, printer, mobile-device, payment, accessibility-technology, load, restore or rollback run.
- **External-state boundary:** Cloudflare/GitHub/Stripe/Vercel/Pages account state, deployed revisions, branch protections, domains, bindings, secret values/status, logs, backups, alerts, RPO/RTO, signing custody and store releases are Unknown.
- **Sensitive-data boundary:** PEM, WAL, databases, local media, ignored release bundles and secret values were never opened. Findings rely on path/status/config metadata.
- **Control-completeness boundary:** Static search sampled thousands of controls/routes; exhaustive interactive verification is Partial.
- **Standards boundary:** Official OWASP ASVS 5.0.0, OWASP API Security 2023, WCAG 2.2 and Electron security references were checked on 2026-07-25, but this is a mapping, not a certification or legal opinion.
- **Worktree boundary:** A concurrent user commit changed the checkout mid-audit. Final conclusions were rechecked against `00db089a`; exact authorship of that commit’s individual files is not attributed to the audit.

## Open questions

| ID | Question | Why it matters | Required evidence/owner |
|---|---|---|---|
| OQ-001 | Which exact commits, domains and routes are deployed in each environment? | Determines active exposure | Cloud/Release deployment inventory |
| OQ-002 | Are Cloud Backend routes protected by an external access layer? | Could reduce exposure, but not fix object-scope defect | Cloudflare policy/export plus isolated tests |
| OQ-003 | Is `JWT_SECRET` present, unique and rotated? | Fallback token risk | Status/metadata only from secret manager |
| OQ-004 | Is the PEM real/current, and what trusts it? | Incident severity and rotation scope | Restricted fingerprint/trust inventory |
| OQ-005 | Does the WAL contain real customer/credential/biometric data? | Privacy/legal response | Restricted forensic classification |
| OQ-006 | Are R2 photo/RAW buckets public, and were manifests requested? | Exposure scope | Bucket policy and access-log review |
| OQ-007 | Which migration ledger is applied to each live database? | Data integrity and safe rollback | Database IDs, applied ledger, schema dump metadata |
| OQ-008 | Which desktop artifacts were actually distributed and signed? | Supply-chain exposure | Release asset hashes/signatures/install base |
| OQ-009 | Are any mobile apps or Ride Node in production use? | Raises experimental defects to active incidents | Product/store/device fleet inventory |
| OQ-010 | Which update authority is canonical? | Prevents split/tampered update chain | Approved ADR and client telemetry |
| OQ-011 | What are data retention/deletion/legal-basis rules for photos, face vectors and logs? | Privacy compliance and product behavior | Privacy counsel/product policy |
| OQ-012 | What RPO/RTO/SLOs and restore evidence exist? | Determines operational readiness | SRE runbooks and latest drill artifacts |

## Assumption log

| ID | Assumption | Status |
|---|---|---|
| ASM-001 | Repository root is `C:\Users\alamo\Desktop\ClickFlash`. | Verified |
| ASM-002 | Audit output directory is the requested 2026-07-25 path. | Verified collision-free before creation |
| ASM-003 | Secret-shaped/data-bearing paths are sensitive until approved classification. | Retained safety assumption |
| ASM-004 | Source presence does not equal deployed production state. | Retained interpretation rule |
| ASM-005 | Missing source-level guard is material even if an undocumented edge guard may exist. | Retained; edge policy is counterevidence to collect |
| ASM-006 | “No consumer found” means no in-repository static consumer, not global absence. | Retained |
