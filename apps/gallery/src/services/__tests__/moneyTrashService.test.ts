import { moneyTrashService } from "../moneyTrashService";

jest.mock("@clickflash/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("moneyTrashService", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
    sessionStorage.clear();
  });

  it("maps the dedicated Worker gallery response without fabricated discounts", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        gallery: {
          id: "gallery-1",
          officeId: "office-1",
          accessCode: "B2B-001",
          purchaseToken: "purchase-token",
          purchaseTokenExpiresAt: "2099-08-01T01:00:00.000Z",
          name: "Summer Event",
          createdAt: "2026-07-01T00:00:00.000Z",
          expiresAt: "2099-08-01T00:00:00.000Z",
          settings: { singlePhotoPrice: 7.5 },
          assets: [
            {
              id: "asset-1",
              title: "photo.jpg",
              url: "https://moneytrash.example/api/gallery-assets/asset-1?signed=1",
              price: 7.5,
              originalPrice: 7.5,
              createdAt: "2026-07-01T00:00:00.000Z",
            },
          ],
        },
      }),
    });

    const result = await moneyTrashService.getArchivedPhotos(" B2B-001 ");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/galleries/B2B-001"),
      expect.any(Object),
    );
    expect(result?.eventName).toBe("Summer Event");
    expect(result?.purchaseToken).toBe("purchase-token");
    expect(result?.singlePhotoPrice).toBe(7.5);
    expect(result?.discountPercentage).toBe(0);
    expect(result?.photos[0]).toMatchObject({
      id: "asset-1",
      albumId: "gallery-1",
      photographerId: "office-1",
      discountPrice: 7.5,
      discountPercentage: 0,
    });
  });

  it("returns null for an unknown access code", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(moneyTrashService.getArchivedPhotos("MISSING")).resolves.toBeNull();
  });

  it("surfaces service failures instead of presenting them as an empty gallery", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    await expect(moneyTrashService.getArchivedPhotos("B2B-001")).rejects.toThrow(
      "Failed to fetch archived photos",
    );
  });

  it("creates a dedicated checkout with only photo identifiers", async () => {
    const sessionId = "11111111-1111-4111-8111-111111111111";
    sessionStorage.setItem("clickflash_moneytrash_checkout", JSON.stringify({
      galleryId: "gallery-1",
      fingerprint: "asset-1|asset-2",
      sessionId,
    }));
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        orderId: "order-1",
        sessionId: "cs_test_1",
        url: "https://checkout.stripe.com/test",
        amount: 15,
        currency: "EUR",
      }),
    });

    await moneyTrashService.createCheckout(
      "purchase-token",
      "gallery-1",
      ["asset-2", "asset-1", "asset-1"],
    );

    const request = fetchMock.mock.calls[0];
    expect(request[0]).toContain("/api/gallery-checkout");
    expect(request[1]?.headers).toMatchObject({ Authorization: "Bearer purchase-token" });
    expect(JSON.parse(String(request[1]?.body))).toEqual({
      items: [{ photoId: "asset-2" }, { photoId: "asset-1" }],
      cartSessionId: sessionId,
    });
  });

  it("checks checkout status with the scoped purchase token", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ orderId: "order-1", status: "paid", paid: true }),
    });

    await expect(
      moneyTrashService.getCheckoutStatus("purchase-token", "cs_test_1"),
    ).resolves.toMatchObject({ paid: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/gallery-checkout/sessions/cs_test_1"),
      { headers: { Authorization: "Bearer purchase-token" } },
    );
  });
});
