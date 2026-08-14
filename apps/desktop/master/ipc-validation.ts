import { z } from "zod";

const safeText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).refine((value) => !value.includes("\0"), {
    message: "NUL characters are not allowed",
  });

const fileExtensionSchema = safeText(32).refine(
  (value) => value === "*" || /^[A-Za-z0-9][A-Za-z0-9+_-]*$/.test(value),
  { message: "Invalid file extension" },
);

const fileFilterSchema = z.object({
  name: safeText(80),
  extensions: z.array(fileExtensionSchema).min(1).max(20),
}).strict();

const filtersSchema = z.array(fileFilterSchema).max(20).optional();

const openDirectorySchema = z.object({
  title: safeText(200).optional(),
  buttonLabel: safeText(80).optional(),
}).strict().optional();

const openFileSchema = z.object({
  multiple: z.boolean().optional(),
  title: safeText(200).optional(),
  filters: filtersSchema,
}).strict().optional();

const saveFileSchema = z.object({
  title: safeText(200).optional(),
  filters: filtersSchema,
  defaultPath: safeText(4096).optional(),
}).strict().optional();

const printOptionsSchema = z.object({
  printer: safeText(512),
  silent: z.boolean().optional().default(true),
}).strict();

const kioskPinSchema = safeText(128);

export type OpenDirectoryOptions = z.infer<typeof openDirectorySchema>;
export type OpenFileOptions = z.infer<typeof openFileSchema>;
export type SaveFileOptions = z.infer<typeof saveFileSchema>;
export type PrintOptions = z.infer<typeof printOptionsSchema>;

export function parseOpenDirectoryOptions(value: unknown): OpenDirectoryOptions {
  return openDirectorySchema.parse(value);
}

export function parseOpenFileOptions(value: unknown): OpenFileOptions {
  return openFileSchema.parse(value);
}

export function parseSaveFileOptions(value: unknown): SaveFileOptions {
  return saveFileSchema.parse(value);
}

export function parsePrintOptions(value: unknown): PrintOptions {
  return printOptionsSchema.parse(value);
}

export function parseKioskPin(value: unknown): string {
  return kioskPinSchema.parse(value);
}
