# Immutable Financial and Workforce Event Foundation

## Outcome

The repository now has a versioned, append-only event foundation for photographer financial and workforce facts. It is a safe ingestion and reconciliation boundary, not yet an authoritative production ledger: producer adapters, live data profiling, finance approval policy, cloud synchronization, projections, and operational rollout remain open.

The command center must continue to label operational gross as provisional and keep settlement, net, payable, payout, and shift truth unavailable until real producers use this foundation and the remaining gates pass.

## Contract

`PhotographerEventV1Schema` in `packages/types/src/index.ts` defines these facts:

- order completed, payment captured, settlement posted, and refund posted;
- photographer attribution and commission accrued;
- approved credit/debit adjustment and payout posted;
- shift/break start and end;
- explicit reversal; and
- reconciliation approval bound to an exact evidence-set hash.

Every event includes a UUID event ID, producer and producer idempotency ID, server-scoped photographer, desk/optional tenant/timezone, occurred and recorded timestamps, source record ID, optional correlation/causation IDs, and a strict event-specific payload. Customer names, email addresses, photo bytes, face vectors, and precise location are not part of this contract.

Money is transported only as safe integer minor units with an ISO currency and explicit exponent. Settlement gross, fee, and net must use one currency/scale, and net must equal gross minus fee. Periods are half-open local-date ranges anchored to the recorded IANA timezone.

## Persistence and service controls

Migration `070_photographer_event_ledger.sql` creates `photographer_events_v1` with:

- database checks for schema version, producer, event kind, valid JSON, and lowercase SHA-256 shape;
- a primary event ID plus unique `(producer, producer_event_id)` idempotency key;
- indexed photographer/desk/tenant/time, kind/time, and source lookup paths;
- one-reversal-per-event enforcement; and
- database triggers that abort every update and delete.

`PhotographerEventLedgerService` adds:

- strict shared-schema validation before insertion;
- bounded future-clock rejection;
- deterministic canonical event hashing and read-time schema/hash verification;
- exact-retry deduplication and conflict rejection when an ID/key is reused with different content;
- same-photographer/desk/tenant/timezone reference enforcement;
- explicit, single reversal instead of mutation;
- causal shift/break sequence checks; and
- no updateable sync state inside the immutable fact table.

The service is initialized in the Master application context. No public write route was added.

## Reconciliation gate

The service returns one of `UNAVAILABLE`, `BLOCKED`, `READY_FOR_REVIEW`, or `APPROVED` for a photographer, desk/tenant/timezone, period, and currency scale.

It blocks review or approval for:

- missing or duplicate order facts;
- missing capture, settlement, or attribution;
- ambiguous active attribution;
- payment total different from order gross plus tips;
- settlement gross different from captured total;
- refund without its payment or refunds exceeding captured value;
- orphan commission or commission without attribution;
- currency/scale mismatch;
- payout without the exact reconciliation approval; and
- late or corrected facts that make an earlier approval hash stale.

Only active underlying facts are hashed. An approval names that exact hash; a later refund, settlement, adjustment, reversal, or other covered fact changes the set and invalidates the approval. This is structural readiness only. It does not define commission policy, payroll law, revenue recognition, or separation-of-duties approval authority.

## Verification evidence

The focused service suite passes 10/10. It covers exact retries, conflicting idempotency keys, future timestamps, invalid currency scale, direct SQL update/delete denial, same-scope reversal, duplicate reversal, blocked/reviewable/approved transitions, stale approvals, orphan payouts, monetary total mismatches, scope isolation, and causal shift/break sequences.

The shared-types build passes. A broader Master backend run also passed 37 suites and 180 tests with one pre-existing skipped test during this checkpoint; the focused 10/10 run is the direct evidence for this new service.

## Integration blockers and next adapters

1. Master order completion must emit operational order and attribution facts transactionally through an outbox; it must not fabricate payment or settlement.
2. Gallery and Cloud Stripe webhook handlers must emit capture, settlement, refund, dispute/reversal, and provider-idempotency facts from verified webhook events.
3. Commission and adjustment producers need approved versioned policies, explicit approver identity, correction workflow, and separation of duties.
4. Payout producers must require the exact approved evidence set and an authoritative provider/bank receipt.
5. The Mobile shift proxy needs authenticated device identity, strict event validation, durable forwarding, corrections, and offline/replay tests before it may write immutable workforce facts.
6. Cloud synchronization must use a separate outbox/projection so immutable facts are never updated merely to mark sync status.
7. Controlled fixtures, then approved production-like samples, must achieve zero unexplained variance across order, capture, settlement, refund, attribution, commission, adjustment, and payout.

Current legacy sources remain non-authoritative: Management revenue includes every status except `Cancelled`, Cloud Backend payroll is hard-coded mock data, the legacy floating-major-unit ledger route is not mounted, Gallery writes gratuity directly into that legacy table, and the shift proxy accepts a caller-supplied photographer ID and forwards to a placeholder URL.
