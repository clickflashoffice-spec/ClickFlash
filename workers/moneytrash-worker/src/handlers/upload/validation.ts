import type { UploadInitRequest } from "./init";

export const MIN_MULTIPART_CHUNK_SIZE = 5 * 1024 * 1024;
export const MAX_MULTIPART_PARTS = 10_000;
export const DEFAULT_MAX_UPLOAD_SIZE = 500 * 1024 * 1024;
const PUBLIC_GALLERY_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface UploadLimits {
  chunkSize: number;
  maxUploadSize: number;
}

export interface ValidatedUploadInit {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  metadata: UploadInitRequest["metadata"];
  limits: UploadLimits;
}

export class UploadValidationError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readPrice(value: unknown, fieldName: string): string | undefined {
  const raw = readOptionalString(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100_000) {
    throw new UploadValidationError(`${fieldName} must be between 0 and 100000`);
  }
  return parsed.toFixed(2);
}

export function getUploadLimits(env: {
  CHUNK_SIZE?: string;
  MAX_UPLOAD_SIZE?: string;
}): UploadLimits {
  const chunkSize = readPositiveInteger(env.CHUNK_SIZE, MIN_MULTIPART_CHUNK_SIZE);
  if (chunkSize < MIN_MULTIPART_CHUNK_SIZE) {
    throw new UploadValidationError(
      "CHUNK_SIZE must be at least 5 MiB for R2 multipart uploads",
      503,
    );
  }

  return {
    chunkSize,
    maxUploadSize: readPositiveInteger(
      env.MAX_UPLOAD_SIZE,
      DEFAULT_MAX_UPLOAD_SIZE,
    ),
  };
}

export function validateUploadInit(
  body: unknown,
  env: { CHUNK_SIZE?: string; MAX_UPLOAD_SIZE?: string },
): ValidatedUploadInit {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new UploadValidationError("Invalid upload request");
  }

  const input = body as Record<string, unknown>;
  const metadataInput = input.metadata;
  if (!metadataInput || typeof metadataInput !== "object" || Array.isArray(metadataInput)) {
    throw new UploadValidationError("Upload metadata is required");
  }

  const metadata = metadataInput as Record<string, unknown>;
  const fileName = readOptionalString(input.fileName);
  const fileSize = Number(input.fileSize);
  const totalChunks = Number(input.totalChunks);
  const limits = getUploadLimits(env);

  if (!fileName || fileName.length > 255) {
    throw new UploadValidationError("fileName must be between 1 and 255 characters");
  }
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) {
    throw new UploadValidationError("fileSize must be a positive integer");
  }
  if (fileSize > limits.maxUploadSize) {
    throw new UploadValidationError("File too large", 413);
  }
  if (
    !Number.isSafeInteger(totalChunks) ||
    totalChunks <= 0 ||
    totalChunks > MAX_MULTIPART_PARTS
  ) {
    throw new UploadValidationError("totalChunks is invalid");
  }

  const expectedChunks = Math.ceil(fileSize / limits.chunkSize);
  if (totalChunks !== expectedChunks) {
    throw new UploadValidationError(
      `totalChunks must equal ${expectedChunks} for the configured chunk size`,
    );
  }

  const eventName = readOptionalString(metadata.event_name ?? metadata.eventName);
  const accessCode = readOptionalString(metadata.access_code ?? metadata.accessCode)?.toUpperCase();
  const mode = readOptionalString(metadata.mode);
  const mimeType = readOptionalString(metadata.mime_type ?? metadata.mimeType)?.toLowerCase();
  const customerEmail = readOptionalString(
    metadata.customer_email ?? metadata.customerEmail,
  )?.toLowerCase();

  if (!eventName || eventName.length > 120) {
    throw new UploadValidationError("event_name must be between 1 and 120 characters");
  }
  if (!accessCode || !/^[A-Z0-9_-]{4,64}$/.test(accessCode)) {
    throw new UploadValidationError("access_code must contain 4-64 letters, numbers, _ or -");
  }
  if (mode !== "moneytrash" && mode !== "sold") {
    throw new UploadValidationError("mode must be moneytrash or sold");
  }
  if (!mimeType || (mode === "moneytrash" && !PUBLIC_GALLERY_MIME_TYPES.has(mimeType))) {
    throw new UploadValidationError("MoneyTrash galleries accept supported raster images only");
  }
  if (mimeType.length > 100) {
    throw new UploadValidationError("mime_type is too long");
  }
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    throw new UploadValidationError("customer_email is invalid");
  }
  if (mode === "sold" && !customerEmail) {
    throw new UploadValidationError("customer_email is required for sold backups");
  }

  return {
    fileName,
    fileSize,
    totalChunks,
    limits,
    metadata: {
      event_name: eventName,
      access_code: accessCode,
      mode,
      mime_type: mimeType,
      customer_email: customerEmail,
      single_photo_price: readPrice(
        metadata.single_photo_price ?? metadata.singlePhotoPrice,
        "single_photo_price",
      ),
      full_gallery_price: readPrice(
        metadata.full_gallery_price ?? metadata.fullGalleryPrice,
        "full_gallery_price",
      ),
    },
  };
}

export function getExpectedChunkSize(
  fileSize: number,
  chunkSize: number,
  chunkIndex: number,
): number {
  return Math.min(chunkSize, fileSize - chunkIndex * chunkSize);
}
