# Implementation Evidence

## EVIDENCED controls

| Control | Evidence anchor | Result and boundary |
|---|---|---|
| Administrator-bound identity | `apps/master/backend/routes/mobileCapture.ts`; migration `069_mobile_capture_photographer_binding.sql`; `mobileCapture.test.ts` | An administrator selects an eligible photographer before issuing a one-use code; the device record retains that binding. The focused pairing suite passes. This is software evidence, not a lost-device or physical pairing drill. |
| Safe administrator UI/API data | `apps/master/src/components/settings/MobilePhotographerPairing.tsx`; `mobileCaptureService.ts` | The pairing workflow uses a limited photographer list and displays the binding. UI acceptance remains active. |
| Self-session authorization | `apps/master/backend/routes/photographerCommandCenter.ts`; `PhotographerCommandCenterService.ts`; `photographerCommandCenter.test.ts` | Photographer scope is derived from the authenticated session, not a caller-selected ID. Session-route tests pass 5/5. |
| Paired-device authorization | `apps/master/backend/routes/mobileCapture.ts`; `mobileCommandCenter.test.ts` | The command-center scope comes from the authenticated device's persisted photographer binding. Paired-device tests pass 3/3, including denial of caller-selected scope. |
| Versioned shared contract | `packages/types/src/index.ts`, `PhotographerCommandCenterV1Schema` | Strict V1 validation covers identity, period, source, freshness, activity, sales, earnings, performance, daily rows, and completeness. Shared types typecheck and build pass. |
| Money representation | V1 `currency`, `currencyExponent`, and integer minor-unit fields; session/device tests | Currency scale is explicit. TND exponent 3 and JPY exponent 0 are tested; TND exponent 3 is confirmed against Unicode CLDR release 48 supplemental currency data. Floating major-unit values are not transported. |
| Response integrity and replay binding | `apps/mobile-photographer/src/services/MasterCaptureProtocol.ts`; `PhotographerCommandCenterResponse.ts`; Master mobile route/tests | The paired response is signed and bound to the request nonce. A captured response cannot be treated as valid for another request nonce under the tested protocol. |
| Android command-center UI and protocol | `src/app/performance.tsx`; tab layout; `PhotographerCommandCenterClient.ts`; `PhotographerCommandCenterModel.ts`; `PhotographerCommandCenterResponse.ts`; `tests/*.test.mjs` | The screen/tab, client, protocol, verifier, and model are implemented. Mobile typecheck and the focused suite pass; the suite now includes Metro configuration and IPv4 startup policy coverage. Paired financial-state runtime evidence remains open. |
| Android Metro and unpaired runtime | `metro.config.js`; `package.json` `start:android`; `metro-config.test.mjs`; Pixel 8 API 35 accessibility tree and logcat | Metro is limited to Mobile's declared shared runtime packages. IPv4 localhost plus ADB reverse returned `packager-status:running`; React Native reported `isMetroRunning(): true`, `loadJSBundleFromMetro()`, and `Running "main"`. The Performance route rendered its period controls, refresh/retry actions, and truthful `PAIRING REQUIRED` state. This is an existing debug-APK smoke, not paired-data, cold-start, accessibility, hardware, or release evidence. |
| Immutable event contract | `packages/types/src/index.ts`, `PhotographerEventV1Schema` | Strict order, capture, settlement, refund, attribution, commission, adjustment, payout, shift/break, reversal, and approval facts use source identity, provenance, safe integer minor units, currency scale, and timezone. |
| Append-only ledger and reconciliation | migration `070_photographer_event_ledger.sql`; `PhotographerEventLedgerService.ts`; focused service test | Database triggers deny update/delete; deterministic hashes, idempotency conflict handling, reference scope, reversal rules, workforce causation, evidence-set approval, and monetary reconciliation are enforced. Focused tests pass 10/10. No producer adapter or public write route was enabled. |

## ACTIVE validation

The focused Android UI lint re-run completed with zero errors and zero warnings after correcting the reported array-style warning.

The Pixel 8 API 35 emulator booted, accepted the existing native development APK, loaded the JavaScript bundle from Metro, and rendered the unpaired Performance route. The first cold debug bundle triggered Android's ANR prompt before JavaScript completed; after choosing `Wait`, `Running "main"` appeared and the process remained alive. Paired-device loading/fresh/stale/offline/error states, currency rendering, TalkBack, large text, cold-start performance, and proof that unavailable financial fields never render as zero or paid remain active acceptance work.

## OPEN architecture work

1. Connect authenticated, idempotent Master/Gallery/Cloud/Management/Mobile producers to the immutable event service through durable outboxes without fabricating missing facts.
2. Reconcile Master operational data to Gallery capture/settlement/refund truth before exposing final net revenue or payable earnings.
3. Complete independent Kiosk and Cloud delivery workers and receipts; current Master evidence must not be generalized to those destinations.
4. Add encrypted authenticated transport for untrusted networks; current HMAC controls integrity/authenticity, not confidentiality over cleartext LAN traffic.
5. Finish physical camera, editor quality, accessibility, release, deployment, observability, rollback, and incident gates.

## Claim discipline

- A passing schema or route test proves the tested behavior, not production data correctness.
- A signed response proves origin/integrity under the tested key path, not network confidentiality.
- Provisional operational gross is not settlement, net recognized revenue, commission, payable payroll, or payout.
- Null and `UNAVAILABLE` are intentional safety states; downstream UIs must not coerce them to zero.
