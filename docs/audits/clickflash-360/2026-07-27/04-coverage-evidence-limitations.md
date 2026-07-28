# Coverage, Evidence, and Limitations

## Coverage ledger

| Family | Surfaces accounted for | Coverage |
|---|---|---|
| Apps | Cloud Backend, Docs, Gallery, Installer, License Generator, Management, Master, MCP Server, four mobile apps, MoneyTrash, `pb_data`, Ride Node, Touch, Website | 17/17 classified; runtime depth varies |
| Workers | Gallery, Management, MoneyTrash, Update Server | 4/4 classified and statically audited |
| Packages | API, Config, Database, Errors, Licensing, Logger, Shared, Telemetry Web, Test Utils, Types, UI, Utils, Validation | 13/13 classified |
| Services | Master C++, Platform | 2/2 classified; production purpose remains unverified |
| Workflows | CI/CD/deploy/E2E/release/nightly/audit families | 11/11 parsed or diagnosed |
| Major UI | Master, Touch, MoneyTrash, Management, Gallery, Website, Installer, License Generator, mobile families | Static page/action coverage; exhaustive runtime Partial |
| Interfaces | HTTP, Worker routes, Electron IPC, WebSocket, sync, update, licensing, storage | Family-level coverage; deployed contracts Unknown |
| Data | SQLite, D1, R2, KV/files, migration families | Static ownership audit; live IDs/ledgers/restore Unknown |

`apps/pb_data` and generated/runtime directories are classified surfaces even without package
manifests. Classification does not imply they are valid source-controlled products.

## Primary evidence anchors

| Topic | Evidence |
|---|---|
| Cloud route mounting | `apps/cloud-backend/src/index.ts:20-35` |
| Fallback JWT and gallery scope | `apps/cloud-backend/src/routes/gallery.ts:18,71,83-124,133-190` |
| Unguarded RAW exports | `apps/cloud-backend/src/routes/gallery.ts:192-288` |
| Sensitive settings/payroll routes | `apps/cloud-backend/src/routes/settings.ts:70-255` |
| Tracked sensitive-shaped artifacts | `git ls-files -- payload_private_key.pem apps/touch/pb_data/*.db*` |
| MoneyTrash path seam | `apps/moneytrash/src/App.tsx:217-334`; `tauriService.ts:120`; `desktopBatchUploadService.ts:196-240` |
| Ride deletion | `apps/ride-node/main.py:65-80`; `apps/ride-node/src/uploader.py:20-38` |
| Placeholder updater | `workers/update-server/index.ts:23-85` |
| CI duplicate keys | `.github/workflows/ci.yml`; unique-key parser result |
| Release mismatch | `.github/workflows/release.yml:53-96,116-170` plus current package names/scripts |
| Full prior evidence | `docs/audits/clickflash-360/2026-07-25/` |

## What was not proven

- Which revision and route set is currently deployed.
- Whether external Cloudflare Access/WAF policies compensate for source-level gaps.
- Whether the tracked PEM is real, revoked, synthetic, or trusted.
- Whether the tracked WAL contains sensitive or synthetic values.
- Tenant isolation against actual production bindings and data.
- Real Stripe, email, notification, R2, D1, KV, update, and mobile-store behavior.
- Packaged desktop behavior on clean supported machines.
- Kiosk hardware, printers, cameras, LAN discovery, power loss, and reconnection.
- WCAG 2.2 conformance across complete processes.
- Representative performance, scale, storage cost, and minimum-hardware budgets.
- Backup/restore, migration ordering, disaster recovery, RPO, and RTO.

## Residual-risk rule

Unknown external controls may reduce risk, but absence of repository evidence cannot be counted as
a control. Production remains No-Go until deployed configuration and independent runtime testing
close the critical gaps.

## Working-tree preservation

The run began with modified July 25 audit documents. Those files were not overwritten. Four
additional tracked Worker audit-log files were modified by test execution and were preserved.
No reset, checkout, cleanup, key read, WAL read, or source fix was performed.

