# Quality, Reliability, and Test Matrix

## Source test inventory

Search-based counts include conventional test/spec filenames and may include fixtures/configuration; they are coverage indicators, not executed totals.

| Surface | Tracked test-like files | Test command/gate evidence | Audit result |
|---|---:|---|---|
| Master | 179 | Vitest plus large source suite | Strongest inventory; not executed broadly |
| Touch | 23 | Vitest/source tests | Moderate static inventory; device/E2E gap |
| Website | 21 | Framework/unit tests | Moderate static inventory; browser journeys not run |
| Management | 14 | Tests present | Sparse relative to 861 control occurrences |
| Gallery | 13 | Tests present | Sparse for commerce/download risk |
| Installer | 11 | Tests present | Privileged install and rollback not exercised |
| MoneyTrash | 8 | Vitest; one focused suite executed | Focused desktop service 7/7 passed; UI seam remains broken |
| Cloud Backend | 0 | No test files found | Critical gap for deployed security-sensitive API |
| Mobile Client/Photographer/Customer/Staff | 0 each | No meaningful tests found; Photographer test exits success | Critical release gap |
| Ride Node | 0 | No tests/CI found | Experimental; destructive behavior unguarded |
| Master C++ | 0 | No tests/CI found | Experimental |
| Update Server | 0 | No tests found | Orphaned/unsafe |

Repository-wide test-like search found approximately 382 files. Root and per-surface skip/only/TODO-style signals exist; they were not adjudicated one by one.

## CI truth

| Gate | Source state | Reliability consequence |
|---|---|---|
| `.github/workflows/ci.yml` parse | Fails standards-compliant YAML parse due duplicate top-level keys and duplicate `with` | Primary CI definition cannot be trusted as valid |
| Security audit | `pnpm audit --audit-level=critical` is `continue-on-error` | Critical dependency findings need not fail CI |
| Secret scan | TruffleHog action pinned to mutable `@main` | Supply-chain reproducibility risk |
| PR lint/typecheck | Marked `continue-on-error` | Type/lint regressions may merge |
| PR size limit | Non-blocking | Governance signal only |
| Coverage thresholds | Configured in projects but CI often runs plain `test` | Thresholds are not consistently enforced |
| Root aggregate filters | Focus six principal apps and package named `mobile` | Workers, services, several apps, and three mobile packages can be omitted |

## Safe validations executed

| Validation ID | Command scope | Result | Interpretation |
|---|---|---|---|
| VAL-001 | Parse all 11 workflow YAML files using installed Node `yaml` parser with unique keys | 10 parsed; `ci.yml` failed on duplicate keys | Confirms CF360-OPS-001 |
| VAL-002 | MoneyTrash `desktopService.test.ts` only | 1 file, 7 tests passed | Confirms whole-file read rejection is deliberate; does not validate UI upload journey |
| VAL-003 | MoneyTrash typecheck | Passed | Compile health only |
| VAL-004 | Gallery Worker typecheck | Passed | Compile health only |
| VAL-005 | Management Worker inspected `build` (`tsc --noEmit`) | Passed | Compile health only |
| VAL-006 | MoneyTrash Worker typecheck | Passed | Compile health only |
| VAL-007 | Cloud Backend no-emit typecheck | Failed: Hono verify arity, missing logger aliases, missing `process`/`Buffer` types; command resolution also reported missing `tsc` | Deployed source is not type-clean in the attempted package context |
| VAL-008 | Authenticode metadata on latest local desktop executables | All sampled executables `NotSigned` | Local artifacts cannot satisfy release-signing gate |
| VAL-009 | SQL SHA-256 duplicate grouping | 110 identical groups | Confirms migration duplication; does not prove semantic compatibility |

Full commands, timestamps, and unchanged/changed-state notes are in `19-command-and-validation-log.md`.

## Reliability risk matrix

| Capability | Unit | Contract | Integration | E2E | Fault injection | Current confidence |
|---|---|---|---|---|---|---|
| API authentication/authorization | Missing for Cloud Backend | Missing | Missing | Not run | Not run | Very Low |
| Photo ingest/sync/export | Some Master tests | Fragmented | Partial source | Not run | Not run | Low |
| Gallery order/payment/download | Some tests | Not established end-to-end | Partial source | Not run | Not run | Low |
| MoneyTrash upload/cancel/resume | Focused service tests | Partial | UI seam broken | Not run | Not run | Low |
| Touch order/device/offline | Some tests | Partial | Hardware not run | Not run | Not run | Low |
| Installer/license/update | Some installer tests | Fragmented | Not run | Not run | Not run | Very Low |
| Migrations/backup/restore | Many scripts/files | No single contract | Not run | Not run | Not run | Very Low |
| Mobile journeys | None | None | None | None | None | Very Low |
| Ride capture durability | None | None | Simulated only | None | None | None |

## Required release test strategy

1. **P0 deny-by-default API suite:** generate an inventory from route registration; require positive and negative auth/role/tenant/event/object tests for every route.
2. **Schema contract suite:** designate one migration owner per store; test clean install, N-1 upgrade, rollback/restore rehearsal, and concurrent-client compatibility with synthetic data.
3. **Photo durability suite:** checksum, duplicate, disconnect, timeout, resume, cancel, crash/restart, R2 missing-object, and acknowledgement-before-delete cases.
4. **Commerce suite:** idempotent checkout, webhook reorder/replay/signature failure, refund/reconciliation, expiring download, and wrong-user/event tests.
5. **Native security suite:** enumerate every IPC command, validate sender/schema/capability, and run packaged-app smoke tests.
6. **Accessibility suite:** automated checks plus keyboard, screen-reader, zoom/reflow, touch and error-state manual evidence for complete processes.
7. **Release suite:** clean checkout, locked dependency install, lint/type/test/coverage, SBOM, provenance, signing verification, install/update/rollback, artifact hash and malware scan.
8. **Operational suite:** staged canary, metrics/alerts, backup restore, migration failure, secret rotation, incident rollback, and log-redaction review.

No broad build, package, migration, deployment, payment, E2E, hardware, or production command was run in this source-read-only audit.
