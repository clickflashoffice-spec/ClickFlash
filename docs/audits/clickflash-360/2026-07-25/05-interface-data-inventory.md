# Interface and Data Inventory

## HTTP and Worker interfaces

| Interface ID | Owner | Families observed | Authentication/authorization evidence | Lifecycle | Evidence |
|---|---|---|---|---|---|
| IF-HTTP-001 | Cloud Backend Worker | auth, gallery/events/photos/downloads/raw exports, settings, config push, franchises, themes, payroll, face vectors | JWT is created/verified in selected gallery paths, but no global guard and multiple sensitive handlers have no visible guard; fallback JWT secret exists | Active deployment target | `apps/cloud-backend/src/index.ts`, `src/routes/gallery.ts`; EVID-0010 |
| IF-HTTP-002 | Management Worker | management/admin APIs and WebSocket/server routes | Route-specific model; permissive reflected/wildcard CORS found | Active deployment target | `workers/management-worker/src/server.ts`; EVID-0010 |
| IF-HTTP-003 | Gallery Worker | gallery/store/payment/download APIs | Large route implementation; runtime authorization not exhaustively proven | Active deployment target | `workers/gallery-worker/src/server.ts`; EVID-0010 |
| IF-HTTP-004 | MoneyTrash Worker | upload/processing APIs | Route-specific; `Origin` or wildcard CORS found | Active deployment target | `workers/moneytrash-worker/src/index.ts`; EVID-0010 |
| IF-HTTP-005 | Update Server | update metadata/download | Wildcard CORS; placeholder signature and URLs | Orphaned deployment target | `workers/update-server/src/index.ts`; EVID-0017 |
| IF-HTTP-006 | Website/Next routes | application page/server actions and public site integrations | Framework-specific; not an API authority | Active web surface | `apps/website/src/app/**`; EVID-0007 |

## Desktop/native boundaries

| Boundary ID | Producers/consumers | Privilege | Observed controls and gaps | Evidence |
|---|---|---|---|---|
| IF-IPC-001 | Master renderer <-> Electron main/preload | filesystem, printing, device, updater, cloud synchronization | `contextIsolation`, sandbox, and disabled Node integration found; complete sender/schema validation not proven | EVID-0011 |
| IF-IPC-002 | Touch renderer <-> Electron main/preload | kiosk/device/filesystem/order | Same positive webPreferences baseline; hardware and sender validation runtime Unknown | EVID-0011 |
| IF-IPC-003 | MoneyTrash renderer <-> Electron/Tauri services | file selection/read/stream upload | Electron streaming implementation exists, while primary UI still invokes rejected Tauri whole-file path | EVID-0008 |
| IF-IPC-004 | Installer renderer <-> Electron main | filesystem, process execution, installation, secrets | High-trust boundary; hardened renderer flags found, but privileged command allowlisting and full runtime behavior not exercised | EVID-0011 |
| IF-IPC-005 | License Generator renderer <-> Electron main | key/license generation and storage | Secret-bearing workflow; signing-key handling cannot be approved while a key-shaped file is tracked | EVID-0005 |
| IF-NATIVE-001 | Master React/Electron <-> `services/master-cpp` | native performance/data functions | Interface exists as a separate experimental unit; ownership and production invocation not established | EVID-0016 |
| IF-NATIVE-002 | Mobile/native apps <-> Workers | camera, QR, face/image data, operations | Client routes exist, but release config, tested contracts, privacy permissions, and endpoint authority are incomplete | EVID-0007 |

## Data stores and schemas

| Data ID | Store/family | Writers/readers | Schema authority | Retention/deletion evidence | Risk |
|---|---|---|---|---|---|
| DATA-001 | Cloudflare D1 | Cloud Backend plus Gallery/Management/MoneyTrash Workers | At least four live migration families | Multiple competing histories; rollback/forward compatibility not proven | High |
| DATA-002 | Cloudflare R2 | photos, RAW exports, update/package artifacts | Multiple Workers/services | Public-R2-style URLs are assembled in raw export manifest; object retention policy not established | Critical link to CF360-SEC-001 |
| DATA-003 | Local SQLite | Master, Touch, native/C++ paths | Several migration runners/directories | WAL file is tracked; backup/restore and purge tests not evidenced | High |
| DATA-004 | Local files/capture queues | Master, Touch, MoneyTrash, Ride Node | App-specific | Ride Node deletes after simulated upload; MoneyTrash streaming boundary inconsistent | High |
| DATA-005 | KV/config/secrets | Workers and installer | Per-worker bindings and deploy secrets | Runtime secret presence/rotation cannot be verified from source; tracked key-shaped path is a blocker | Critical |
| DATA-006 | Package database migrations | `packages/database` | 240 tracked SQL files | No source consumer found, making authority and applicability Unknown | High architectural debt |
| DATA-007 | Generated test/story artifacts | `packages/validation/coverage`, `packages/ui/storybook-static` | Committed outputs | Staleness and review ownership not defined | Medium |

## Migration authorities

| Family | Approximate tracked SQL files | Use evidence | Disposition |
|---|---:|---|---|
| `packages/database` | 240 | No manifest/source consumer found | Orphaned/Unknown |
| `apps/master/backend/database/migrations` and `apps/master/backend/migrations` | 52 plus adjacent schema files | Both paths are referenced by setup logic | Competing |
| `apps/touch` | 17 | Touch local runtime | Active but cross-family drift Unknown |
| `apps/cloud-backend` | 8 | Remote D1 migration workflow | Active production path |
| Gallery Worker | 3 | Worker schema path | Active |
| Management Worker | 42 | Worker schema path | Active |
| MoneyTrash Worker | 3 | Worker schema path | Active |
| Master C++ | 57 | Native migration runners | Experimental/competing |
| Archived docs | 207 | Documentation/archive | Non-runtime secondary evidence |

The SQL hash inventory found 110 byte-identical duplicate groups, with some definitions copied into as many as 11 paths. Hashes were computed without printing data content. See EVID-0015.

## External dependencies and trust assumptions

- Cloudflare Workers, D1, R2, KV/Secrets, Pages and Wrangler are central production dependencies.
- GitHub Releases/electron-updater is the apparent desktop update path; the separate Update Server is not referenced by a consumer.
- Stripe appears in gallery/payment paths; no live payment operation was performed.
- Vercel/Cloudflare Pages claims coexist in documentation and workflows; deployment ownership must be made explicit.
- Expo/React Native dependencies are present for four mobile packages, but no EAS deployment configuration was discovered.
- Native file, camera, printer, QR, biometric/face-vector, filesystem, and device integrations require permissions and data-minimization controls not provable through static source alone.

Environment variable names and binding identifiers were inspected only as configuration metadata. Values were never printed. Complete production bindings, schemas, data residency, retention, restoration state, external contract versions, and current deployed revisions remain **Unknown**.
