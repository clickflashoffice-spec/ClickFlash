import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGalleryPurchaseToken,
  verifyGalleryPurchaseToken,
} from "./galleryPurchaseToken";

const secret = "purchase-token-secret-with-at-least-32-bytes";

describe("gallery purchase tokens", () => {
  afterEach(() => vi.useRealTimers());

  it("issues a scoped token bound to one gallery", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T10:00:00.000Z"));
    const result = await createGalleryPurchaseToken("gallery-1", secret, 600);
    const claims = await verifyGalleryPurchaseToken(result.token, secret);

    expect(claims).toMatchObject({
      galleryId: "gallery-1",
      scope: "gallery:purchase",
      exp: Math.floor(Date.now() / 1000) + 600,
    });
    expect(result.expiresAt).toBe("2026-07-16T10:10:00.000Z");
  });

  it("rejects a tampered token", async () => {
    const result = await createGalleryPurchaseToken("gallery-1", secret);
    const [payload, signature] = result.token.split(".");
    const tampered = `${payload.slice(0, -1)}A.${signature}`;
    await expect(verifyGalleryPurchaseToken(tampered, secret)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const result = await createGalleryPurchaseToken("gallery-1", secret, -1);
    await expect(verifyGalleryPurchaseToken(result.token, secret)).rejects.toThrow(
      "Expired or invalid purchase token",
    );
  });
});
