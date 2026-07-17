import {
  canOrderDownloadPhoto,
  canOrderViewPhoto,
  getPhotoStorageKey,
  generateCustomerAccessPin,
  isCustomerToken,
  isStaffToken,
  isValidCartSessionId,
  isValidStripeCheckoutSessionId,
  parseOrderItems,
  toCustomerOrder,
  updateOrderPhotoProofingStatus,
} from "./customerAccessService.js";

describe("customerAccessService", () => {
  it("recognizes staff and customer token scopes", () => {
    expect(isStaffToken({ role: "admin" })).toBe(true);
    expect(isStaffToken({ role: "customer" })).toBe(false);
    expect(isCustomerToken({ role: "customer", orderId: "order-1" })).toBe(true);
    expect(isCustomerToken({ role: "photographer" })).toBe(false);
  });

  it("parses order items without accepting malformed JSON", () => {
    expect(parseOrderItems('[{"photoId":"photo-1"}]')).toEqual([{ photoId: "photo-1" }]);
    expect(parseOrderItems("not-json")).toEqual([]);
  });

  it("generates six-digit customer access PINs", () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generateCustomerAccessPin()).toMatch(/^[1-9]\d{5}$/);
    }
  });

  it("accepts only well-formed cart and Stripe session identifiers", () => {
    expect(isValidCartSessionId("2f1c734f-504e-4a4d-a60f-0c06f10d4482")).toBe(true);
    expect(isValidCartSessionId("session_guessable")).toBe(false);
    expect(isValidStripeCheckoutSessionId("cs_test_a1B2c3D4e5F6")).toBe(true);
    expect(isValidStripeCheckoutSessionId("../orders")).toBe(false);
  });

  it("updates proofing only for a photo referenced by the order", () => {
    const result = updateOrderPhotoProofingStatus(
      [{ id: "item-1", photoId: "photo-1", photo: { id: "photo-1", title: "Portrait" } }],
      "photo-1",
      "approved",
    );

    expect(result.found).toBe(true);
    expect(result.items[0]).toEqual(expect.objectContaining({
      photo: expect.objectContaining({ id: "photo-1", proofingStatus: "approved" }),
    }));
    expect(updateOrderPhotoProofingStatus(result.items, "photo-2", "rejected").found).toBe(false);
  });

  it("removes private order credentials from customer responses", () => {
    const result = toCustomerOrder({
      id: "order-1",
      access_pin: "123456",
      magic_link_token: "secret-link",
      items: JSON.stringify([{
        id: "item-1",
        photo: {
          id: "photo-1",
          albumId: "album-1",
          url: "/api/files/album-1/photo-1.jpg",
          thumbnailUrl: "/api/files/album-1/thumbs/photo-1_thumb.jpg",
          originalUrl: "private-original.jpg",
          storagePath: "private-storage-key.jpg",
        },
      }]),
    });

    expect(result).not.toHaveProperty("access_pin");
    expect(result).not.toHaveProperty("magic_link_token");
    expect(result.items).toEqual([
      expect.objectContaining({
        photo: expect.objectContaining({
          url: "/api/files/album-1/thumbs/photo-1_thumb.jpg",
        }),
      }),
    ]);
    expect(JSON.stringify(result.items)).not.toContain("private-original.jpg");
    expect(JSON.stringify(result.items)).not.toContain("private-storage-key.jpg");
  });

  it("grants a paid order only its explicitly purchased photo", () => {
    const order = { id: "order-1", status: "paid", items: [{ photoId: "photo-1" }] };

    expect(canOrderDownloadPhoto(order, { id: "photo-1", albumId: "album-1" })).toBe(true);
    expect(canOrderDownloadPhoto(order, { id: "photo-2", albumId: "album-1" })).toBe(false);
  });

  it("limits previews to the authenticated order album or listed photos", () => {
    expect(
      canOrderViewPhoto(
        { id: "order-1", albumId: "album-1", status: "Pending", items: [] },
        { id: "photo-1", albumId: "album-1" },
      ),
    ).toBe(true);
    expect(
      canOrderViewPhoto(
        { id: "order-1", albumId: "album-1", status: "Pending", items: [] },
        { id: "photo-2", albumId: "album-2" },
      ),
    ).toBe(false);
  });

  it("grants a paid full-album package only within that album", () => {
    const order = {
      id: "order-1",
      status: "Completed",
      albumId: "album-1",
      items: [{ productId: "album_full" }],
    };

    expect(canOrderDownloadPhoto(order, { id: "photo-1", albumId: "album-1" })).toBe(true);
    expect(canOrderDownloadPhoto(order, { id: "photo-2", albumId: "album-2" })).toBe(false);
  });

  it("denies unpaid orders and unsafe storage keys", () => {
    expect(
      canOrderDownloadPhoto(
        { id: "order-1", status: "Pending", items: [{ photoId: "photo-1" }] },
        { id: "photo-1" },
      ),
    ).toBe(false);
    expect(getPhotoStorageKey({ id: "photo-1", storagePath: "/api/files/album/photo.jpg" })).toBe("album/photo.jpg");
    expect(getPhotoStorageKey({ id: "photo-1", storagePath: "../private.pem" })).toBeNull();
    expect(getPhotoStorageKey({ id: "photo-1", url: "https://example.com/photo.jpg" })).toBeNull();
  });
});
