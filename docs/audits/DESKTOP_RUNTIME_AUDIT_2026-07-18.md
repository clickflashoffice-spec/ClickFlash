# Desktop Runtime Audit

**Date:** 2026-07-18  
**Status:** Active checkpoint; not release-ready  
**Gallery boundary:** Online-only; excluded from every desktop artifact  
**Publishing performed:** No

## Runtime Matrix

| Product | Current shell | Privileged boundary | Packaging decision |
| --- | --- | --- | --- |
| Master OS | Electron 39.8.7, React, forked Node backend/workers | Sandboxed renderer, preload allowlist, local backend, updater, native helpers | Keep Electron; consolidate one TypeScript shell/config |
| Touch Kiosk | Electron 39.8.7, React, local static/backend servers | Sandboxed kiosk renderer, preload allowlist, scanner/printer/updater | Keep Electron; consolidate and preserve kiosk/native parity |
| Studio Installer | Electron 39.8.7 | Strict schemas, top-frame IPC, signed payload verifier, transactional install/repair | Keep canonical Electron installer; preserve existing dirty work |
| License Generator | Electron 39.8.7 | Offline signing and validation | Keep Electron; private signing key now main-process-only |
| MoneyTrash | Tauri 2/Rust | Broad filesystem, HTTP, shell, dialog, and notification capability | Migrate to Electron behind a parity gate, per requested desktop standard |

Gallery, Management, and Website remain web-native. Gallery is not copied into
Website and is not embedded, cached as a local app, or packaged by Electron.

## Findings and Current Disposition

### DR-001: Master could load an unrelated local process as its renderer

Packaged Master accepted any response below HTTP 500 on port 8090 as an existing
backend, then loaded that origin with its preload bridge. Packaged startup now
trusts only the forked child's IPC `server-ready` message. Development can still
attach to an explicitly started backend. Packaged failure no longer proceeds to
the renderer.

### DR-002: Master updater was built but loaded from the wrong path

The updater is emitted at `dist/backend/main/autoUpdater.js`; the main process
looked under `dist/electron/dist/main`. The runtime now resolves the real sibling
bundle. Master and Touch updater IPC also validates the exact top frame, removes
stale handlers before re-registration, registers event listeners once, and
prevents prerelease/downgrade updates.

### DR-003: Touch exposed its renderer-only HTTP server to the LAN

The Touch static renderer server listened on `0.0.0.0`, returned wildcard CORS,
and used incomplete path normalization. It now binds only `127.0.0.1`, omits
wildcard CORS, resolves decoded asset paths inside the renderer root, and rejects
traversal/malformed paths. Navigation filters attach before the first load.

### DR-004: License Generator renderer owned the private signing key

Although the historical embedded key had been removed, the React form still
received and used the operator key. A narrow preload now lets the main process
select a bounded regular key file, retain only decoded key bytes, expose only a
file label plus SHA-256 key identifier, validate strict IPC payloads, sign in the
main process, and zero retained bytes on clear/window close/quit.

The first unpacked proof exposed a second P0: pnpm workspace traversal packaged
`packages/licensing/out/private.pem`, licensing source/tests, and build logs.
Main/preload are now bundled, all ClickFlash workspace packages are excluded
from the artifact, and an `afterPack` gate rejects private-key material, key
files, workspace licensing trees, missing main/preload files, or signing code/key
literals in the renderer. The corrected Windows unpacked package passed the gate.

### DR-005: Master startup licensing is consolidated; backend state is supplemental

The two RSA/PEM and optional `userData/pb_data/license.key` startup checks have
been removed. Master now starts only when Installer's
`~/.clickflash/installer-config.json` decrypts through Electron `safeStorage`,
the Ed25519 signature and protected metadata match, the license is unexpired,
and the signed/stored machine identity matches the current OS UUID. The only
bypass is explicit and development-only. Focused valid, wrong-machine,
metadata-tamper, and decrypt-failure tests pass.

The backend now reuses the same strict verifier and OS UUID function, rejects
legacy checksums, unbound signatures, and wrong-machine signatures, and never
logs a rejected key. Its database state is supplemental online/grace status,
not an alternate startup authority. Stripe fulfillment now creates a pending
destination without a license; authenticated admin/provisioning issuance
requires the real OS machine ID. Management's full 11-suite/60-test run passes.

### DR-006: Release automation does not produce the files it publishes

The release workflow runs TypeScript-only `build:electron` commands for Master
and Installer, then searches for EXE/DMG artifacts that those commands do not
create. It runs Windows-only scripts on macOS, omits License Generator and
MoneyTrash, and has no signature/checksum gate. It must be replaced after the
canonical package matrix is proven.

### DR-007: No trusted desktop signing/update chain exists

Master and Touch explicitly disable executable signing; Installer and License
Generator can edit/sign metadata but no approved certificate custody or
timestamp evidence exists. The corrected License Generator executable reports
`NotSigned`. No desktop product is releasable until CI fails closed on invalid
Authenticode, update metadata is signed, and rollback artifacts are retained.

### DR-008: Duplicate shells/configs can bypass reviewed code

Resolved for Master and Touch. Their tracked JavaScript main/preload copies,
Master's abandoned `electron-new` tree and v3 scripts/workflow, four alternate
builder YAML files, Touch's second package manifest, and both stale test/build
shells are removed. Each package now compiles exactly one TypeScript main/preload
pair into the path declared by its package manifest. Hotel-specific YAML is a
generated, ignored derivative of the same compiled runtime and mandatory trust
gate; it no longer embeds a default cloud password or generated JWT secret.

### DR-009: MoneyTrash Electron migration is a parity project

MoneyTrash's package version is `2.0.0` while Tauri reports `0.1.0`; signing is
unset and renderer capabilities broadly allow file mutation, HTTP, and shell
open. The Rust command layer contains substantial ingest/resume/checksum/state
logic. Migration is approved as the target, but Tauri removal occurs only after
an Electron main/preload implementation passes the same file, removable-media,
multipart-resume, notification, crash-recovery, and clean-machine contract tests.

### DR-010: CI observes failures without enforcing them

Current lint/typecheck/security audit steps use `continue-on-error`, and License
Generator/Installer test coverage is absent from the test matrix. Enforcement
must follow focused baseline cleanup so CI becomes a real release gate rather
than an advisory dashboard.

### DR-011: Historical license trust root and workspace MCP were unsafe

The repository contained the private key matching the hard-coded public key, so
that trust root is permanently compromised even after deleting the visible
fixture. Master and Installer no longer fall back to it and fail closed unless
`CLICKFLASH_LICENSE_PUBLIC_KEY` contains an approved 32-byte Ed25519 public key.
Tests generate ephemeral keypairs. The shared package now requires strict,
hardware-bound Ed25519 payloads; its unused RSA/PEM implementation and CLI that
wrote `private.pem` are removed. License Generator derives validation trust and
key ID from the operator-selected key instead of a repository constant.

The workspace MCP also exposed a tool that generated a new keypair and returned
the private key. That tool and dependency are removed. Adjacent nonexistent
migration-shell and simulated-deployment tools are removed, app names are
allowlisted, repository file reads are path-contained, and log tailing no longer
invokes a shell. MCP build and unit tests pass, including traversal and
command-shaped app-name rejection.

The release input is now executable rather than conventional: Master and
Installer packaging call `scripts/prepare-license-trust.cjs`, which accepts only
`CLICKFLASH_LICENSE_PUBLIC_KEY` containing a base64 32-byte Ed25519 public key,
writes a public-only generated resource atomically, embeds it as
`resources/license-public-key.txt`, and verifies it during `afterPack`. Missing
or malformed input fails before packaging. No approved rotated key has been
provisioned, so the current source intentionally cannot produce a release
artifact.

## Validation Evidence

- Master Electron TypeScript passed; full backend/updater bundle passed.
- Master protected-license/backend security tests: 16/16. A fresh Windows unpacked build
  passed an independent 31,345-entry ASAR/runtime boundary scan on Electron
  39.8.7 (ABI 140); its executable is `NotSigned` and therefore unreleasable.
- Master renderer/Electron typechecks and canonical Electron build passed; new
  strict IPC contract tests: 7/7.
- Touch renderer/Electron typechecks and canonical Electron build passed; full
  suite: 13 files/105 tests.
- License Generator renderer and Electron typechecks passed; tests: 11/11.
- Installer renderer/Electron/payload typechecks passed; 11 files/60 tests.
- Shared Ed25519-only licensing package build passed; tests: 2/2.
- Management Worker typecheck passed; 11 suites/60 tests.
- Workspace MCP build and unit tests passed.
- License Generator production renderer: 201.22 kB, gzip 63.00 kB.
- Corrected License Generator Windows unpacked build passed the mandatory ASAR
  key-custody gate on Electron 39.8.7; executable remains intentionally unsigned.
- All workflow YAML parses, secret provisioning passes `bash -n`, and repository
  diff whitespace validation passes.

## Next Execution Order

1. Authorize a new Ed25519 trust root, provide its public key through the tested
   release input, and keep signing-key custody offline; then rebuild and scan the
   canonical Master/Installer artifacts.
2. Scaffold the MoneyTrash Electron shell and parity contract tests before
   removing any Tauri implementation.
3. Replace release automation with real signed package commands, hashes, update
   metadata, and fail-closed artifact verification.
4. Configure Authenticode/timestamp custody and signed updater metadata.
5. Run clean Windows install/repair/upgrade/rollback/uninstall evidence.
