import { afterEach, describe, expect, it, vi } from "vitest";
import {
  signGalleryAssetUrl,
  verifyGalleryAssetSignature,
} from "./galleryAssetSignature";

const secret = "gallery-signing-secret-with-at-least-32-bytes";

describe("gallery asset signatures", () => {
  afterEach(() => vi.useRealTimers());

  it("accepts an unexpired signature bound to the asset", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T10:00:00.000Z"));
    const expires = Math.floor(Date.now() / 1000) + 300;
    const signature = await signGalleryAssetUrl("asset-1", expires, secret);
    await expect(
      verifyGalleryAssetSignature("asset-1", expires, signature, secret),
    ).resolves.toBe(true);
  });

  it("rejects a signature used for another asset", async () => {
    const expires = Math.floor(Date.now() / 1000) + 300;
    const signature = await signGalleryAssetUrl("asset-1", expires, secret);
    await expect(
      verifyGalleryAssetSignature("asset-2", expires, signature, secret),
    ).resolves.toBe(false);
  });

  it("rejects expired links", async () => {
    const expires = Math.floor(Date.now() / 1000) - 1;
    const signature = await signGalleryAssetUrl("asset-1", expires, secret);
    await expect(
      verifyGalleryAssetSignature("asset-1", expires, signature, secret),
    ).resolves.toBe(false);
  });
});
