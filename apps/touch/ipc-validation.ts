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
