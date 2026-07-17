import { afterEach, describe, expect, it, vi } from "vitest";
import { signPurchaseDownload, verifyPurchaseDownload } from "./purchaseDownloadSignature";

const secret = "purchase-download-secret-with-at-least-32-bytes";

describe("purchase download signatures", () => {
  afterEach(() => vi.useRealTimers());

  it("binds a live signature to the exact order and asset", async () => {
    const expires = Math.floor(Date.now() / 1000) + 300;
    const signature = await signPurchaseDownload("order-1", "asset-1", expires, secret);
    await expect(verifyPurchaseDownload("order-1", "asset-1", expires, signature, secret)).resolves.toBe(true);
    await expect(verifyPurchaseDownload("order-2", "asset-1", expires, signature, secret)).resolves.toBe(false);
    await expect(verifyPurchaseDownload("order-1", "asset-2", expires, signature, secret)).resolves.toBe(false);
  });

  it("rejects expired signatures", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T10:00:00.000Z"));
    const expires = Math.floor(Date.now() / 1000) + 1;
    const signature = await signPurchaseDownload("order-1", "asset-1", expires, secret);
    vi.setSystemTime(new Date("2026-07-16T10:00:02.000Z"));
    await expect(verifyPurchaseDownload("order-1", "asset-1", expires, signature, secret)).resolves.toBe(false);
  });
});
