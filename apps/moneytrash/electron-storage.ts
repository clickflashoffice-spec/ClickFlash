import { app, safeStorage } from "electron";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  UploadConfig,
  UploadHistoryItem,
  uploadConfigSchema,
  uploadHistorySchema,
} from "./electron-contract";
import { parseApprovedApiUrl } from "./electron-security";

const MAX_JSON_BYTES = 1024 * 1024;
const secretKeys = ["apiKey", "s3AccessKey", "s3SecretKey"] as const;
type SecretKey = (typeof secretKeys)[number];
type PublicUploadConfig = Omit<UploadConfig, SecretKey>;

const storedConfigSchema = z.object({
  version: z.literal(1),
  values: uploadConfigSchema.omit({ apiKey: true, s3AccessKey: true, s3SecretKey: true }),
  protectedSecrets: z.string().max(32_768),
}).strict();

async function readBoundedJson(filePath: string): Promise<unknown | null> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > MAX_JSON_BYTES) throw new Error("Stored JSON is invalid or too large");
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await fs.open(tempPath, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

function storagePath(name: string): string {
  return path.join(app.getPath("userData"), name);
}

function requireProtectedStorage(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS-protected credential storage is unavailable");
  }
}

export async function saveUploadConfig(rawConfig: unknown): Promise<void> {
  requireProtectedStorage();
  const config = uploadConfigSchema.parse(rawConfig);
  config.apiUrl = parseApprovedApiUrl(config.apiUrl);
  const previous = await loadUploadConfigInternal().catch(() => null);
  const secrets = Object.fromEntries(secretKeys.map((key) => [key, config[key] ?? previous?.[key]]));
  const values: Partial<UploadConfig> = { ...config };
  for (const key of secretKeys) delete values[key];

  await atomicWriteJson(storagePath("upload-config.json"), {
    version: 1,
    values,
    protectedSecrets: safeStorage.encryptString(JSON.stringify(secrets)).toString("base64"),
  });
}

export async function loadUploadConfigInternal(): Promise<UploadConfig | null> {
  const stored = await readBoundedJson(storagePath("upload-config.json"));
  if (!stored) {
    const apiUrl = process.env.CLICKFLASH_MONEYTRASH_API_URL;
    const deskId = process.env.CLICKFLASH_MONEYTRASH_DESK_ID;
    const apiKey = process.env.CLICKFLASH_MONEYTRASH_API_KEY;
    if (!apiUrl && !deskId && !apiKey) return null;
    return uploadConfigSchema.parse({
      apiUrl: apiUrl ?? "https://moneytrash-api.clickflash-office.workers.dev",
      deskId,
      apiKey,
    });
  }
  requireProtectedStorage();
  const parsed = storedConfigSchema.parse(stored);
  const decrypted = safeStorage.decryptString(Buffer.from(parsed.protectedSecrets, "base64"));
  const secrets = z.object({
    apiKey: z.string().optional(),
    s3AccessKey: z.string().optional(),
    s3SecretKey: z.string().optional(),
  }).strict().parse(JSON.parse(decrypted));
  return uploadConfigSchema.parse({ ...parsed.values, ...secrets });
}

export async function loadUploadConfig(): Promise<PublicUploadConfig | null> {
  const config = await loadUploadConfigInternal();
  if (!config) return null;
  const publicConfig: Partial<UploadConfig> = { ...config };
  for (const key of secretKeys) delete publicConfig[key];
  return publicConfig as PublicUploadConfig;
}

export async function saveUploadHistory(rawHistory: unknown): Promise<void> {
  const history = uploadHistorySchema.parse(rawHistory);
  await atomicWriteJson(storagePath("upload-history.json"), history);
}

export async function loadUploadHistory(): Promise<UploadHistoryItem[]> {
  const stored = await readBoundedJson(storagePath("upload-history.json"));
  return stored ? uploadHistorySchema.parse(stored) : [];
}
