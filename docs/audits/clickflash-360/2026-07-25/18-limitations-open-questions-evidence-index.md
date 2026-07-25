# 18 — Limitations, Open Questions, and Evidence Index

This file is the canonical evidence registry. Evidence is current to commit
`5026faedb5845a6000a86ffc1fbe66e702dc5c38` plus the explicitly recorded
pre-existing dirty state.

## Evidence registry

### EVID-0001 — Git and dirty-state baseline

- **Type/date:** reproducible command, 2026-07-25
- **Command:** `git status --short --branch --untracked-files=normal`;
  `git rev-parse HEAD`; `git branch --show-current`; `git describe --always --dirty`;
  `git diff --stat`
- **Context:** captured before audit artifacts existed.
- **Proves:** commit/branch identity and the summarized pre-existing tracked/untracked state.
- **Does not prove:** authorship, correctness, or safety of those changes; ignored-file state.
- **Links:** all surfaces; no finding assigned yet.

### EVID-0002 — Host and tool baseline

- **Type/date:** reproducible command, 2026-07-25
- **Result:** Windows NT 10.0.26200.0; PowerShell 7.6.3; Git 2.52.0;
  Node 24.13.1; pnpm 10.28.2; npm 11.8.0; Python 3.11.0; CMake 4.3.0.
- **Proves:** audit-host tool versions available at baseline.
- **Does not prove:** compatibility with every surface or clean-environment reproducibility.
- **Links:** SURF-OPS-002.

### EVID-0003 — Governing instructions and root orchestration

- **Type/date:** source/configuration inspection, 2026-07-25
- **Paths:** `AGENTS.md`; `CLAUDE.md`; mobile nested `AGENTS.md`/`CLAUDE.md`;
  `package.json`; `pnpm-workspace.yaml`; `turbo.json`.
- **Proves:** declared repository guardrails, root scripts, workspace globs, and
  Turborepo task relationships.
- **Does not prove:** that every declaration is followed, every script is safe,
  or every workspace member builds/tests/deploys.
- **Links:** SURF-OPS-002, SURF-APP-009..012.

### EVID-0004 — Direct child surface and manifest inventory

- **Type/date:** path/manifest parsing command, 2026-07-25
- **Command:** direct-child enumeration of `apps`, `workers`, `packages`,
  `services`; manifest detection; package-name parsing; tracked-file counts.
- **Result:** 17 app directories, 4 Worker directories, 13 package directories,
  and 2 service directories. Fifteen apps have `package.json`; `ride-node` has
  `pyproject.toml`; `apps/pb_data` has no manifest; `master-cpp` has CMake;
  `services/platform` has no tracked files.
- **Proves:** current direct-child counts, manifest signals, and tracked-file presence.
- **Does not prove:** lifecycle, deploy status, use, correctness, or absence of
  nested/additional runtimes.
- **Links:** all SURF-APP, SURF-WRK, SURF-PKG, and SURF-SVC rows.

### EVID-0005 — Tracked secret-shaped paths

- **Type/date:** safe path-only Git inspection, 2026-07-25
- **Command:** `git ls-files -- '*.pem' '*.key' '*private_key*' '*secret*'`
- **Result:** `payload_private_key.pem` is tracked; additional secret-named
  migrations, tests, archived reports, and provisioning/purge scripts exist.
- **Proves:** tracked path presence only.
- **Does not prove:** file contents, whether key material is real/active, history
  exposure, or rotation state. Contents were not opened.
- **Links:** SURF-OPS-001, SURF-REL-001; candidate CF360-SEC finding pending
  reference/history counterevidence.

## Initial limitations and open questions

- No source runtime, build, lint, typecheck, unit, integration, E2E, packaging,
  signing, deployment, external account, hardware, or production validation has run.
- Ignored/local database, log, media, report, and release-bundle contents are
  treated as potentially sensitive; classification is initially path/reference based.
- Production deployment state, secret rotation, branch protections, cloud bindings,
  Stripe configuration, signing custody, backups/restores, alerts, and SLOs are unknown.
- Pre-existing dirty changes may affect current evidence and are not modified or
  treated as audited source until explicitly inspected as current checkout state.

## Assumption log

| ID | Assumption | Status / validation |
|---|---|---|
| ASM-001 | Repository root is `C:\Users\alamo\Desktop\ClickFlash`. | Verified by execution context and Git commands. |
| ASM-002 | `2026-07-25` output path is collision-free. | Verified: parent did not exist before creation. |
| ASM-003 | Secret-shaped and data/media-bearing content is sensitive until proven synthetic. | Safety assumption retained. |
| ASM-004 | Source presence is not production/deployment evidence. | Audit interpretation rule retained. |

