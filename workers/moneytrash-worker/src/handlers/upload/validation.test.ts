import { describe, expect, it } from "vitest";
import {
  MIN_MULTIPART_CHUNK_SIZE,
  UploadValidationError,
  getExpectedChunkSize,
  validateUploadInit,
} from "./validation";

const env = {
  CHUNK_SIZE: String(MIN_MULTIPART_CHUNK_SIZE),
  MAX_UPLOAD_SIZE: String(500 * 1024 * 1024),
};

function validRequest() {
  return {
    fileName: "event-photo.jpg",
    fileSize: MIN_MULTIPART_CHUNK_SIZE + 17,
    totalChunks: 2,
    metadata: {
      event_name: "Summer Event",
      access_code: "b2b-event-01",
      mode: "moneytrash",
      mime_type: "image/jpeg",
      single_photo_price: "7.5",
    },
  };
}

describe("MoneyTrash upload validation", () => {
  it("normalizes a valid upload", () => {
    const result = validateUploadInit(validRequest(), env);
    expect(result.metadata.access_code).toBe("B2B-EVENT-01");
    expect(result.metadata.single_photo_price).toBe("7.50");
    expect(result.limits.chunkSize).toBe(MIN_MULTIPART_CHUNK_SIZE);
  });

  it("accepts the desktop client's camelCase metadata", () => {
    const request = validRequest();
    request.metadata = {
      eventName: "Summer Event",
      accessCode: "b2b-event-01",
      mode: "moneytrash",
      mimeType: "image/jpeg",
      singlePhotoPrice: "7.5",
    } as unknown as typeof request.metadata;
    expect(validateUploadInit(request, env).metadata.event_name).toBe("Summer Event");
  });

  it("rejects a chunk count that does not match the configured part size", () => {
    const request = validRequest();
    request.totalChunks = 3;
    expect(() => validateUploadInit(request, env)).toThrow(/totalChunks must equal 2/);
  });

  it("requires an email for sold backups", () => {
    const request = validRequest();
    request.metadata.mode = "sold";
    expect(() => validateUploadInit(request, env)).toThrow(/customer_email is required/);
  });

  it("rejects executable image formats from public galleries", () => {
    const request = validRequest();
    request.metadata.mime_type = "image/svg+xml";
    expect(() => validateUploadInit(request, env)).toThrow(/raster images only/);
  });

  it("rejects multipart chunk sizes below the R2 minimum", () => {
    try {
      validateUploadInit(validRequest(), { ...env, CHUNK_SIZE: "1048576" });
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(UploadValidationError);
      expect((error as UploadValidationError).status).toBe(503);
    }
  });

  it("calculates the exact final chunk size", () => {
    expect(getExpectedChunkSize(
      MIN_MULTIPART_CHUNK_SIZE + 17,
      MIN_MULTIPART_CHUNK_SIZE,
      1,
    )).toBe(17);
  });
});
