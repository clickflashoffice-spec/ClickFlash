# Performance, Operations, and Release Readiness

## Release decision

**No-Go for production release or deployment.** This audit did not change production state. Blocking causes are critical authorization defects, tracked sensitive artifacts, invalid/non-blocking CI, broken release jobs, unsigned local executables, incomplete mobile/update paths, Cloud Backend typecheck failure, and unproven restore/rollback.

## Static performance risks

| Risk | Evidence | Likely effect | Measurement required |
|---|---|---|---|
| Large service/UI modules | Master `cloudSyncService` ~2,829 lines; management Worker server ~2,795; gallery Worker server ~1,903; Master collection UI ~1,598; installer main ~1,447; MoneyTrash App ~1,169 | High change coupling, cold parse/bundle cost, difficult profiling and tests | Bundle/module profile, CPU/memory trace, change/defect metrics |
| Image/RAW workload | Multiple photo grids, previews, uploads, exports, processing paths | Memory pressure, UI stalls, bandwidth/storage spikes | Representative RAW/JPEG set; p50/p95/p99 ingest, preview, upload, export; peak RSS |
| Browser whole-file seam | MoneyTrash visible flow calls a prohibited read path | Failure or excessive renderer memory if bypassed | Packaged-app streaming test with 1/10/50+ GB batches |
| Multiple Workers/database paths | Four Workers plus several schema families | Extra network hops, inconsistent caching, query amplification | Per-route traces, D1 query counts/duration, R2 operations, cache hit rate |
| Local sync/offline queues | Master/Touch/MoneyTrash/Ride | Backlogs, retries, duplicate work, data loss | Disconnect/reconnect soak, queue age/depth, retry rate, checksum mismatch |
| Committed generated outputs | Storybook static and coverage artifacts | Clone/scan churn and stale evidence | Repository size/CI IO before and after ownership cleanup |

No performance benchmark was run; all performance conclusions are hypotheses tied to source evidence.

## Proposed budgets

Budgets require product validation but should be adopted before optimization:

| Experience | Initial budget proposal |
|---|---|
| Website/Gallery public page | p75 LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 on representative mobile network/device |
| Kiosk photo grid interaction | p95 input-to-visible-response <= 100 ms after assets are local; no >200 ms main-thread task during navigation |
| Desktop startup | p95 usable workspace <= 5 s on minimum supported workstation |
| Thumbnail presentation | p95 first viewport <= 2 s from local catalog; progressive placeholders with cancellation |
| Upload | Constant-bounded renderer memory; resumable chunks; checksum; visible throughput/ETA; cancellation <= 2 s |
| API | p95 reads <= 300 ms and mutations <= 700 ms excluding third-party latency; error rate < 0.5% per route |
| Queue durability | Zero deletion before durable verified acknowledgement; replay produces no duplicate business object |

## Operations and observability

| Area | Present | Missing/Unknown |
|---|---|---|
| Logging | Shared and local logger patterns; Worker/desktop logs | Cross-service correlation IDs, PII redaction proof, retention, searchable production access |
| Metrics | Some application telemetry/health concepts | Route SLIs/SLOs, queue age, upload integrity, D1/R2 saturation, payment reconciliation |
| Alerting | Workflow/deploy hints | Tested paging thresholds, ownership, escalation, customer-impact dashboard |
| Health | Installer health step and service endpoints/concepts | Dependency-aware readiness, synthetic critical journeys, canary comparison |
| Backup/restore | Database scripts/docs exist | Current backup policy, encrypted copies, RPO/RTO, successful restore evidence |
| Incident response | Security/remediation docs exist | Current roster, drill evidence, key/WAL incident closure |
| Rollback | Workflow language and release channels | Tested Worker rollback, schema compatibility, desktop downgrade/data safety |

## Release workflow defects

- `.github/workflows/ci.yml` fails a unique-key YAML parse.
- Critical dependency audit, PR lint, and PR typecheck are allowed to fail.
- Release Master and Installer jobs invoke compile/obfuscation scripts rather than producing the artifacts later uploaded.
- Touch invokes Windows packaging across a macOS matrix entry.
- Web release references `star-master-gallery`, while the manifest is `star-master-customer`.
- Mobile release references `mobile-photographer`, while that manifest is named `mobile`.
- No EAS configuration was discovered for mobile publication.
- The Update Server publishes placeholder metadata and has no discovered client, while Electron clients use GitHub update configuration.
- Latest inspected local Master, Touch, Installer, and MoneyTrash executables report `NotSigned`.

## Deployable readiness gates

| Class | Must pass before release |
|---|---|
| Cloud Workers | Valid blocking CI; complete route authorization matrix; typecheck/tests; isolated DAST; migrations rehearsed; secrets/bindings verified; canary and rollback |
| Web/Pages | Blocking lint/type/test/build; environment contract; CSP/CORS/auth review; accessibility complete-process evidence; synthetic checkout/download |
| Electron/Tauri | Clean package; hardened IPC audit; signed/notarized artifacts; SBOM/provenance; install/start/update/rollback; malware scan; supported OS matrix |
| Mobile | Product-complete routes; permissions/privacy review; tests; EAS/build signing config; device matrix; offline/crash/upgrade behavior |
| Native/Python services | Named owner; service contract; durability tests; package/service deployment; observability; fail-safe local retention |

## Go/No-Go checklist

- [ ] CF360-SEC-001 authorization/object-scope fixed and independently verified.
- [ ] Key-shaped PEM and WAL classified, contained, rotated/revoked/purged as applicable.
- [ ] CI parses and every security/type/lint/test/coverage gate is blocking.
- [ ] Cloud Backend typecheck passes in clean locked environment.
- [ ] One authoritative schema/migration path per datastore with restore rehearsal.
- [ ] MoneyTrash and Ride durability paths pass packaged/fault-injected tests.
- [ ] Desktop artifacts are signed and update/rollback verification passes.
- [ ] Mobile and Update Server are either production-complete or explicitly removed from release/deploy matrices.
- [ ] Accessibility complete-process checks pass for customer and operator journeys.
- [ ] Production observability, ownership, backup/restore, canary, and rollback evidence is attached.

Until every item is evidenced, production disposition remains **No-Go**.
