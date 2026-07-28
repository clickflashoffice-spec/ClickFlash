# 03 — Surface Scorecards

Scores are 0–5. They reflect current evidence, not aspirations. `N/A` means the
dimension is not intrinsic to that unit. No averages are used. Abbreviations:
Fn functionality, Ar architecture, UI, UX, Ax accessibility, Pf performance,
Se security/privacy, Te testing, Ma maintainability, Op operations, Do
documentation, Pr production readiness.

## Product and deployable surfaces

| Surface | Fn | Ar | UI | UX | Ax | Pf | Se | Te | Ma | Op | Do | Pr | Evidence | Verdict / blockers |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| Master | 3 | 2 | 3 | 3 | 2 | 2 | 2 | 3 | 2 | 1 | 2 | 1 | EVID-0010/11/13/15 | Conditional local; production No-Go: signing, migration, clean-machine/restore |
| Touch | 3 | 2 | 3 | 3 | 2 | 2 | 2 | 3 | 2 | 1 | 2 | 1 | EVID-0005/11/13/14 | Conditional local; production No-Go: tracked WAL, signing, hardware/recovery |
| MoneyTrash | 2 | 2 | 3 | 2 | 1 | 2 | 3 | 2 | 2 | 1 | 2 | 1 | EVID-0008/12/13 | No-Go picker path; cancellation/restart and signed package missing |
| Management | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 1 | 1 | 1 | 1 | EVID-0009/10/14 | Conditional source; backend/CORS/deploy/schema gates block |
| Gallery | 3 | 2 | 3 | 3 | 2 | 2 | 1 | 2 | 2 | 1 | 2 | 1 | EVID-0009/10/14 | Production No-Go through Cloud Backend object/auth exposure |
| Website | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 2 | 3 | 1 | 2 | 1 | EVID-0006/10/14 | Conditional source; backend/deploy/a11y/perf runtime unknown |
| Cloud Backend | 2 | 1 | N/A | N/A | N/A | 2 | 0 | 0 | 1 | 1 | 1 | 0 | EVID-0009/12 | No-Go: auth/object scope, fallback secret, type errors, zero tests |
| Installer | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 1 | 3 | 1 | EVID-0011/13 | Conditional local; unsigned and no lifecycle/rollback proof |
| License Generator | 3 | 3 | 2 | 2 | 1 | 2 | 2 | 2 | 3 | 1 | 2 | 1 | EVID-0011 | Conditional local; custody/revocation/distribution unverified |
| MCP Server | 2 | 2 | N/A | 1 | N/A | 2 | 1 | 0 | 2 | 1 | 1 | 0 | EVID-0006/16 | No-Go production: trust boundary, tests, packaging absent |
| Docs app | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 0 | 2 | 1 | 3 | 1 | EVID-0006/14 | Conditional; test/lint scripts are no-op |
| Mobile Client | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 2 | 0 | 1 | 0 | EVID-0007/14 | Experimental Expo starter |
| Mobile Customer | 2 | 2 | 2 | 2 | 1 | 1 | 1 | 0 | 2 | 0 | 1 | 0 | EVID-0007/14 | No-Go: no test/release/privacy proof |
| Mobile Photographer | 2 | 2 | 2 | 2 | 1 | 1 | 1 | 0 | 2 | 0 | 1 | 0 | EVID-0007/14 | No-Go: starter residue, no-op test, filter mismatch |
| Mobile Staff | 2 | 2 | 2 | 2 | 1 | 1 | 1 | 0 | 2 | 0 | 1 | 0 | EVID-0007/14 | No-Go: native/security/release proof absent |
| ride-node | 0 | 1 | N/A | 1 | N/A | 1 | 1 | 0 | 1 | 0 | 1 | 0 | EVID-0016 | No-Go: simulated upload deletes capture |
| master-cpp | 2 | 1 | N/A | 1 | N/A | 2 | 2 | 0 | 1 | 0 | 2 | 0 | EVID-0015/16 | Experimental; competing authority, no tests/CI/deploy |
| Gallery Worker | 3 | 2 | N/A | 2 | N/A | 2 | 3 | 2 | 1 | 1 | 2 | 1 | EVID-0009/12/14 | Conditional; deploy/migration/rollback unknown |
| Management Worker | 2 | 1 | N/A | 2 | N/A | 2 | 1 | 2 | 1 | 1 | 1 | 0 | EVID-0009/12 | No-Go: permissive CORS/authority/deploy gaps |
| MoneyTrash Worker | 3 | 2 | N/A | 2 | N/A | 2 | 2 | 2 | 2 | 1 | 2 | 1 | EVID-0009/12 | Conditional source; deploy/migration/recovery unknown |
| Update Server | 0 | 1 | N/A | 0 | N/A | 2 | 0 | 0 | 2 | 1 | 1 | 0 | EVID-0017 | No-Go: placeholder metadata, no consumer/tests |

## Shared packages and operational surfaces

| Surface | Fn | Ar | UI | UX | Ax | Pf | Se | Te | Ma | Op | Do | Pr | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| api | 1 | 1 | N/A | N/A | N/A | 2 | 2 | 0 | 2 | N/A | 1 | 0 | Orphaned |
| config | 2 | 2 | N/A | N/A | N/A | 3 | 2 | 0 | 3 | N/A | 1 | 2 | Supporting, lightly evidenced |
| database | 2 | 0 | N/A | N/A | N/A | 2 | 2 | 0 | 1 | 0 | 1 | 0 | Duplicate migration authority |
| errors | 2 | 2 | N/A | N/A | N/A | 3 | 2 | 2 | 3 | N/A | 1 | 0 | Orphaned |
| licensing | 3 | 3 | N/A | N/A | N/A | 3 | 3 | 2 | 3 | 1 | 2 | 1 | Supporting; custody integration unverified |
| logger | 3 | 3 | N/A | N/A | N/A | 3 | 2 | 2 | 3 | 2 | 2 | 2 | Broadly supporting; privacy policy evidence weak |
| shared | 1 | 1 | N/A | N/A | N/A | 3 | 2 | 0 | 2 | N/A | 1 | 0 | Orphaned with API |
| telemetry-web | 2 | 2 | N/A | N/A | N/A | 2 | 2 | 0 | 3 | 1 | 1 | 1 | Supporting; retention/consent unknown |
| test-utils | 1 | 2 | N/A | N/A | N/A | 3 | 2 | 2 | 3 | N/A | 1 | 0 | No external consumer |
| types | 3 | 2 | N/A | N/A | N/A | 3 | 2 | 1 | 3 | N/A | 2 | 2 | Supporting; dependency-spec drift |
| ui | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 0 | 2 | N/A | 2 | 1 | Selectively used; duplicate primitives and no tests |
| utils | 2 | 2 | N/A | N/A | N/A | 3 | 2 | 2 | 3 | N/A | 1 | 0 | Orphaned |
| validation | 3 | 3 | N/A | N/A | N/A | 3 | 3 | 2 | 3 | N/A | 2 | 2 | Supporting; limited cross-boundary adoption |
| CI/CD | 1 | 1 | N/A | N/A | N/A | 2 | 0 | 0 | 1 | 0 | 1 | 0 | Primary YAML invalid; failure-tolerant gates |
| Release/installer tooling | 1 | 2 | N/A | 1 | N/A | 2 | 1 | 1 | 2 | 0 | 2 | 0 | Command/output/signing/provenance mismatch |
| Test systems | 2 | 1 | N/A | N/A | 1 | 1 | 2 | 2 | 1 | 1 | 1 | 0 | Coverage concentrated; production suites unverified |
| Documentation/archive | 2 | 1 | N/A | 2 | 1 | 2 | 1 | 0 | 1 | 1 | 1 | 0 | Extensive but contradictory/stale |

`N/A` UI/UX/Ax scores apply to libraries or headless runtimes; their consumer
experience is scored on the relevant product surface. Evidence strength is
static High for path/config findings, Medium for runtime behavior, and Low/Unknown
for external production controls.
