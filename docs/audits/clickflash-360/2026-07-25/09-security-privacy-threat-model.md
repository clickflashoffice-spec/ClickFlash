# Security, Privacy, and Threat Model

## Decision

Security/privacy readiness is **No-Go**. The active Cloud Backend source exposes authorization and object-scope failures around photo exports/downloads and sensitive mutations. A private-key-shaped file and a database WAL are tracked. No secret or WAL contents were opened.

Standards used as mappings, not compliance claims:

- [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0_release), latest stable release verified 2026-07-25.
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x03-introduction/).
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security).
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for security-adjacent accessible authentication and error prevention.

## Protected assets

| Class | Examples | Impact if compromised |
|---|---|---|
| Photos and RAW media | Customer images, thumbnails, exports, R2 object paths | Privacy harm, unauthorized distribution, contractual/reputational loss |
| Biometric-adjacent data | Face vectors, selfie/enrollment inputs, matching results | Irreversible identity/privacy harm and regulatory exposure |
| Identity and authorization | JWT secrets/tokens, event IDs, staff roles, sessions | Cross-event/customer access and administrative compromise |
| Signing/licensing | Private keys, licenses, update signatures, installer artifacts | Malicious code/license issuance and supply-chain compromise |
| Commerce/personnel | Orders, payment references, payroll/staff records | Financial fraud, privacy breach, operational harm |
| Operational infrastructure | Cloudflare credentials/bindings, D1/R2/KV, GitHub release channel | Full service/data compromise and persistence |
| Local capture state | Camera files, upload queues, SQLite/WAL | Loss, corruption, disclosure, unrecoverable customer work |

## Actors and trust boundaries

- External unauthenticated internet callers.
- Authenticated customer/event users attempting cross-object or cross-event access.
- Staff, franchise, and admin users with excessive or stale privilege.
- Compromised renderer/web content invoking privileged IPC.
- Malicious or compromised dependency/build/release workflow.
- Lost/shared kiosk, workstation, or mobile device.
- Accidental operator error during migrations, deletion, upload, or installation.

Trust boundaries exist at browser/Worker, renderer/preload/main, local device/cloud, Worker/D1/R2/KV, CI/artifact/signing, staff/customer/event/tenant, and application/third-party payment/update services.

## Primary abuse cases

| Threat ID | Abuse case | Source evidence | Severity |
|---|---|---|---|
| THR-001 | Enumerate photo IDs and obtain files outside the token event | Token is not bound to queried photo event in gallery file handler | Critical |
| THR-002 | Request arbitrary event RAW export manifests without authentication | Raw export and job/manifest handlers lack a visible guard | Critical |
| THR-003 | Mutate configuration/themes/franchise/payroll or access face-vector operations without adequate role check | No coherent global guard; several sensitive routes have no local guard | Critical |
| THR-004 | Forge or retain tokens where fallback JWT material is used | `JWT_SECRET || 'fallback-secret'` | Critical if deployment secret absent |
| THR-005 | Use tracked signing key material or repository history | Key-shaped PEM path is tracked and has history | Critical until classified/rotated |
| THR-006 | Recover sensitive SQLite data from committed WAL/history | `apps/touch/pb_data/touch.db-wal` tracked | High, data class Unknown |
| THR-007 | Abuse permissive CORS from untrusted origin | Wildcard/reflected-origin policies in multiple Workers | High/Medium depending credentials |
| THR-008 | Invoke privileged native operation from compromised renderer | Electron IPC surface is high privilege; comprehensive sender validation not proven | High |
| THR-009 | Ship tampered/unsigned update or installer | Local artifacts are `NotSigned`; update metadata contains placeholders | High |
| THR-010 | Delete the only photo copy after false upload success | Ride Node simulates upload then deletes local capture | High |

## Positive controls

- Electron configurations sampled use `nodeIntegration: false`, `contextIsolation: true`, and sandboxing.
- Selected gallery paths do verify JWTs, showing an available control pattern.
- MoneyTrash rejects whole-file reads in favor of native streaming, reducing renderer memory/file exposure when correctly wired.
- Secret-oriented deployment docs/scripts exist and source scans show efforts to move Cloudflare values to runtime secret storage.
- Zod/schema, logging, rate-limit, and security helper patterns exist in parts of the repository.

These controls do not compensate for missing route/object authorization or tracked sensitive artifacts.

## Authorization model required

Every non-public route must pass this sequence:

```text
authenticate credential
-> reject fallback/default key material
-> derive immutable principal and tenant/event scope
-> authorize action against explicit role/policy
-> query object using both object ID and authorized scope
-> enforce field-level policy
-> emit redacted audit event
```

Public routes must be explicitly declared, rate-limited, schema-validated, CORS-restricted, abuse-monitored, and excluded from sensitive object access.

## Privacy lifecycle

| Stage | Required control | Current evidence |
|---|---|---|
| Collection | Purpose, lawful basis/consent, minimal fields, accessible alternative | Face/selfie/QR and photo paths exist; policy implementation not proven |
| Storage | Encryption, tenant isolation, key management, least privilege | Provider capabilities assumed; object authorization failure defeats isolation |
| Use | Purpose limitation and role-scoped access | Inconsistent route authorization |
| Sharing/export | Explicit authorization, expiring scoped URLs, logging | Raw export manifest and download paths are unsafe |
| Retention | Per-class schedule for originals, RAW, thumbnails, vectors, logs, WAL/queues | Not found as a coherent enforceable policy |
| Deletion | Verified cascading deletion and legal-hold handling | Not proven |
| Incident response | Classification, containment, rotation, customer/regulator decision process | Runbook/document hints exist; current tracked artifacts remain blockers |

## Immediate containment

1. Disable or edge-block the affected Cloud Backend export/download/config/biometric/payroll routes until authentication, authorization, and object scoping are verified in the deployed revision.
2. Verify that `JWT_SECRET` is present, high entropy, unique, and rotated; remove fallback behavior and invalidate prior tokens if exposure is plausible.
3. Restrict access to the repository and build outputs; classify the tracked PEM and WAL without printing them; rotate/revoke all possibly affected credentials/keys and purge history through an approved incident process.
4. Suspend public RAW bucket assumptions and audit R2 object visibility/access logs.
5. Do not publish/install unsigned desktop artifacts or the placeholder update feed.

## Required security validation

- Unit and integration deny tests for absent, malformed, expired, wrong-role, wrong-tenant, wrong-event, and wrong-object credentials on every route.
- Property/contract tests that database queries always include authorized tenant/event scope.
- DAST against an isolated deployment, including ID enumeration, BOLA/BFLA, CORS preflight/credential behavior, rate limits, and mass assignment.
- IPC inventory with schema and sender validation tests for every privileged handler.
- Secret scanning across current tree and history using path/status-only reporting for sensitive objects.
- SBOM, provenance, signing verification, dependency review, and update rollback tests.
- Privacy data-flow review and retention/deletion test using synthetic data.

Canonical details and acceptance criteria: CF360-SEC-001, CF360-SEC-002, CF360-PRIV-001, CF360-SEC-003, and CF360-OPS-002 in `13-master-finding-register.md`.
