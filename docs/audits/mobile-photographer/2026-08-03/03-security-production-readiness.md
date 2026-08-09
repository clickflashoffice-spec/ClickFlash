# Security and Production Readiness

## Current security posture

| Area | EVIDENCED | Remaining risk / gate |
|---|---|---|
| Photographer scope | Session identity and persisted paired-device identity select the photographer; client-selected scope is rejected in focused tests. | Run full cross-role, revoked-device, reassignment, lost-device, expiry, rotation, and concurrency abuse suites. |
| Request authentication | Paired requests use device credentials, bounded timestamps, nonces, and replay rejection. | Key custody, backup/restore behavior, revocation propagation, rate-limit load, and operational rotation drills need evidence. |
| Response integrity | Command-center response signatures are bound to the request nonce and verified by Mobile. | Protect keys on real Android hardware and test tamper/replay under process restart and clock skew. |
| Data minimization | V1 returns operational/KPI fields, not customer photo bytes, face vectors, or raw GPS. | Complete a formal data-flow/privacy review and telemetry/support-bundle schema audit. |
| Financial safety | Unproven values remain null/`UNAVAILABLE`. A strict immutable event contract, append-only/hash-verified Master store, explicit reversals, exact evidence-set approvals, and structural reconciliation gate now pass focused tests. | Real producer authentication/outboxes, finance/workforce policy, approver authorization/separation of duties, cloud synchronization, live profiling, projections, and operational rollout are absent. |

## High-risk limitation: LAN confidentiality

HMAC request/response authentication protects authenticity and integrity under the tested key path. It does **not** encrypt cleartext HTTP traffic. On an untrusted or compromised LAN, passive observers may read command-center data and active network controls remain transport-dependent. A paid pilot requires an authenticated encrypted channel such as correctly validated TLS or a controlled secure tunnel, certificate/key lifecycle, hostname/pinning policy where appropriate, downgrade prevention, and failure/rotation tests.

## Production and paid-pilot blockers

1. **Physical camera:** Nikon D7000/device/cable certification, burst, RAW+JPEG, screen-off, detach/reconnect, app/device restart, low storage, full card, corrupt object, battery, thermal, and card-to-ledger reconciliation.
2. **Editor:** immutable versioned recipe, licensed representative golden images, color/skin-tone/clipping/naturalness review, confidence routing, latency/thermal limits, rollback, and human override.
3. **Destinations:** authenticated Kiosk and Cloud authorization, independent durable receipts, expiry/replay/wrong-destination denial, resume, storage pressure, offline/restart chaos, and final reconciliation.
4. **Financial/workforce truth:** integrate the new canonical events with verified producers and outboxes; approve policy/roles; profile live-like data; and prove capture, settlement, refund, net, attribution, commission, adjustment, payout, and clock reconciliation with zero unexplained variance.
5. **Android UX/accessibility:** complete performance screen; TalkBack, large text, contrast, reduced motion, switch access, touch targets, sunlight/glove use, offline/stale/error recovery, and no misleading financial labels.
6. **Release:** reconcile the root `pnpm.overrides` with the lockfile so a frozen install passes, then complete the approved protected signing key, inspected release AAB, dependency/SBOM and secret checks, Play data-safety/policy review, supported-device matrix, staged rollout, rollback, minimum-version policy, and upgrade recovery.
7. **Operations:** production configuration and migrations, monitoring/alerting, audit retention, backup/restore/disaster recovery, on-call/support runbooks, incident exercise, and owner Go/No-Go approval.

## Verdict rule

The checkpoint may remain **PASS WITH LIMITATIONS** for local development while every tested control stays green. Production and any paid pilot remain **NO-GO** until all blockers above have durable evidence and accountable owner approval. No debug build, emulator smoke, unit suite, or local signature may waive these gates.
