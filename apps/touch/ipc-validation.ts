import { z } from "zod";

const boundedSecretSchema = z.string()
  .min(1)
  .max(128)
  .refine((value) => !value.includes("\0"), { message: "NUL characters are not allowed" });

const printOptionsSchema = z.object({
  printer: z.string().trim().min(1).max(512),
  silent: z.boolean().optional().default(true),
}).strict();

export interface TouchPrintOptions {
  printer: string;
  silent: boolean;
}

export function parseKioskPassword(value: unknown): string {
  return boundedSecretSchema.parse(value);
}

export function parseKioskPin(value: unknown): string {
  return boundedSecretSchema.parse(value);
}

export function parsePrintOptions(value: unknown): TouchPrintOptions {
  return printOptionsSchema.parse(value);
}

export const CameraPtpPayloadSchema = z.object({
  command: z.string().min(1).max(255),
  args: z.array(z.string().max(255)).optional(),
  timeout: z.number().min(0).max(60000).optional()
}).strict();

export const SerialPortPayloadSchema = z.object({
  portPath: z.string().min(1).max(1024),
  baudRate: z.number().int().positive().optional(),
  data: z.union([z.string().max(10240), z.instanceof(Uint8Array)])
}).strict();

export const RfidPayloadSchema = z.object({
  tagId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  readerId: z.string().min(1).max(128).optional(),
  timestamp: z.number().positive().optional()
}).strict();

export type CameraPtpPayload = z.infer<typeof CameraPtpPayloadSchema>;
export type SerialPortPayload = z.infer<typeof SerialPortPayloadSchema>;
export type RfidPayload = z.infer<typeof RfidPayloadSchema>;
