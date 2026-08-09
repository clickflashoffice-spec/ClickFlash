import { createHash } from "crypto";

import {
  MoneyMinorV1Schema,
  PhotographerEventV1Schema,
  PhotographerReconciliationReadinessV1Schema,
  type PhotographerEventV1,
  type PhotographerReconciliationReadinessV1,
} from "@clickflash/types";

import type { DatabaseManager } from "../database/db";
import type { Logger } from "../utils/logger";

const DEFAULT_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

const REVERSIBLE_EVENT_KINDS = new Set<PhotographerEventV1["payload"]["kind"]>([
  "ORDER_COMPLETED",
  "PAYMENT_CAPTURED",
  "SETTLEMENT_POSTED",
  "REFUND_POSTED",
  "ATTRIBUTION_ASSIGNED",
  "COMMISSION_ACCRUED",
  "ADJUSTMENT_POSTED",
  "PAYOUT_POSTED",
  "SHIFT_STARTED",
  "SHIFT_ENDED",
  "BREAK_STARTED",
  "BREAK_ENDED",
  "RECONCILIATION_APPROVED",
]);

const UNDERLYING_RECONCILIATION_KINDS = new Set<
  PhotographerEventV1["payload"]["kind"]
>([
  "ORDER_COMPLETED",
  "PAYMENT_CAPTURED",
  "SETTLEMENT_POSTED",
  "REFUND_POSTED",
  "ATTRIBUTION_ASSIGNED",
  "COMMISSION_ACCRUED",
  "ADJUSTMENT_POSTED",
]);

type EventLedgerErrorCode =
  | "INVALID_EVENT"
  | "FUTURE_TIMESTAMP"
  | "IDEMPOTENCY_CONFLICT"
  | "REFERENCE_NOT_FOUND"
  | "REFERENCE_SCOPE_MISMATCH"
  | "EVENT_ALREADY_REVERSED"
  | "EVENT_NOT_REVERSIBLE"
  | "INVALID_EVENT_SEQUENCE"
  | "CORRUPT_STORED_EVENT"
  | "INVALID_RECONCILIATION_SCOPE";

export class PhotographerEventLedgerError extends Error {
  public readonly code: EventLedgerErrorCode;

  constructor(code: EventLedgerErrorCode, message: string) {
    super(message);
    this.name = "PhotographerEventLedgerError";
    this.code = code;
  }
}

interface StoredEventRow {
  event_id: string;
  schema_version: "1";
  producer: PhotographerEventV1["producer"];
  producer_event_id: string;
  photographer_id: string;
  desk_id: string;
  tenant_id: string | null;
  timezone: string;
  event_kind: PhotographerEventV1["payload"]["kind"];
  occurred_at: string;
  recorded_at: string;
  source_record_id: string;
  correlation_id: string | null;
  causation_event_id: string | null;
  reversal_of_event_id: string | null;
  payload_json: string;
  event_sha256: string;
}

interface EventWithHash {
  event: PhotographerEventV1;
  eventHash: string;
}

export interface PhotographerEventAppendResult extends EventWithHash {
  deduplicated: boolean;
}

export interface PhotographerReconciliationScope {
  photographerId: string;
  deskId: string;
  tenantId?: string;
  timezone: string;
  periodFrom: string;
  periodToExclusive: string;
  currency: string;
  currencyExponent: number;
}

interface ServiceOptions {
  now?: () => Date;
  maxFutureSkewMs?: number;
}

type ServiceLogger = Pick<Logger, "info" | "warn" | "error">;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function eventHash(event: PhotographerEventV1): string {
  return sha256(canonicalJson(event));
}

function sameTenant(left: string | undefined | null, right: string | undefined | null): boolean {
  return (left ?? null) === (right ?? null);
}

function eventLocalDate(event: PhotographerEventV1): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: event.scope.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(event.occurredAt));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function orderIdOf(event: PhotographerEventV1): string | undefined {
  switch (event.payload.kind) {
    case "ORDER_COMPLETED":
    case "PAYMENT_CAPTURED":
    case "SETTLEMENT_POSTED":
    case "REFUND_POSTED":
    case "ATTRIBUTION_ASSIGNED":
    case "COMMISSION_ACCRUED":
      return event.payload.orderId;
    default:
      return undefined;
  }
}

function moneyOf(event: PhotographerEventV1): Array<{
  currency: string;
  currencyExponent: number;
}> {
  switch (event.payload.kind) {
    case "ORDER_COMPLETED":
      return [event.payload.gross, event.payload.tips];
    case "PAYMENT_CAPTURED":
    case "REFUND_POSTED":
    case "ADJUSTMENT_POSTED":
    case "PAYOUT_POSTED":
      return [event.payload.amount];
    case "SETTLEMENT_POSTED":
      return [
        event.payload.grossAmount,
        event.payload.feeAmount,
        event.payload.netAmount,
      ];
    case "COMMISSION_ACCRUED":
      return [event.payload.basis, event.payload.amount];
    default:
      return [];
  }
}

export class PhotographerEventLedgerService {
  private readonly now: () => Date;
  private readonly maxFutureSkewMs: number;

  constructor(
    private readonly db: DatabaseManager,
    private readonly logger: ServiceLogger,
    options: ServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.maxFutureSkewMs = options.maxFutureSkewMs ?? DEFAULT_MAX_FUTURE_SKEW_MS;
  }

  public append(input: unknown): PhotographerEventAppendResult {
    const parsed = PhotographerEventV1Schema.safeParse(input);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "event"}: ${issue.message}`)
        .join("; ");
      throw new PhotographerEventLedgerError("INVALID_EVENT", details);
    }

    const event = parsed.data;
    const nowMs = this.now().getTime();
    if (
      Date.parse(event.occurredAt) > nowMs + this.maxFutureSkewMs ||
      Date.parse(event.recordedAt) > nowMs + this.maxFutureSkewMs
    ) {
      throw new PhotographerEventLedgerError(
        "FUTURE_TIMESTAMP",
        "Event timestamps exceed the permitted clock skew",
      );
    }

    const hash = eventHash(event);
    const existingByProducer = this.db.get<StoredEventRow>(
      `SELECT * FROM photographer_events_v1
       WHERE producer = ? AND producer_event_id = ?`,
      [event.producer, event.producerEventId],
    );
    if (existingByProducer) {
      return this.resolveIdempotentRetry(existingByProducer, event, hash);
    }

    const existingById = this.db.get<StoredEventRow>(
      "SELECT * FROM photographer_events_v1 WHERE event_id = ?",
      [event.eventId],
    );
    if (existingById) {
      return this.resolveIdempotentRetry(existingById, event, hash);
    }

    const reversalOf =
      event.payload.kind === "REVERSAL_POSTED"
        ? event.payload.reversesEventId
        : null;

    try {
      this.db.transaction(() => {
        let cause: StoredEventRow | undefined;
        if (event.causationEventId) {
          cause = this.requireReference(event.causationEventId);
          this.assertSameScope(event, cause);
        }
        this.assertWorkforceCausation(event, cause);

        if (reversalOf) {
          const original = this.requireReference(reversalOf);
          this.assertSameScope(event, original);
          if (!REVERSIBLE_EVENT_KINDS.has(original.event_kind)) {
            throw new PhotographerEventLedgerError(
              "EVENT_NOT_REVERSIBLE",
              `Event ${reversalOf} cannot be reversed`,
            );
          }
          const existingReversal = this.db.get<{ event_id: string }>(
            `SELECT event_id FROM photographer_events_v1
             WHERE reversal_of_event_id = ?`,
            [reversalOf],
          );
          if (existingReversal) {
            throw new PhotographerEventLedgerError(
              "EVENT_ALREADY_REVERSED",
              `Event ${reversalOf} already has a reversal`,
            );
          }
        }

        this.db.run(
          `INSERT INTO photographer_events_v1 (
             event_id, schema_version, producer, producer_event_id,
             photographer_id, desk_id, tenant_id, timezone, event_kind,
             occurred_at, recorded_at, source_record_id, correlation_id,
             causation_event_id, reversal_of_event_id, payload_json,
             event_sha256
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.eventId,
            event.schemaVersion,
            event.producer,
            event.producerEventId,
            event.photographerId,
            event.scope.deskId,
            event.scope.tenantId ?? null,
            event.scope.timezone,
            event.payload.kind,
            event.occurredAt,
            event.recordedAt,
            event.sourceRecordId,
            event.correlationId ?? null,
            event.causationEventId ?? null,
            reversalOf,
            canonicalJson(event.payload),
            hash,
          ],
        );
      });
    } catch (error) {
      if (error instanceof PhotographerEventLedgerError) {
        throw error;
      }
      const raced = this.db.get<StoredEventRow>(
        `SELECT * FROM photographer_events_v1
         WHERE event_id = ? OR (producer = ? AND producer_event_id = ?)
         LIMIT 1`,
        [event.eventId, event.producer, event.producerEventId],
      );
      if (raced) {
        return this.resolveIdempotentRetry(raced, event, hash);
      }
      throw error;
    }

    this.logger.info("[PhotographerEvents] Appended immutable event", {
      eventId: event.eventId,
      kind: event.payload.kind,
      producer: event.producer,
      photographerId: event.photographerId,
    });
    return { event, eventHash: hash, deduplicated: false };
  }

  public listEvents(scope: {
    photographerId: string;
    deskId: string;
    tenantId?: string;
    timezone: string;
  }): EventWithHash[] {
    const tenantPredicate = scope.tenantId === undefined
      ? "tenant_id IS NULL"
      : "tenant_id = ?";
    const params: unknown[] = [scope.photographerId, scope.deskId, scope.timezone];
    if (scope.tenantId !== undefined) params.push(scope.tenantId);
    const rows = this.db.query<StoredEventRow>(
      `SELECT * FROM photographer_events_v1
       WHERE photographer_id = ? AND desk_id = ? AND timezone = ?
         AND ${tenantPredicate}
       ORDER BY recorded_at ASC, event_id ASC`,
      params,
    );
    return rows.map((row) => this.deserialize(row));
  }

  public assessReconciliation(
    scope: PhotographerReconciliationScope,
  ): PhotographerReconciliationReadinessV1 {
    this.validateReconciliationScope(scope);

    const all = this.listEvents(scope);
    const reversedIds = new Set(
      all
        .filter(({ event }) => event.payload.kind === "REVERSAL_POSTED")
        .map(({ event }) =>
          event.payload.kind === "REVERSAL_POSTED"
            ? event.payload.reversesEventId
            : "",
        ),
    );
    const active = all.filter(({ event }) => !reversedIds.has(event.eventId));
    const inPeriod = (event: PhotographerEventV1) => {
      const date = eventLocalDate(event);
      return date >= scope.periodFrom && date < scope.periodToExclusive;
    };

    const periodOrderIds = new Set(
      active
        .filter(
          ({ event }) =>
            event.payload.kind === "ORDER_COMPLETED" && inPeriod(event),
        )
        .map(({ event }) =>
          event.payload.kind === "ORDER_COMPLETED" ? event.payload.orderId : "",
        ),
    );
    const covered = active.filter(({ event }) => {
      if (!UNDERLYING_RECONCILIATION_KINDS.has(event.payload.kind)) return false;
      const orderId = orderIdOf(event);
      return inPeriod(event) || (orderId !== undefined && periodOrderIds.has(orderId));
    });

    const issues: PhotographerReconciliationReadinessV1["issues"] = [];
    const issueKeys = new Set<string>();
    const addIssue = (
      code: PhotographerReconciliationReadinessV1["issues"][number]["code"],
      event?: PhotographerEventV1,
      orderId?: string,
    ) => {
      const key = `${code}:${event?.eventId ?? ""}:${orderId ?? ""}`;
      if (issueKeys.has(key)) return;
      issueKeys.add(key);
      issues.push({
        code,
        ...(event ? { eventId: event.eventId } : {}),
        ...(orderId ? { orderId } : {}),
      });
    };

    for (const { event } of covered) {
      for (const money of moneyOf(event)) {
        if (
          money.currency !== scope.currency ||
          money.currencyExponent !== scope.currencyExponent
        ) {
          addIssue("CURRENCY_MISMATCH", event, orderIdOf(event));
        }
      }
    }

    const eventsForOrder = (orderId: string, kind: PhotographerEventV1["payload"]["kind"]) =>
      covered.filter(
        ({ event }) => orderIdOf(event) === orderId && event.payload.kind === kind,
      );

    for (const { event } of covered) {
      const orderId = orderIdOf(event);
      if (!orderId) continue;
      const orders = eventsForOrder(orderId, "ORDER_COMPLETED");
      const captures = eventsForOrder(orderId, "PAYMENT_CAPTURED");
      const attributions = eventsForOrder(orderId, "ATTRIBUTION_ASSIGNED");

      if (event.payload.kind !== "ORDER_COMPLETED" && orders.length === 0) {
        addIssue("MISSING_ORDER", event, orderId);
      }
      if (event.payload.kind === "SETTLEMENT_POSTED") {
        const paymentId = event.payload.paymentId;
        const matchingCapture = captures.some(
          ({ event: captureEvent }) =>
            captureEvent.payload.kind === "PAYMENT_CAPTURED" &&
            captureEvent.payload.paymentId === paymentId,
        );
        if (!matchingCapture) addIssue("MISSING_PAYMENT_CAPTURE", event, orderId);
      }
      if (event.payload.kind === "REFUND_POSTED") {
        const paymentId = event.payload.paymentId;
        const matchingCapture = captures.some(
          ({ event: captureEvent }) =>
            captureEvent.payload.kind === "PAYMENT_CAPTURED" &&
            captureEvent.payload.paymentId === paymentId,
        );
        if (!matchingCapture) addIssue("REFUND_WITHOUT_PAYMENT", event, orderId);
      }
      if (event.payload.kind === "COMMISSION_ACCRUED") {
        if (orders.length === 0) addIssue("COMMISSION_WITHOUT_ORDER", event, orderId);
        if (attributions.length === 0) {
          addIssue("COMMISSION_WITHOUT_ATTRIBUTION", event, orderId);
        }
      }
    }

    const coveredOrderIds = new Set(
      covered
        .map(({ event }) => orderIdOf(event))
        .filter((orderId): orderId is string => orderId !== undefined),
    );
    for (const orderId of coveredOrderIds) {
      const orders = eventsForOrder(orderId, "ORDER_COMPLETED");
      const captures = eventsForOrder(orderId, "PAYMENT_CAPTURED");
      const settlements = eventsForOrder(orderId, "SETTLEMENT_POSTED");
      const refunds = eventsForOrder(orderId, "REFUND_POSTED");
      const attributions = eventsForOrder(orderId, "ATTRIBUTION_ASSIGNED");

      if (orders.length > 1) {
        addIssue("DUPLICATE_ORDER_COMPLETION", orders[1].event, orderId);
      }
      if (attributions.length > 1) {
        addIssue("AMBIGUOUS_ATTRIBUTION", attributions[1].event, orderId);
      }
      if (orders.length === 0) continue;

      const orderEvent = orders[0].event;
      if (orderEvent.payload.kind !== "ORDER_COMPLETED") continue;
      if (captures.length === 0) {
        addIssue("MISSING_PAYMENT_CAPTURE", orderEvent, orderId);
      }
      if (attributions.length === 0) {
        addIssue("MISSING_ATTRIBUTION", orderEvent, orderId);
      }

      const expectedCapture = BigInt(orderEvent.payload.gross.amountMinor) +
        BigInt(orderEvent.payload.tips.amountMinor);
      const capturedTotal = captures.reduce((total, { event: captureEvent }) => {
        return captureEvent.payload.kind === "PAYMENT_CAPTURED"
          ? total + BigInt(captureEvent.payload.amount.amountMinor)
          : total;
      }, 0n);
      if (captures.length > 0 && capturedTotal !== expectedCapture) {
        addIssue("PAYMENT_TOTAL_MISMATCH", orderEvent, orderId);
      }

      for (const { event: captureEvent } of captures) {
        if (captureEvent.payload.kind !== "PAYMENT_CAPTURED") continue;
        const paymentId = captureEvent.payload.paymentId;
        const hasSettlement = settlements.some(
          ({ event: settlementEvent }) =>
            settlementEvent.payload.kind === "SETTLEMENT_POSTED" &&
            settlementEvent.payload.paymentId === paymentId,
        );
        if (!hasSettlement) addIssue("MISSING_SETTLEMENT", captureEvent, orderId);
      }

      const settledGrossTotal = settlements.reduce((total, { event: settlementEvent }) => {
        return settlementEvent.payload.kind === "SETTLEMENT_POSTED"
          ? total + BigInt(settlementEvent.payload.grossAmount.amountMinor)
          : total;
      }, 0n);
      if (settlements.length > 0 && settledGrossTotal !== capturedTotal) {
        addIssue("SETTLEMENT_TOTAL_MISMATCH", orderEvent, orderId);
      }

      const refundedTotal = refunds.reduce((total, { event: refundEvent }) => {
        return refundEvent.payload.kind === "REFUND_POSTED"
          ? total + BigInt(refundEvent.payload.amount.amountMinor)
          : total;
      }, 0n);
      if (refundedTotal > capturedTotal) {
        addIssue("REFUND_EXCEEDS_CAPTURE", orderEvent, orderId);
      }
    }

    const setHashes = covered.map(({ eventHash: hash }) => hash).sort();
    const setHash = setHashes.length > 0 ? sha256(setHashes.join("\n")) : null;
    const approvals = active
      .filter(({ event }) => {
        if (event.payload.kind !== "RECONCILIATION_APPROVED") return false;
        return (
          event.payload.periodFrom === scope.periodFrom &&
          event.payload.periodToExclusive === scope.periodToExclusive &&
          event.payload.currency === scope.currency &&
          event.payload.currencyExponent === scope.currencyExponent
        );
      })
      .sort((left, right) => right.event.recordedAt.localeCompare(left.event.recordedAt));
    const matchingApproval = setHash === null
      ? undefined
      : approvals.find(
          ({ event }) =>
            event.payload.kind === "RECONCILIATION_APPROVED" &&
            event.payload.eventSetHash === setHash,
        );

    if (approvals.length > 0 && !matchingApproval) {
      addIssue("STALE_APPROVAL", approvals[0].event);
    }

    const payouts = active.filter(
      ({ event }) =>
        event.payload.kind === "PAYOUT_POSTED" &&
        event.payload.periodFrom === scope.periodFrom &&
        event.payload.periodToExclusive === scope.periodToExclusive,
    );
    for (const { event } of payouts) {
      if (event.payload.kind !== "PAYOUT_POSTED") continue;
      for (const money of moneyOf(event)) {
        if (
          money.currency !== scope.currency ||
          money.currencyExponent !== scope.currencyExponent
        ) {
          addIssue("CURRENCY_MISMATCH", event);
        }
      }
      const approved = matchingApproval?.event.payload.kind === "RECONCILIATION_APPROVED"
        ? matchingApproval.event.payload.reconciliationId === event.payload.reconciliationId
        : false;
      if (!approved) addIssue("PAYOUT_WITHOUT_APPROVAL", event);
    }

    const status: PhotographerReconciliationReadinessV1["status"] =
      issues.length > 0
        ? "BLOCKED"
        : covered.length === 0
          ? "UNAVAILABLE"
          : matchingApproval
            ? "APPROVED"
            : "READY_FOR_REVIEW";

    return PhotographerReconciliationReadinessV1Schema.parse({
      schemaVersion: "1",
      status,
      scope,
      assessedAt: this.now().toISOString(),
      coveredEventCount: covered.length,
      eventSetHash: setHash,
      approvalEventId: matchingApproval?.event.eventId ?? null,
      issues,
    });
  }

  private validateReconciliationScope(scope: PhotographerReconciliationScope): void {
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    const money = MoneyMinorV1Schema.safeParse({
      amountMinor: 0,
      currency: scope.currency,
      currencyExponent: scope.currencyExponent,
    });
    let timezoneValid = true;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: scope.timezone }).format();
    } catch {
      timezoneValid = false;
    }
    if (
      !scope.photographerId ||
      !scope.deskId ||
      !timezoneValid ||
      !isoDate.test(scope.periodFrom) ||
      !isoDate.test(scope.periodToExclusive) ||
      scope.periodFrom >= scope.periodToExclusive ||
      !money.success
    ) {
      throw new PhotographerEventLedgerError(
        "INVALID_RECONCILIATION_SCOPE",
        "Reconciliation scope, period, timezone, or currency is invalid",
      );
    }
  }

  private requireReference(eventId: string): StoredEventRow {
    const row = this.db.get<StoredEventRow>(
      "SELECT * FROM photographer_events_v1 WHERE event_id = ?",
      [eventId],
    );
    if (!row) {
      throw new PhotographerEventLedgerError(
        "REFERENCE_NOT_FOUND",
        `Referenced event ${eventId} does not exist`,
      );
    }
    return row;
  }

  private assertSameScope(event: PhotographerEventV1, row: StoredEventRow): void {
    if (
      event.photographerId !== row.photographer_id ||
      event.scope.deskId !== row.desk_id ||
      event.scope.timezone !== row.timezone ||
      !sameTenant(event.scope.tenantId, row.tenant_id)
    ) {
      throw new PhotographerEventLedgerError(
        "REFERENCE_SCOPE_MISMATCH",
        "Referenced events must remain in the same photographer scope",
      );
    }
  }

  private assertWorkforceCausation(
    event: PhotographerEventV1,
    cause: StoredEventRow | undefined,
  ): void {
    const kind = event.payload.kind;
    if (!new Set(["SHIFT_ENDED", "BREAK_STARTED", "BREAK_ENDED"]).has(kind)) {
      return;
    }
    if (!cause) {
      throw new PhotographerEventLedgerError(
        "INVALID_EVENT_SEQUENCE",
        `${kind} requires a causationEventId`,
      );
    }
    const causeEvent = this.deserialize(cause).event;
    if (kind === "SHIFT_ENDED") {
      if (
        causeEvent.payload.kind !== "SHIFT_STARTED" ||
        causeEvent.payload.shiftId !== event.payload.shiftId
      ) {
        throw new PhotographerEventLedgerError(
          "INVALID_EVENT_SEQUENCE",
          "SHIFT_ENDED must reference its matching SHIFT_STARTED event",
        );
      }
      return;
    }
    if (kind === "BREAK_STARTED") {
      if (
        causeEvent.payload.kind !== "SHIFT_STARTED" ||
        causeEvent.payload.shiftId !== event.payload.shiftId
      ) {
        throw new PhotographerEventLedgerError(
          "INVALID_EVENT_SEQUENCE",
          "BREAK_STARTED must reference its matching SHIFT_STARTED event",
        );
      }
      return;
    }
    if (event.payload.kind !== "BREAK_ENDED") return;
    if (
      causeEvent.payload.kind !== "BREAK_STARTED" ||
      causeEvent.payload.shiftId !== event.payload.shiftId ||
      causeEvent.payload.breakId !== event.payload.breakId
    ) {
      throw new PhotographerEventLedgerError(
        "INVALID_EVENT_SEQUENCE",
        "BREAK_ENDED must reference its matching BREAK_STARTED event",
      );
    }
  }

  private resolveIdempotentRetry(
    row: StoredEventRow,
    event: PhotographerEventV1,
    hash: string,
  ): PhotographerEventAppendResult {
    if (row.event_id !== event.eventId || row.event_sha256 !== hash) {
      this.logger.warn("[PhotographerEvents] Idempotency conflict rejected", {
        producer: event.producer,
        producerEventId: event.producerEventId,
      });
      throw new PhotographerEventLedgerError(
        "IDEMPOTENCY_CONFLICT",
        "Event ID or producer idempotency key is already bound to different content",
      );
    }
    const stored = this.deserialize(row);
    return { ...stored, deduplicated: true };
  }

  private deserialize(row: StoredEventRow): EventWithHash {
    let payload: unknown;
    try {
      payload = JSON.parse(row.payload_json);
    } catch {
      throw new PhotographerEventLedgerError(
        "CORRUPT_STORED_EVENT",
        `Stored event ${row.event_id} has invalid JSON`,
      );
    }
    const candidate = {
      schemaVersion: row.schema_version,
      eventId: row.event_id,
      producer: row.producer,
      producerEventId: row.producer_event_id,
      photographerId: row.photographer_id,
      occurredAt: row.occurred_at,
      recordedAt: row.recorded_at,
      scope: {
        deskId: row.desk_id,
        ...(row.tenant_id === null ? {} : { tenantId: row.tenant_id }),
        timezone: row.timezone,
      },
      sourceRecordId: row.source_record_id,
      ...(row.correlation_id === null ? {} : { correlationId: row.correlation_id }),
      ...(row.causation_event_id === null
        ? {}
        : { causationEventId: row.causation_event_id }),
      payload,
    };
    const parsed = PhotographerEventV1Schema.safeParse(candidate);
    if (
      !parsed.success ||
      parsed.data.payload.kind !== row.event_kind ||
      eventHash(parsed.data) !== row.event_sha256
    ) {
      this.logger.error("[PhotographerEvents] Stored event integrity check failed", {
        eventId: row.event_id,
      });
      throw new PhotographerEventLedgerError(
        "CORRUPT_STORED_EVENT",
        `Stored event ${row.event_id} failed schema or hash verification`,
      );
    }
    return { event: parsed.data, eventHash: row.event_sha256 };
  }
}
