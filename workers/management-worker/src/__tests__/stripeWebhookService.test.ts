import { jest } from "@jest/globals";

import { processStripeWebhookEvent } from "../services/stripeWebhookService.js";

function databaseFor(options: { insertChanges?: number; updateChanges?: number; status?: string } = {}) {
  const calls: string[] = [];
  const prepare = jest.fn((sql: string) => {
    calls.push(sql);
    const statement: any = {
      bind: jest.fn(),
      first: jest.fn(),
      run: jest.fn(),
    };
    statement.bind.mockReturnValue(statement);
    statement.run.mockResolvedValue({ meta: { changes: sql.includes("INSERT OR IGNORE")
      ? (options.insertChanges ?? 1)
      : (options.updateChanges ?? 1) } });
    statement.first.mockResolvedValue(
      sql.includes("SELECT status") ? { status: options.status } : null,
    );
    return statement;
  });
  return { DB: { prepare }, calls };
}

describe("Stripe webhook idempotency", () => {
  it("does not fulfill an event already marked completed", async () => {
    const { DB, calls } = databaseFor({ insertChanges: 0, status: "completed" });
    const result = await processStripeWebhookEvent(
      { DB } as any,
      { id: "evt_completed", type: "invoice.paid", data: { object: {} } },
    );

    expect(result).toBe("duplicate");
    expect(calls.some((sql) => sql.includes("status = 'completed'"))).toBe(false);
  });

  it("claims and completes a new event", async () => {
    const { DB, calls } = databaseFor();
    const result = await processStripeWebhookEvent(
      { DB } as any,
      { id: "evt_new", type: "invoice.paid", data: { object: {} } },
    );

    expect(result).toBe("processed");
    expect(calls.some((sql) => sql.includes("status = 'completed'"))).toBe(true);
  });

  it("asks Stripe to retry an event another request is still processing", async () => {
    const { DB } = databaseFor({ insertChanges: 0, updateChanges: 0, status: "processing" });
    const result = await processStripeWebhookEvent(
      { DB } as any,
      { id: "evt_processing", type: "invoice.paid", data: { object: {} } },
    );
    expect(result).toBe("processing");
  });

  it("marks failed fulfillment so Stripe can retry it", async () => {
    const { DB, calls } = databaseFor();
    await expect(processStripeWebhookEvent(
      { DB } as any,
      {
        id: "evt_bad_plan",
        type: "checkout.session.completed",
        data: { object: { mode: "subscription", metadata: { source: "clickflash_management", plan: "attacker" } } },
      },
    )).rejects.toThrow("Unsupported subscription plan");

    expect(calls.some((sql) => sql.includes("status = 'failed'"))).toBe(true);
  });

  it("creates a pending destination without minting a fake hardware license", async () => {
    const { DB, calls } = databaseFor();
    await expect(processStripeWebhookEvent(
      { DB } as any,
      {
        id: "evt_checkout",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            mode: "subscription",
            client_reference_id: "studio_123",
            customer: "cus_123",
            subscription: "sub_123",
            metadata: { source: "clickflash_management", plan: "pro" },
          },
        },
      },
    )).resolves.toBe("processed");

    expect(calls.some((sql) => sql.includes("INSERT OR IGNORE INTO destinations"))).toBe(true);
    expect(calls.some((sql) => sql.includes("INSERT INTO licenses"))).toBe(false);
    expect(calls.some((sql) => sql.includes("machineId"))).toBe(false);
  });
});
