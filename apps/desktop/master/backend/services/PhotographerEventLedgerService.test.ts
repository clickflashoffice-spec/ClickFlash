import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from "fs";
import path from "path";

import type { PhotographerEventV1 } from "@clickflash/types";
import Database from "better-sqlite3-multiple-ciphers";

import type { DatabaseManager } from "../database/db";
import {
  PhotographerEventLedgerError,
  PhotographerEventLedgerService,
} from "./PhotographerEventLedgerService";

const NOW = new Date("2026-08-03T12:00:00.000Z");
const TND = { currency: "TND", currencyExponent: 3 } as const;

describe("PhotographerEventLedgerService", () => {
  let database: Database.Database;
  let service: PhotographerEventLedgerService;
  let sequence = 1;

  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    database = new Database(":memory:");
    database.pragma("foreign_keys = ON");
    database.exec(
      fs.readFileSync(
        path.join(
          __dirname,
          "..",
          "database",
          "migrations",
          "070_photographer_event_ledger.sql",
        ),
        "utf8",
      ),
    );
    const dbManager = {
      get: (sql: string, params: unknown[] = []) =>
        database.prepare(sql).get(...params),
      query: (sql: string, params: unknown[] = []) =>
        database.prepare(sql).all(...params),
      run: (sql: string, params: unknown[] = []) =>
        database.prepare(sql).run(...params),
      transaction: <T>(fn: () => T) => database.transaction(fn)(),
    } as unknown as DatabaseManager;
    service = new PhotographerEventLedgerService(dbManager, logger as never, {
      now: () => NOW,
    });
    sequence = 1;
    vi.clearAllMocks();
  });

  afterEach(() => database.close());

  function uuid(index = sequence++): string {
    return `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
  }

  function event(
    payload: PhotographerEventV1["payload"],
    overrides: Partial<PhotographerEventV1> = {},
  ): PhotographerEventV1 {
    const eventId = overrides.eventId ?? uuid();
    return {
      schemaVersion: "1",
      eventId,
      producer: "MASTER",
      producerEventId: `producer:${eventId}`,
      photographerId: "photographer-1",
      occurredAt: "2026-08-03T09:00:00.000Z",
      recordedAt: "2026-08-03T09:01:00.000Z",
      scope: {
        deskId: "desk-tunis-1",
        tenantId: "tenant-1",
        timezone: "Africa/Tunis",
      },
      sourceRecordId: `source:${eventId}`,
      payload,
      ...overrides,
    } as PhotographerEventV1;
  }

  function order(orderId = "order-1"): PhotographerEventV1 {
    return event({
      kind: "ORDER_COMPLETED",
      orderId,
      gross: { amountMinor: 120_000, ...TND },
      tips: { amountMinor: 5_000, ...TND },
      photoCount: 12,
    });
  }

  function capture(orderId = "order-1"): PhotographerEventV1 {
    return event({
      kind: "PAYMENT_CAPTURED",
      orderId,
      paymentId: `payment-${orderId}`,
      amount: { amountMinor: 125_000, ...TND },
      method: "STRIPE",
    });
  }

  function attribution(orderId = "order-1"): PhotographerEventV1 {
    return event({
      kind: "ATTRIBUTION_ASSIGNED",
      orderId,
      method: "DIRECT_CAPTURE",
      confidenceBps: 10_000,
    });
  }

  function settlement(orderId = "order-1"): PhotographerEventV1 {
    return event({
      kind: "SETTLEMENT_POSTED",
      orderId,
      paymentId: `payment-${orderId}`,
      settlementId: `settlement-${orderId}`,
      grossAmount: { amountMinor: 125_000, ...TND },
      feeAmount: { amountMinor: 5_000, ...TND },
      netAmount: { amountMinor: 120_000, ...TND },
    });
  }

  const reconciliationScope = {
    photographerId: "photographer-1",
    deskId: "desk-tunis-1",
    tenantId: "tenant-1",
    timezone: "Africa/Tunis",
    periodFrom: "2026-08-03",
    periodToExclusive: "2026-08-04",
    currency: "TND",
    currencyExponent: 3,
  } as const;

  it("appends exact retries idempotently and enforces append-only storage", () => {
    const original = order();
    const first = service.append(original);
    const retry = service.append(original);

    expect(first.deduplicated).toBe(false);
    expect(retry.deduplicated).toBe(true);
    expect(retry.eventHash).toBe(first.eventHash);
    expect(database.prepare("SELECT COUNT(*) AS count FROM photographer_events_v1").get())
      .toEqual({ count: 1 });

    expect(() =>
      database
        .prepare("UPDATE photographer_events_v1 SET source_record_id = ? WHERE event_id = ?")
        .run("tampered", original.eventId),
    ).toThrow("photographer_events_v1 is append-only");
    expect(() =>
      database.prepare("DELETE FROM photographer_events_v1 WHERE event_id = ?").run(original.eventId),
    ).toThrow("photographer_events_v1 is append-only");
  });

  it("rejects idempotency conflicts, future timestamps, and wrong currency scale", () => {
    const original = order();
    service.append(original);

    const altered = {
      ...original,
      sourceRecordId: "different-source",
    };
    expect(() => service.append(altered)).toThrow(
      expect.objectContaining({ code: "IDEMPOTENCY_CONFLICT" }),
    );

    const future = order("order-future");
    future.occurredAt = "2026-08-03T12:06:00.001Z";
    future.recordedAt = future.occurredAt;
    expect(() => service.append(future)).toThrow(
      expect.objectContaining({ code: "FUTURE_TIMESTAMP" }),
    );

    const wrongScale = order("order-wrong-scale");
    if (wrongScale.payload.kind === "ORDER_COMPLETED") {
      wrongScale.payload.gross.currencyExponent = 2;
      wrongScale.payload.tips.currencyExponent = 2;
    }
    expect(() => service.append(wrongScale)).toThrow(
      expect.objectContaining({ code: "INVALID_EVENT" }),
    );
  });

  it("requires same-scope references and permits only one explicit reversal", () => {
    const original = order();
    service.append(original);

    const crossScope = event(
      {
        kind: "REVERSAL_POSTED",
        reversesEventId: original.eventId,
        reasonCode: "WRONG_PHOTOGRAPHER",
        approvedById: "admin-1",
      },
      { photographerId: "photographer-2" },
    );
    expect(() => service.append(crossScope)).toThrow(
      expect.objectContaining({ code: "REFERENCE_SCOPE_MISMATCH" }),
    );

    const reversal = event({
      kind: "REVERSAL_POSTED",
      reversesEventId: original.eventId,
      reasonCode: "DUPLICATE_ORDER",
      approvedById: "admin-1",
    });
    service.append(reversal);

    const duplicateReversal = event({
      kind: "REVERSAL_POSTED",
      reversesEventId: original.eventId,
      reasonCode: "SECOND_ATTEMPT",
      approvedById: "admin-1",
    });
    expect(() => service.append(duplicateReversal)).toThrow(
      expect.objectContaining({ code: "EVENT_ALREADY_REVERSED" }),
    );
  });

  it("moves from blocked to reviewable to approved and invalidates stale approval", () => {
    service.append(order());

    const blocked = service.assessReconciliation(reconciliationScope);
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["MISSING_PAYMENT_CAPTURE", "MISSING_ATTRIBUTION"]),
    );

    service.append(capture());
    service.append(attribution());
    const awaitingSettlement = service.assessReconciliation(reconciliationScope);
    expect(awaitingSettlement.status).toBe("BLOCKED");
    expect(awaitingSettlement.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_SETTLEMENT" }),
      ]),
    );
    service.append(settlement());
    const reviewable = service.assessReconciliation(reconciliationScope);
    expect(reviewable.status).toBe("READY_FOR_REVIEW");
    expect(reviewable.eventSetHash).toMatch(/^[a-f0-9]{64}$/);

    const approval = event({
      kind: "RECONCILIATION_APPROVED",
      reconciliationId: "reconciliation-1",
      periodFrom: reconciliationScope.periodFrom,
      periodToExclusive: reconciliationScope.periodToExclusive,
      currency: "TND",
      currencyExponent: 3,
      eventSetHash: reviewable.eventSetHash!,
      approvedById: "finance-admin-1",
      approvedAt: "2026-08-03T10:00:00.000Z",
    });
    service.append(approval);
    const approved = service.assessReconciliation(reconciliationScope);
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvalEventId).toBe(approval.eventId);

    service.append(event({
      kind: "REFUND_POSTED",
      orderId: "order-1",
      paymentId: "payment-order-1",
      refundId: "refund-1",
      amount: { amountMinor: 10_000, ...TND },
      reasonCode: "CUSTOMER_REQUEST",
    }));
    const stale = service.assessReconciliation(reconciliationScope);
    expect(stale.status).toBe("BLOCKED");
    expect(stale.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "STALE_APPROVAL" })]),
    );
  });

  it("blocks payout facts until the exact evidence set is approved", () => {
    service.append(order());
    service.append(capture());
    service.append(attribution());
    service.append(settlement());
    service.append(event({
      kind: "PAYOUT_POSTED",
      payoutId: "payout-1",
      reconciliationId: "reconciliation-missing",
      amount: { amountMinor: 20_000, ...TND },
      periodFrom: reconciliationScope.periodFrom,
      periodToExclusive: reconciliationScope.periodToExclusive,
    }));

    const readiness = service.assessReconciliation(reconciliationScope);
    expect(readiness.status).toBe("BLOCKED");
    expect(readiness.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PAYOUT_WITHOUT_APPROVAL" }),
      ]),
    );
  });

  it("blocks monetary totals that do not reconcile", () => {
    service.append(order());
    const partialCapture = capture();
    if (partialCapture.payload.kind === "PAYMENT_CAPTURED") {
      partialCapture.payload.amount.amountMinor = 100_000;
    }
    service.append(partialCapture);
    service.append(attribution());
    const partialSettlement = settlement();
    if (partialSettlement.payload.kind === "SETTLEMENT_POSTED") {
      partialSettlement.payload.grossAmount.amountMinor = 100_000;
      partialSettlement.payload.feeAmount.amountMinor = 5_000;
      partialSettlement.payload.netAmount.amountMinor = 95_000;
    }
    service.append(partialSettlement);
    service.append(event({
      kind: "REFUND_POSTED",
      orderId: "order-1",
      paymentId: "payment-order-1",
      refundId: "refund-too-large",
      amount: { amountMinor: 110_000, ...TND },
      reasonCode: "DATA_ERROR",
    }));

    const readiness = service.assessReconciliation(reconciliationScope);
    expect(readiness.status).toBe("BLOCKED");
    expect(readiness.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "PAYMENT_TOTAL_MISMATCH",
        "REFUND_EXCEEDS_CAPTURE",
      ]),
    );
  });

  it("blocks an orphan payout even when no underlying evidence is available", () => {
    service.append(event({
      kind: "PAYOUT_POSTED",
      payoutId: "orphan-payout",
      reconciliationId: "missing-reconciliation",
      amount: { amountMinor: 20_000, ...TND },
      periodFrom: reconciliationScope.periodFrom,
      periodToExclusive: reconciliationScope.periodToExclusive,
    }));

    const readiness = service.assessReconciliation(reconciliationScope);
    expect(readiness.status).toBe("BLOCKED");
    expect(readiness.coveredEventCount).toBe(0);
    expect(readiness.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PAYOUT_WITHOUT_APPROVAL" }),
      ]),
    );
  });

  it("keeps financial readiness isolated by photographer scope", () => {
    service.append(event({
      kind: "SHIFT_STARTED",
      shiftId: "shift-1",
      stationId: "mobile-1",
      verification: "BIOMETRIC",
    }));
    expect(service.assessReconciliation(reconciliationScope).status).toBe("UNAVAILABLE");

    service.append(order());
    expect(service.assessReconciliation({
      ...reconciliationScope,
      photographerId: "photographer-2",
    }).status).toBe("UNAVAILABLE");
  });

  it("requires causal shift and break sequences", () => {
    const orphanEnd = event({
      kind: "SHIFT_ENDED",
      shiftId: "shift-1",
      stationId: "mobile-1",
      verification: "BIOMETRIC",
    });
    expect(() => service.append(orphanEnd)).toThrow(
      expect.objectContaining({ code: "INVALID_EVENT_SEQUENCE" }),
    );

    const shiftStart = event({
      kind: "SHIFT_STARTED",
      shiftId: "shift-1",
      stationId: "mobile-1",
      verification: "BIOMETRIC",
    });
    service.append(shiftStart);
    const breakStart = event(
      { kind: "BREAK_STARTED", shiftId: "shift-1", breakId: "break-1" },
      { causationEventId: shiftStart.eventId },
    );
    service.append(breakStart);
    service.append(event(
      { kind: "BREAK_ENDED", shiftId: "shift-1", breakId: "break-1" },
      { causationEventId: breakStart.eventId },
    ));
    service.append(event(
      {
        kind: "SHIFT_ENDED",
        shiftId: "shift-1",
        stationId: "mobile-1",
        verification: "BIOMETRIC",
      },
      { causationEventId: shiftStart.eventId },
    ));

    expect(service.listEvents(reconciliationScope)).toHaveLength(4);
  });

  it("exposes stable domain error codes", () => {
    expect(
      new PhotographerEventLedgerError("INVALID_EVENT", "invalid"),
    ).toMatchObject({ name: "PhotographerEventLedgerError", code: "INVALID_EVENT" });
  });
});
