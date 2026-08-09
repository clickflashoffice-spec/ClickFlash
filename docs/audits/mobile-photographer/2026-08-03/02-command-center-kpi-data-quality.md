# Command-Center KPI and Data-Quality Audit

## Decision and measurement boundary

The current command center is safe for a photographer to view **self-scoped operational indicators** from Master. It is not safe to use for payroll, payout, settled revenue, or workforce time decisions.

Grain: one authenticated photographer, one desk/tenant context, one half-open local-date period, plus at most one daily row per date. Periods are capped at 93 days. Money uses signed safe integer minor units with ISO currency and explicit exponent.

## KPI contract

| Layer | Metric | Current definition | Status |
|---|---|---|---|
| Primary | Operational gross | Sum of Master orders in the accepted completed/delivered operational state for the scoped photographer and period, transported as `grossMinor` | **PROVISIONAL** |
| Primary | Photos catalogued | Count of scoped photo records attributed to the photographer | **Operational**; source attribution quality still needs live profiling |
| Primary | Completed orders | Count of accepted completed/delivered operational orders | **Operational**; not a settlement count |
| Driver | Distinct photos sold | Distinct sold photo identifiers derived independently of catalogue counts | **Operational** |
| Driver | Average order | Operational gross divided by completed orders under the service rule | **PROVISIONAL** |
| Guardrail | Quality flagged | Count of catalogued photos with quality flags | **Operational**; flag calibration is unvalidated |
| Guardrail | Freshness/completeness | Source watermark, hub-sync time, stale flag, pending count, and explicit completeness states/issues | **Contracted**; live SLA distribution is unprofiled |
| Withheld | Settlement/refund/net | The shared immutable event contract and reconciliation gate now exist, but real verified producers and projections do not | **UNAVAILABLE** |
| Withheld | Commission/payable/payout | Contract/gate exist; approved policies, separation of duties, authoritative producers, and live reconciliation do not | **UNAVAILABLE** |
| Withheld | Shift/worked time | Contract and causal sequence checks exist; the current unauthenticated proxy is not an authoritative producer | **UNAVAILABLE** |

Targets must not be used to rank or discipline photographers until definitions, source completeness, controllability, cohort fairness, and an appeal/correction path are approved.

## Data-quality assessment

| Dimension | Current evidence | Risk |
|---|---|---|
| Completeness | The contract exposes nullable withheld fields and completeness issues instead of fabricated values. | No live production population was profiled, so missing attribution, late orders, and event coverage rates are unknown. |
| Uniqueness | Daily dates are unique and ascending; request nonces are single-use; immutable events have a primary UUID plus a unique producer/idempotency key, and one active reversal per event. | Cross-source duplicate and live production event rates remain unprofiled. |
| Validity | Strict schemas validate IDs, timestamps, timezone, ISO currency/exponent, safe integer minor units, event payloads, settlement arithmetic, period bounds, and causal shift/break references. | Valid structure does not prove correct source facts, policy, approvals, or business-state classification. |
| Consistency | TND and JPY exponent boundaries are tested; TND exponent 3 is confirmed against Unicode CLDR release 48 supplemental data; self-session and device routes share V1. | Gallery, Management, payroll, and legacy ledger definitions are not yet reconciled to the same event model. |
| Integrity | Photographer scope is server-derived; device responses are nonce-bound and signed; event reads revalidate schema plus deterministic SHA-256; update/delete triggers enforce append-only storage. | Historic/missing attribution and cross-system lineage still require producer integration, production profiling, and reconciliation. |
| Timeliness | Snapshot watermark, stale state, pending count, and hub-sync timestamp exist. | No live freshness distribution or SLO breach evidence was collected. |

## Known limitations

- No live production dataset profile was run. There are no measured null rates, duplicate rates, orphan rates, attribution coverage, late-arrival distribution, source-to-source variance, or freshness percentiles.
- **High — Management revenue over-count risk:** `workers/management-worker/src/services/analyticsService.ts` uses `status != 'Cancelled'` in revenue aggregates, so `Pending` orders are included. Those dashboards cannot be treated as settled or final revenue until the accepted-state policy is explicit and reconciled.
- **High — payroll endpoint is non-authoritative:** `apps/cloud-backend/src/routes/settings.ts` returns a hard-coded `mockPayroll` ledger from `/payroll/calculate-commissions`. It must never feed payable earnings or payout UI.
- **High — no mounted canonical ledger API:** `apps/master/backend/routes/ledger.ts` exists, but no route mount was found in the current Master backend. Its legacy major-unit/rate logic is not the immutable, currency-scaled event authority required by this contract.
- The new event table is intentionally empty of real producer traffic at this checkpoint. Gallery settlement/refund behavior, Management analytics definitions, and legacy payroll/ledger behavior are not yet authoritative as a unified financial event stream.
- Operational order status is a software classification and may differ from captured payment, settlement, refund, chargeback, recognized revenue, and paid payroll.
- Photographer performance signals must remain explanatory and non-punitive; score formulas and targets require governance and cohort review.

## Required next data gates

1. Implement authenticated, idempotent producer adapters and durable outboxes for the now-defined canonical event contract; never infer capture or settlement from operational order status.
2. Profile representative production-like snapshots for completeness, uniqueness, validity, consistency, referential integrity, timeliness, and source variance without exposing customer PII.
3. Reconcile `orders → captures → settlements/refunds → attribution → commission/adjustment → approval → payout` with zero unexplained variance on controlled fixtures, then on approved live samples.
4. Add automated checks for duplicate events, orphan attribution, invalid currency scale, impossible state transitions, out-of-period daily rows, stale snapshots, and UI coercion of unavailable values.
5. Obtain finance/operations sign-off and separation-of-duties evidence before changing settlement, earnings, shifts, or payouts from `UNAVAILABLE` to `FINAL`.
