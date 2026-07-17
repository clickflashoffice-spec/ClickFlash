import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../index";
import { createGalleryPurchaseToken } from "../../utils/galleryPurchaseToken";
import { handleGalleryCheckoutCreate } from "./create";

const secret = "checkout-handler-secret-with-at-least-32-bytes";
const originalFetch = globalThis.fetch;

describe("MoneyTrash checkout creation", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("uses the canonical D1 price and sends only one Stripe line per photo", async () => {
    const prepared: Array<{ sql: string; args: unknown[] }> = [];
    const batches: Array<Array<{ sql: string; args: unknown[] }>> = [];
    const db = {
      prepare(sql: string) {
        const statement = {
          sql,
          args: [] as unknown[],
          bind(...args: unknown[]) {
            statement.args = args;
            return statement;
          },
          async first() {
            if (sql.includes("FROM galleries g")) {
              return {
                id: "gallery-1",
                office_id: "office-1",
                access_code: "B2B-001",
                name: "Event",
                single_photo_price: 7.5,
              };
            }
            if (sql.includes("FROM orders WHERE gallery_id")) return null;
            return null;
          },
          async all() {
            return {
              results: [
                { id: "asset-1", original_name: "one.jpg" },
                { id: "asset-2", original_name: "two.jpg" },
              ],
            };
          },
          async run() {
            return { success: true };
          },
        };
        prepared.push(statement);
        return statement;
      },
      async batch(statements: Array<{ sql: string; args: unknown[] }>) {
        batches.push(statements);
        return statements.map(() => ({ success: true }));
      },
    };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      id: "cs_test_moneytrash",
      url: "https://checkout.stripe.com/test",
      payment_status: "unpaid",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock as typeof fetch;
    const { token } = await createGalleryPurchaseToken("gallery-1", secret);
    const request = new Request("https://moneytrash.example/api/gallery-checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          { photoId: "asset-1", price: 0.01 },
          { photoId: "asset-2", price: 0.01 },
        ],
        cartSessionId: "11111111-1111-4111-8111-111111111111",
      }),
    });

    const response = await handleGalleryCheckoutCreate(request, {
      DB: db,
      JWT_SECRET: secret,
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      GALLERY_APP_URL: "https://gallery.clickflash.com/gallery/",
    } as unknown as Env);

    expect(response.status).toBe(200);
    const stripeRequest = fetchMock.mock.calls[0];
    const stripeBody = new URLSearchParams(String(stripeRequest[1]?.body));
    expect(stripeBody.get("line_items[0][price_data][unit_amount]")).toBe("750");
    expect(stripeBody.get("line_items[1][price_data][unit_amount]")).toBe("750");
    expect(stripeBody.get("metadata[commerce]")).toBe("moneytrash");
    const orderInsert = batches[0].find((statement) => statement.sql.includes("INSERT INTO orders"));
    expect(orderInsert?.args[3]).toBe(15);
    expect(prepared.some((statement) => statement.sql.includes("stripe_checkout_url"))).toBe(true);
  });

  it("rejects duplicate photos before creating an order", async () => {
    const prepare = vi.fn();
    const { token } = await createGalleryPurchaseToken("gallery-1", secret);
    const request = new Request("https://moneytrash.example/api/gallery-checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ photoId: "asset-1" }, { photoId: "asset-1" }],
        cartSessionId: "11111111-1111-4111-8111-111111111111",
      }),
    });

    const response = await handleGalleryCheckoutCreate(request, {
      DB: { prepare },
      JWT_SECRET: secret,
    } as unknown as Env);

    expect(response.status).toBe(400);
    expect(prepare).not.toHaveBeenCalled();
  });
});
