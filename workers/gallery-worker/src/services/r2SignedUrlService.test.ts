import { R2SignedUrlService } from "./r2SignedUrlService.js";

describe("R2SignedUrlService", () => {
  const secret = "test-signed-url-secret";

  it("accepts an untampered short-lived URL", async () => {
    const service = new R2SignedUrlService({ secret, signatureTtlSeconds: 900 });
    const path = await service.generateSignedUrl("album-1/photo-1.jpg", 60);

    await expect(service.validateSignedUrl(`https://gallery.example${path}`)).resolves.toMatchObject({
      valid: true,
      path: "album-1/photo-1.jpg",
    });
  });

  it("rejects path tampering", async () => {
    const service = new R2SignedUrlService({ secret });
    const path = await service.generateSignedUrl("album-1/photo-1.jpg", 60);
    const tampered = path.replace("photo-1.jpg", "photo-2.jpg");

    await expect(service.validateSignedUrl(`https://gallery.example${tampered}`)).resolves.toMatchObject({
      valid: false,
      error: "Invalid signature",
    });
  });

  it("rejects a correctly signed URL beyond the validator maximum TTL", async () => {
    const issuer = new R2SignedUrlService({ secret, signatureTtlSeconds: 900 });
    const validator = new R2SignedUrlService({ secret, signatureTtlSeconds: 30 });
    const path = await issuer.generateSignedUrl("album-1/photo-1.jpg", 120);

    await expect(validator.validateSignedUrl(`https://gallery.example${path}`)).resolves.toMatchObject({
      valid: false,
      error: "URL expiry exceeds maximum validity",
    });
  });
});
