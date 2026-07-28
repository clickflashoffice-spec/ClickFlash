# Route, Page, and Action Matrix

Status vocabulary: **Implemented**, **Partial**, **Broken**, **Orphaned**, **Experimental**, **Unknown**. This is a static source inventory, not a claim that every control was exercised. Approximately 4,026 JSX/TSX interactive-control occurrences were found across the seven largest UIs, so exhaustive control-by-control runtime verification is **Partial**.

## Route and state inventory

| ID | Surface | Routes, screens, or states inspected | Status | Evidence |
|---|---|---|---|---|
| ROUTE-WEB-001 | Website | `/`, about, blog and `[slug]`, bookings, careers, clients, contact, FAQ, license, portfolio, preview, pricing, privacy, services, terms, testimonials | Implemented statically; runtime Unknown | `apps/website/src/app/**/page.tsx`; EVID-0007 |
| ROUTE-MAS-001 | Master | audit; dashboard; albums; bookings; orders; print queue; clients; photographers; settings; growth; resort dashboard | Implemented statically; hardware/cloud paths Partial | `apps/master/src/**/*`; EVID-0007 |
| ROUTE-TOU-001 | Touch | welcome, photos, photo detail, order configuration; device-setup flows | Implemented statically; end-to-end order Unknown | `apps/touch/src/**/*`; EVID-0007 |
| ROUTE-MON-001 | MoneyTrash | single uploader/settings workspace with native file/folder selection and drag/drop | Broken entry paths | `apps/moneytrash/src/App.tsx`; EVID-0008 |
| ROUTE-MGT-001 | Management | activation plus roughly 23 layout-selected management views | Implemented statically; remote auth/data runtime Unknown | `apps/management/src/**/*`; EVID-0007 |
| ROUTE-GAL-001 | Gallery | gallery, store, favorites, download, status, buy photos | Implemented statically; checkout/download runtime Unknown | `apps/gallery/src/**/*`; EVID-0007 |
| ROUTE-INS-001 | Installer | welcome, app selection, license, Cloudflare, destination, fleet, studio, pairing, first sync, health, complete | Implemented statically; install execution not run | `apps/installer/src/**/*`; EVID-0007 |
| ROUTE-LIC-001 | License Generator | generator, audit, fingerprint tabs | Implemented statically; issuance runtime not run | `apps/license-generator/src/**/*`; EVID-0007 |
| ROUTE-MOB-001 | Mobile Client | `index`, `explore` | Experimental starter | `apps/mobile-client/app/*`; EVID-0007 |
| ROUTE-MOB-002 | Mobile Photographer | index, approvals, coach, enroll-face, explore, kiosks, POS, schedule, scout | Partial; starter residue | `apps/mobile-photographer/app/*`; EVID-0007 |
| ROUTE-MOB-003 | Mobile Customer | index, face search, gallery, orders, QR scan, selfie | Partial; no tests/release config | `apps/mobile-customer/app/*`; EVID-0007 |
| ROUTE-MOB-004 | Mobile Staff | index, approvals, ingestion, kiosks, POS, schedule, scout, search, studio, scanner | Partial; no tests/release config | `apps/mobile-staff/app/*`; EVID-0007 |
| ROUTE-CPP-001 | Master C++ | native service/IPC and migration entrypoints | Experimental | `services/master-cpp/**`; EVID-0016 |
| ROUTE-RIDE-001 | Ride Node | capture/upload daemon lifecycle | Experimental and unsafe | `apps/ride-node/**`; EVID-0016 |

## Critical action traces

| Action ID | User/action chain | Implementation result | Failure or security observation | Finding |
|---|---|---|---|---|
| ACT-CLOUD-001 | Caller -> `POST /api/gallery/photos/raw/export-batch` -> D1 photo query -> manifest -> R2 URL | Implemented | No route authentication/authorization was found; caller supplies `eventId`; manifest contains public-R2-style object URLs | CF360-SEC-001 |
| ACT-CLOUD-002 | Bearer caller -> download URL -> file endpoint -> D1 -> R2 | Broken authorization | URL route checks only Bearer syntax; file route validates a token event but does not bind `photo.event_id` to it | CF360-SEC-001 |
| ACT-CLOUD-003 | Caller -> settings/config/face-vector/payroll mutation -> D1/KV | Implemented without a visible route guard | Sensitive business/admin and biometric-adjacent operations lack a coherent authorization boundary in the active Worker | CF360-SEC-001 |
| ACT-MON-001 | User selects file/folder -> `App.tsx` -> `invoke('read_file')` | Broken by design mismatch | Service rejects whole-file reads and says native streaming must be used; the visible picker still calls it | CF360-FUNC-001 |
| ACT-MON-002 | User drops browser `File` -> batch uploader -> native upload | Broken/Partial | Default native mode requires `nativePath`; browser drag/drop objects do not establish it | CF360-FUNC-001 |
| ACT-MON-003 | Active upload -> user cancellation | Partial | Cancellation exists in bridge/service code, but no active-upload cancel control was found in the principal UI | CF360-FUNC-001 |
| ACT-RIDE-001 | Capture -> queue -> simulated upload delay -> log success -> delete local file | Broken for production | No durable remote acknowledgement precedes deletion | CF360-FUNC-002 |
| ACT-REL-001 | Tag -> release workflow -> desktop builds -> release upload | Broken | Master and Installer jobs compile without packaging; Touch packages Windows on macOS; upload paths expect artifacts | CF360-OPS-002 |
| ACT-UPD-001 | Client -> update Worker -> metadata/download | Orphaned | Worker has placeholder signature/URLs and no source consumer was found; Electron clients point at GitHub updater | CF360-OPS-003 |
| ACT-GAL-001 | Customer gallery -> selection/favorites -> checkout/download | Partial | UI and API clients exist, but checkout/payment recovery and protected download were not safely executed; Cloud authorization defects invalidate release confidence | CF360-SEC-001 |
| ACT-TOU-001 | Guest selects photo -> configures order -> local/cloud handoff | Partial | Static state flow exists; disconnected-device, printer, payment, and sync recovery were not exercised | CF360-TEST-001 |
| ACT-INS-001 | Operator enters secrets/settings -> installs apps -> health check | Partial | Wizard and hardened Electron settings exist; actual installer execution and signing were not run, and local executables are unsigned | CF360-OPS-002 |

## Static interaction density

| Surface | Approximate interactive JSX/TSX occurrences | Audit disposition |
|---|---:|---|
| Master | 1,046 | Sampled critical paths; exhaustive review Partial |
| Management | 861 | Sampled navigation/admin paths; exhaustive review Partial |
| Gallery | 306 | Sampled commerce/download paths; exhaustive review Partial |
| Touch | 203 | Sampled order/device paths; exhaustive review Partial |
| Website | 114 | Route inventory complete; interaction execution Partial |
| Installer | 71 | Wizard states inspected; privileged execution not run |
| MoneyTrash | 58 | Entry and cancellation paths traced in depth |
| License Generator | 21 | Static inventory only |

The count is a search-based workload indicator, not a count of unique controls or an accessibility result. See EVID-0007 and `08-ui-ux-accessibility.md`.
