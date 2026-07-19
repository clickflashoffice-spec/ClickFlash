# ClickFlash Desktop Application Audit

**Checkpoint:** Stage A baseline, hardening pass, signed-payload verification/release tooling, and Studio Installer release proof  
**Date:** 2026-07-16  
**Latest verification:** 2026-07-18
**Release decision:** Desktop production packaging remains blocked.

This audit covers the executable shells, privileged boundaries, native packaging, installers, and update configuration for Master, Touch, Studio Installer, License Generator, and MoneyTrash. It follows Electron's current security checklist, including sandboxing, restricted navigation, safe external links, and IPC sender validation.

## Supported runtime paths

| Product | Current package entry | Canonical source selected for rebuild | Other implementations retained pending parity proof |
|---|---|---|---|
| Master OS | `dist/electron/electron-main.js` | `apps/master/electron-main.ts` + `preload.ts` | none; alternate JS/electron-new/builder paths removed |
| Touch Kiosk | `dist/electron/main.js` | `apps/touch/main.ts` + `preload.ts` | none; alternate JS/package manifest removed |
| Studio Installer | `dist/electron/electron-main.js` | `apps/installer/electron-main.ts` + `preload.ts` + `electron-security.ts` | none; `electron-builder.yml` is now canonical and the overlapping package-level builder block was removed |
| License Generator | `dist/main.js` | `apps/license-generator/src/main.ts` + `preload.ts` | none; signing key remains main-process-only |
| MoneyTrash | Tauri Rust binary | `apps/moneytrash/src-tauri/src/main.rs` pending migration gate | no Electron implementation approved yet |

Master/Touch legacy implementations are deleted after canonical compile, IPC,
focused contract, and Touch full-suite evidence. Release artifact and clean-VM
parity remain separately blocked by trust/signing inputs.

## Process and native dependency inventory

- **Master:** Electron main, sandboxed renderer, local Node backend, photo/folder workers, encrypted SQLite, Sharp, Canvas, guardian executable, printer/tray paths, power blocker, and updater.
- **Touch:** Electron main, sandboxed kiosk renderer, local Node backend, encrypted SQLite, Sharp, bcrypt, serial/scanner service, Bonjour/mDNS, printer path, global shortcut policy, power blocker, and updater.
- **Studio Installer:** Electron main/renderer, offline license verification, Cloudflare/Hub calls, OAuth deep link, system inspection, mDNS/LAN scan, filesystem configuration, and child-process launch.
- **License Generator:** Electron main and offline React signing/validation renderer. No native signing-key custody boundary exists yet.
- **MoneyTrash:** Tauri main, Rust upload commands, filesystem/dialog/shell/http/notification plugins, resumable uploader, and OS bundler.

## Severity-ranked findings

| ID | Severity | Finding | Status / evidence |
|---|---|---|---|
| DESK-001 | P0 | The License Generator embedded the Ed25519 private signing key in renderer source, making it extractable from every build. | **Contained:** key removed from production source/bundle and must now be operator-supplied. **Still blocked:** the exposed legacy key and matching public trust root must be rotated; test-only fixtures still identify it as compromised. |
| DESK-016 | P0 | The first unpacked Studio Installer proof copied the workspace-linked licensing package wholesale into `app.asar`, including generated `out/private.pem`, source, tests, and build logs. | **Fixed:** Installer no longer has a runtime dependency on the signing-capable workspace package; verification uses a local Node-crypto Ed25519 verifier. Internal packages publish compiled files only, packaging starts from a clean directory, and an `afterPack` raw-byte gate rejects private-key markers and known test artifacts. The corrected ASAR contains no `@clickflash` package or private-key marker. |
| DESK-002 | P1 | All Studio Installer privileged IPC handlers trusted any invoking frame. | **Fixed:** every handler now verifies the exact BrowserWindow and top frame; an untrusted-frame regression test passes. |
| DESK-003 | P1 | Installer navigation and `shell.openExternal` accepted renderer-provided URLs without safe parsing. | **Fixed:** renderer navigation is limited to the exact dev origin or packaged entry file; external opening permits credential-free HTTPS on an explicit ClickFlash/Cloudflare host allowlist only. |
| DESK-004 | P1 | `installer:launchApps` could spawn arbitrary renderer-provided existing paths and used filenames that did not match the packaged products. | **Fixed:** the renderer can send only semantic `master`/`touch` choices. Main owns the canonical `Master/ClickFlash Master OS.exe` and `Touch/ClickFlash - Touch Kiosk.exe` layout, rejects missing/escaped real paths, and launches each process from its verified application directory. |
| DESK-005 | P1 | Installer preload exposed `writeEnvConfig` and `getGeolocation` without main-process handlers, and the install path was never set by the UI. | **Verification/configuration path fixed:** component selection now requires a signed local payload bundle. A separate Ed25519 trust domain verifies a bounded strict manifest, canonical component/root layout, every declared size/SHA-256, exact file inventory, minimum Installer version, and safe Windows-relative paths; verification repeats before configuration and launch. A deterministic offline release tool inventories the bundle, rejects secret-like paths/private-key markers, accepts only an external PKCS#8 Ed25519 key, signs atomically, and self-verifies. **Still blocked:** no production payload public key is approved, so packaged builds fail closed; acquisition/copy, install/upgrade/repair, and rollback of application binaries remain open. |
| DESK-006 | P1 | Installer network IPC accepted renderer-provided `cloudApiUrl`, `masterHost`, and ports, allowing SSRF and possible bearer-token forwarding if the renderer is compromised. | **Fixed for the canonical Installer:** strict Zod objects now validate Hub, Cloudflare, fleet, health, license, URL, and pairing inputs; bearer tokens are removed from JSON bodies; cloud origins use a static HTTPS allowlist; JSON responses are schema-checked, redirect-disabled, time-bounded, and capped at 16 KiB–1 MiB. mDNS names are resolved once, rejected unless every IPv4 result is private, and pinned to the approved address for challenge/exchange requests. LAN sweeps derive private subnets only. |
| DESK-007 | P1 | Master and Touch exposed privileged IPC without validating the sender/top frame. | **Fixed:** canonical handlers require the live BrowserWindow top frame. Generic renderer-controlled invoke/on bridges are removed; named kiosk/dialog/print/updater/scanner capabilities validate bounded payloads in main. Touch admin authentication is main-owned and rate-limited. |
| DESK-008 | P1 | Master, Touch, and Installer do not yet establish a trusted code-signing/update chain. | **Partially fixed for Installer:** executable metadata editing is enabled, the package/runtime version is unified at `5.0.0`, an existing ClickFlash multi-resolution icon is applied, and both the installed app and NSIS wrapper report ClickFlash product metadata. **Still blocked:** both executables are `NotSigned`; approved Authenticode custody, timestamping, signed feeds, and fail-closed production signing remain required. |
| DESK-009 | P1 | Master, Touch, and Installer requested application-data deletion on uninstall. | **Fixed:** all three NSIS configurations now preserve application data by default. Destructive cleanup must become an explicit operator action. |
| DESK-010 | P1 | Duplicate main/preload sources and multiple builder configurations can package behavior different from reviewed source. | **Fixed for Master/Touch:** tracked JS copies, `electron-new`, alternate Master configs/scripts/workflow, Touch's second manifest, and stale test shell are deleted. Hotel YAML is generated/ignored from the canonical compiled runtime and uses the same trust gate. |
| DESK-011 | P1 | MoneyTrash reports package version `2.0.0` but Tauri bundle version `0.1.0`; its renderer capability list broadly permits filesystem mutation, shell open, and HTTP fetch. | **Open:** measure actual command usage, narrow scopes, unify versioning, then decide Tauri hardening versus Electron migration. |
| DESK-012 | P2 | License Generator lacked sandbox, navigation, popup, permission, webview, and CSP restrictions. | **Fixed:** renderer sandbox/web security enabled; navigation is exact; popups/webviews/permissions denied; restrictive CSP added. |
| DESK-013 | P2 | Studio Installer had no document CSP; Master/Touch permission behavior was implicit and Master retains a broad local-backend CSP. | **Partially fixed:** Installer has a restrictive CSP; Master permits only camera/notifications from its exact origin; Touch permits only camera from its active loopback origin and blocks navigation elsewhere. **Open:** tighten Master's broad CSP without breaking required integrations. |
| DESK-014 | P2 | Touch main/updater and Installer logging still use console paths; logs may expose operational metadata and lack retention/redaction guarantees. | **Open:** route through the shared logger with redaction, rotation, bounded retention, and release scans. |
| DESK-015 | P2 | Installer configuration was written under the user profile with a plaintext license key and a POSIX mode that does not establish a Windows ACL. | **Partially fixed:** the complete config is strict-schema validated; the raw license key is removed and encrypted with Electron `safeStorage` before persistence; the bounded JSON file is written through a same-directory, fsynced atomic replace. On Windows, `safeStorage` uses OS-protected cryptography, but same-user metadata access and an explicit ACL/secret-custody policy still require clean-machine review. |

## Toolchain and packaging drift

| Product | Electron | Builder | Packaging concern |
|---|---:|---:|---|
| Master | 39.8.7 | 26.8.1 | one canonical YAML; native unpack/resource closure must be re-proven with rotated trust input |
| Touch | 39.8.7 | 26.8.1 | one canonical JSON; native unpack closure remains to be proven on a current package |
| Studio Installer | 39.8.7 | 26.8.1 | one canonical YAML; ClickFlash `5.0.0` metadata/icon; administrator execution; unsigned |
| License Generator | 39.x | 26.x | versions are ranges rather than one frozen desktop baseline |
| MoneyTrash | Tauri 2 | OS bundler | signing unset; version mismatch; broad capabilities |

## First hardening pass delivered

- Added pure, tested Installer security helpers for exact renderer URLs, allowlisted HTTPS links, approved directories, and executable paths.
- Wrapped every Installer IPC handler with exact BrowserWindow/top-frame authorization.
- Denied Installer webviews and permission requests; removed custom-protocol CSP bypass and service-worker privileges.
- Added Installer CSP, approved cloud-origin checks, private-LAN pairing validation, bounded ports/identifiers, and fail-closed unfinished IPC contracts.
- Added top-frame authorization to every canonical Master/Touch IPC handler and exact-origin permission policies for their required camera/notification flows.
- Removed Master custom-protocol CSP bypass/service-worker privileges and replaced prefix-based file containment with resolved relative-path enforcement.
- Removed the private signing key from License Generator production code and required operator input.
- Hardened License Generator BrowserWindow security and added CSP.
- Removed Installer's runtime dependency on the signing-capable licensing workspace package and replaced it with verification-only Node cryptography.
- Restricted internal package publication to compiled `dist` output, made packaging clean the unpacked directory, and added a fail-closed post-pack secret/test-artifact scan.
- Removed Installer's conflicting package-level builder block and aligned Touch on electron-builder 26.8.1.
- Added strict Installer network IPC schemas, bounded JSON readers, redirect denial, request timeouts, response schemas, static cloud origins, and resolved-address pinning for mDNS pairing.
- Added a renderer first-sync state guard so incomplete destination fields fail before IPC instead of becoming nullable registration payloads.
- Aligned the offline license result, renderer state, and UI with the real Ed25519 payload (`plan`, studio limit, expiry, and machine binding) and rejected mismatched signed data.
- Added strict schemas for saved configuration, environment configuration, and application launch payloads; malformed privileged requests now fail before filesystem or process work.
- Added an operator-visible deployment-root picker and removed renderer control over executable paths and environment-variable names.
- Defined the canonical managed payload layout and exact packaged Master/Touch executable names; missing or realpath-escaped payloads fail closed.
- Added a bounded multi-file configuration transaction with per-file staging/fsync, prior-file backups, all-file rollback, failed-rollback backup preservation, and a non-secret SHA-256 installation manifest.
- Removed the plaintext license key from persisted configuration, encrypted it through Electron `safeStorage`, and added a bounded atomic JSON writer with focused tests.
- Unified Installer package/runtime branding at version `5.0.0`, enabled Windows metadata editing, reused the existing ClickFlash icon, and produced the canonical per-machine NSIS installer.
- Changed Master, Touch, and Studio Installer uninstall defaults to preserve app data.
- Added a payload-signing trust domain separate from license signing. The signed envelope covers exact manifest bytes under `clickflash-payload-manifest/v1`; strict schemas reject traversal, aliases, duplicate case-insensitive paths, wrong executable names, unsupported files, unknown keys, and incompatible Installer versions.
- Replaced generic directory approval with signed-bundle selection and a verified release summary in the wizard. Packaged trust roots are intentionally empty pending an approved production key; development-only public-key injection is disabled in packaged builds.
- Re-verifies the complete payload immediately before transactional configuration and launch, allowing only the Installer-owned `.env` files as post-verification component additions.
- Added deterministic offline payload-release tooling with explicit release metadata/timestamp inputs, stable case-insensitive file ordering, streamed SHA-256/private-key-marker inspection, secret-like filename rejection, external-key containment checks, atomic envelope replacement/recovery, and production-verifier self-checks. The tool derives and reports only the public key and is excluded from the shipped ASAR.
- Tightened runtime verification to reject every undeclared bundle-root entry and a `Touch` directory omitted from the signed manifest.
- Split signed payload source approval from installation destination approval and reject linked/junction roots at both trust boundaries.
- Added same-volume staging with exclusive durable copies, complete stage verification, an atomic destination-root swap, installed-copy verification, and prior-root restoration on commit or post-swap failure.
- Added same-release repair for missing/corrupt declared application files while preserving only authenticated `.env` files and `clickflash-installation.json`; unmanaged destinations, component mismatches, and version-changing upgrades fail closed.

## Verification evidence

- Installer renderer and Electron TypeScript checks passed.
- License Generator renderer and Electron TypeScript checks passed.
- Installer complete suite passed: **59/59** across eleven suites, including license Ed25519 validity/tamper/expiry/schema/machine-binding, separate payload Ed25519 trust, deterministic release signing and CLI execution, external-key custody enforcement, secret/private-material rejection, forged signatures, traversal, undeclared root/component files, tampered files, minimum-version enforcement, transactional fresh install, same-release repair, post-swap binary rollback, unmanaged/version-change refusal, protected persistence, signed-bundle IPC integration, semantic install/config/launch schemas, multi-file configuration rollback/recovery, bounded JSON, redirect denial, private-address pinning, sender authorization, and pairing regressions.
- License Generator focused tests passed: **8/8**.
- Master renderer/Electron typechecks and canonical Electron build passed; strict IPC contract tests passed: **7/7**.
- Touch complete suite passed: **105/105** across 13 files; renderer/Electron typechecks and canonical Electron build passed.
- Installer production renderer and Electron builds passed; renderer bundle is 295.29 kB (90.91 kB gzip).
- License Generator production renderer and Electron builds passed; renderer bundle is 238.21 kB (75.84 kB gzip).
- The compromised private-key value is absent from the License Generator production bundle.
- Clean unpacked and NSIS builds completed through the canonical package commands with electron-builder 26.8.1. The final 4,928-entry ASAR passed an independent private-key/offline-signer marker scan, contains the runtime payload installer/verifier and deliberately empty packaged trust-root module, excludes the offline release signer, and contains no payload private-key marker.
- Final `5.0.0` artifact hashes: NSIS installer SHA-256 `7688E28F137F3A907447D3FA0DB0E2C640CC2E5A627C506CC9C1CA387BB3E2A3`; installed app EXE SHA-256 `828FA62BD391B627CF3FD2FC18135CEDFEEFEA0B33311D7FFFD786F342A1D52B`; `app.asar` SHA-256 `04E98536C9FE54B89EB1195638483AD4CDF773C0C2F7402A294F8E427E0137E5`.
- The 99,537,079-byte NSIS installer and installed app both remain **not releasable**: Authenticode returns `NotSigned`, no production payload public key/signed release bundle exists, version-changing upgrade/reboot recovery/safe uninstall remain unfinished, and no clean-machine lifecycle evidence exists yet.

## Stage B execution order

1. Rotate the compromised license signing key and publish a controlled public-key migration/legacy-license policy.
2. Approve and embed a separately custodied payload public key and use the completed offline release signer to produce the first authorized Master/Touch bundle; verified acquisition, fresh install, same-release repair/root rollback, semantic configuration, IPC schemas, SSRF controls, and OS-protected license-key persistence are complete, while version-changing upgrade/reboot recovery/safe uninstall and the explicit Windows ACL policy remain.
3. Build the MoneyTrash Electron parity shell without removing Tauri until ingest/resume tests pass.
4. Align Electron, builder, TypeScript, updater, and version sources across all desktop targets.
5. Prove native dependency closure in current unpacked builds, then clean Windows 10/11 VMs.
6. Configure signing and signed update channels before producing production installers.

## Authoritative references

- Electron security checklist: <https://www.electronjs.org/docs/latest/tutorial/security>
- Electron IPC guidance: <https://www.electronjs.org/docs/latest/tutorial/ipc>
- Electron `safeStorage`: <https://www.electronjs.org/docs/latest/api/safe-storage>
- electron-builder NSIS options: <https://www.electron.build/docs/api/electron-builder.interface.nsisoptions/>
- electron-builder Windows/signing configuration: <https://www.electron.build/docs/win/>

---

## Stage B & Ecosystem Hardening Update (July 2026)

Following the Stage A baseline, an ecosystem-wide resilience and packaging audit across all 8 applications and shared packages completed with **100% build, lint, and typecheck pass rate (`turbo run build` / `pnpm run lint:all`)**:

1. **SQL Migration Syntax Standardization (`packages/database`)**:
   - Batch-removed 93 instances of redundant `IF NOT EXISTS` clauses across all active and archive migration files (`migrations/*.sql`).
   - Resolved strict Cloudflare D1 / SQLite engine constraint incompatibilities during initialization and deployment.

2. **Cloud Backend Security & Auth Hardening (`apps/cloud-backend`)**:
   - Replaced all dummy/hardcoded authentication checks with real D1 database verifications (`users` table lookup and status validation).
   - Enforced strict JWT signature verification using `@hono/zod-validator` and `hono/jwt` with explicit `alg: 'HS256'` requirement.
   - Enforced access control and bearer authorization checks on R2 object and photo retrieval routes (`/photos/:id`).

3. **API Client & Token Refresh Resilience (`packages/api`)**:
   - Extended `ConnectionManager` with a dynamic `onUnauthorized` callback pattern (`ClientConfig.onUnauthorized`).
   - Added automatic token refreshing, state persistence across requests, and transparent request retry logic upon encountering `401 Unauthorized` responses.

4. **Ecosystem Verification**:
   - `pnpm run lint:all`: Checked all 8 workspace applications with 0 errors.
   - `pnpm run build:all`: Built 18 tasks across `@clickflash/types`, `@clickflash/ui`, `@clickflash/database`, `clickflash-master`, `clickflash-touch`, `moneytrash-uploader`, `main-website`, and `cloud-backend` with zero failures.
