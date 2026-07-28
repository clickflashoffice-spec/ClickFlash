# User Journeys and Data Flows

No production account, payment, biometric, hardware, migration, or destructive workflow was exercised. “Works” below means the static chain is coherent; runtime status is separately stated.

| Journey ID | Normal path | Data/trust transitions | Runtime disposition | Principal gap |
|---|---|---|---|---|
| JRN-001 Guest photo purchase | Touch/Gallery -> browse event photos -> select/configure -> order/payment -> fulfillment/download | Customer identifiers, photo IDs, selections, payment references cross browser/kiosk and Worker boundaries | Partial | Cloud download/export authorization is not trustworthy; payment and recovery not executed |
| JRN-002 Photographer ingestion | Master/device -> ingest -> local catalog -> cloud sync -> gallery publication | Image/EXIF/customer association moves from local disk to API/D1/R2 | Partial | Hardware, deduplication, retry, rollback, and cross-schema behavior unproven |
| JRN-003 MoneyTrash batch upload | Choose/drop files -> native path -> streaming uploader -> Worker/R2 -> progress/cancel | Local filesystem path and content cross sandbox/native/network boundaries | Broken | Visible selection invokes rejected whole-file command; drop path lacks native path; cancel is not reachable |
| JRN-004 Admin operations | Management -> authenticate -> staff/event/settings/payroll action -> Worker/D1 | High-privilege personnel, configuration, and financial metadata | Partial/unsafe | Several sensitive Cloud Backend mutations lack a coherent route guard |
| JRN-005 Face/QR discovery | Customer/mobile/kiosk -> selfie/QR -> event match -> photo results | Biometric-adjacent vectors, face image, event token, photo metadata | Partial/unsafe | Enrollment/read routes and photo object scoping are insufficiently protected; consent/retention not proven |
| JRN-006 Installation/licensing | Operator -> license/config -> choose apps -> install -> pair -> health check | Signing material, API tokens, device identity, filesystem/process privilege | Partial | Key-shaped tracked file, unsigned artifacts, and no safe execution validation |
| JRN-007 Ride capture | Camera event -> local file -> upload queue -> acknowledgement -> local cleanup | Photo moves from device disk to remote storage | Broken for production | Worker simulates success and deletes local capture without durable acknowledgement |
| JRN-008 Desktop update | Release -> signed artifact/metadata -> updater check -> verified install -> rollback | Executable code crosses publisher/update trust boundary | Broken/Orphaned | Update Worker contains placeholders and no consumer; GitHub path is separate; artifacts are unsigned |

## Failure-mode matrix

| Failure | Expected safe behavior | Source-derived state | Status |
|---|---|---|---|
| Network disconnect during upload | Persist queue and checksum; resume idempotently; never delete sole copy | MoneyTrash has native upload/cancellation service pieces; Ride Node simulates and deletes | Broken/Partial |
| Expired/forged token | Reject before object lookup; bind subject/role/event/object | Selected Cloud gallery paths verify tokens, but fallback secret and object-scope gaps remain | Broken |
| Wrong event photo ID | Return not found/forbidden without object existence leakage | File route queries by photo ID without comparing token event to stored event | Broken |
| Duplicate upload/order | Idempotency key and deterministic replay response | Not established across ecosystem | Unknown |
| Payment timeout/webhook reorder | Durable pending state, verified webhook, reconciliation | Payment code exists; live and fault-injection validation not run | Unknown |
| D1 migration failure | Transactional forward migration or tested restore/rollback | Multiple migration authorities and direct remote migration workflow | Unknown/High risk |
| R2 object missing | Preserve metadata integrity, alert, retry/reconcile | Reconciliation behavior not proven | Unknown |
| Printer/camera/device unavailable | Non-destructive retry, operator diagnosis, offline queue | UI/device code exists; hardware not exercised | Unknown |
| App crash mid-operation | Recover journal/queue on restart | Some local persistence exists; recovery matrix absent | Partial |
| User cancels upload/install | Stop safely, retain recoverable state, surface result | MoneyTrash service has cancellation but primary UI does not expose it; installer not executed | Partial |
| Update signature mismatch | Hard fail, keep current version, report safely | Local artifacts are unsigned; placeholder update metadata exists | Broken |
| Accessibility-only input | Full keyboard/switch path with visible focus and announced state | Static semantics sampled only; no AT/browser sweep | Partial |

## Cross-journey invariants required before release

1. Every protected API operation must authenticate, authorize the role/action, and scope every object query to the authenticated tenant/event/user.
2. Photo, biometric-adjacent, payment, credential, and personnel data need documented purpose, consent/legal basis, minimization, retention, deletion, and audit logging.
3. No local source image may be deleted until a durable, integrity-checked remote acknowledgement is recorded and recoverable.
4. Mutating operations need idempotency and explicit timeout/retry/cancellation semantics.
5. Every privileged native IPC call needs a typed schema, sender validation, narrow capability, and redacted error/log behavior.
6. Install/update artifacts need a trusted build, signature/provenance verification, staged rollout, health check, and rollback.

Detailed paths are linked by ACT IDs in `04-route-page-action-matrix.md` and findings in `13-master-finding-register.md`.
