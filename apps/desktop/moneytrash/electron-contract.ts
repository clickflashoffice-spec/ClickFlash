import { z } from "zod";

export const MAX_FILE_SIZE = 500 * 1024 * 1024;
export const CHUNK_SIZE = 5 * 1024 * 1024;
export const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".heic", ".webp", ".gif", ".raw", ".cr2", ".nef", ".arw",
]);

const text = (max: number) => z.string().trim().min(1).max(max)
  .refine((value) => !value.includes("\0"), "NUL characters are not allowed");
const optionalText = (max: number) => text(max).nullish().transform((value) => value || undefined);
export const sessionIdSchema = z.string().trim().min(1).max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Session ID contains invalid characters");

export const filePathSchema = text(32_767);
export const fileInfoSchema = z.object({
  name: text(255),
  path: filePathSchema,
  size: z.number().int().nonnegative().max(MAX_FILE_SIZE),
  mimeType: optionalText(100),
  previewUrl: z.string().url().optional(),
}).strict();

export const uploadMetadataSchema = z.object({
  eventName: text(200),
  accessCode: text(128),
  mode: z.enum(["moneytrash", "sold"]),
  mimeType: optionalText(100),
  deskId: optionalText(128),
  customerEmail: z.string().trim().email().max(320).nullish().transform((value) => value || undefined),
  singlePhotoPrice: optionalText(32),
  fullGalleryPrice: optionalText(32),
}).strict();

export const uploadConfigSchema = z.object({
  eventName: z.string().trim().max(200).default(""),
  accessCode: z.string().trim().max(128).default(""),
  mode: z.enum(["moneytrash", "sold"]).default("moneytrash"),
  customerEmail: z.string().trim().email().max(320).nullish().transform((value) => value || undefined),
  singlePhotoPrice: optionalText(32),
  fullGalleryPrice: optionalText(32),
  apiUrl: z.string().url().max(2048),
  deskId: optionalText(128),
  apiKey: optionalText(4096),
  s3AccessKey: optionalText(4096),
  s3SecretKey: optionalText(4096),
  s3Region: optionalText(100),
  s3Bucket: optionalText(255),
  s3Endpoint: z.string().url().max(2048).nullish().transform((value) => value || undefined),
}).strict();

export const uploadHistoryItemSchema = z.object({
  id: text(128),
  eventName: text(200),
  accessCode: text(128),
  fileCount: z.number().int().nonnegative().max(100_000),
  timestamp: z.string().datetime({ offset: true }),
  mode: z.enum(["moneytrash", "sold"]),
}).strict();
export const uploadHistorySchema = z.array(uploadHistoryItemSchema).max(5_000);

export const notificationSchema = z.object({
  title: text(100),
  body: text(500),
}).strict();

export const analyticsRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  apiUrl: z.string().url().max(2048).optional(),
}).strict().refine((value) => value.startDate <= value.endDate, {
  message: "Analytics start date must not be after end date",
});

export const brisqueRequestSchema = z.object({
  filePath: filePathSchema,
}).strict();

export const nativeUploadSchema = z.object({
  sessionId: sessionIdSchema.optional(),
  filePath: filePathSchema,
  apiUrl: z.string().url().max(2048).optional(),
  metadata: uploadMetadataSchema,
}).strict();

export const chunkUploadSchema = z.object({
  sessionId: sessionIdSchema,
  chunkIndex: z.number().int().nonnegative(),
  totalChunks: z.number().int().positive().max(100_000),
  chunkData: z.union([
    z.instanceof(Uint8Array).refine((value) => value.byteLength <= CHUNK_SIZE, "Chunk exceeds the 5 MiB limit"),
    z.array(z.number().int().min(0).max(255)).max(CHUNK_SIZE),
  ]),
  fileName: text(255),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE),
  metadata: uploadMetadataSchema,
}).strict();

export type FileInfo = z.infer<typeof fileInfoSchema>;
export type UploadConfig = z.infer<typeof uploadConfigSchema>;
export type UploadHistoryItem = z.infer<typeof uploadHistoryItemSchema>;
export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;
export type NativeUploadRequest = z.infer<typeof nativeUploadSchema>;
export type ChunkUploadRequest = z.infer<typeof chunkUploadSchema>;

export interface UploadProgress {
  sessionId: string;
  chunksReceived: number;
  totalChunks: number;
  percentage: number;
  bytesUploaded?: number;
  totalBytes?: number;
  status: "uploading" | "completed" | "cancelled" | "failed";
}

export interface UploadResult {
  success: true;
  sessionId: string;
  fileName: string;
  fileSize: number;
  url?: string;
}
