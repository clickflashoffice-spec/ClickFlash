import fs from "fs";
import { z } from "zod";
import {
  type DesktopLicenseResult,
  verifySignedDesktopLicense,
} from "./backend/shared/desktopLicenseContract";

export {
  getLicenseMachineId,
  isValidEd25519PublicKey,
  verifySignedDesktopLicense,
} from "./backend/shared/desktopLicenseContract";
export type { DesktopLicenseResult } from "./backend/shared/desktopLicenseContract";

const MAX_CONFIG_BYTES = 262_144;

const protectedLicenseConfigSchema = z.object({
  license: z.object({
    plan: z.enum(["starter", "pro", "enterprise", "trial"]),
    max_masters: z.number().int().min(1).max(10_000),
    expires_at: z.string().refine((value) => Number.isFinite(Date.parse(value))).nullable(),
    machine_id: z.string().trim().min(1).max(256),
    encrypted_key: z.string().min(1).max(32_768).regex(/^[A-Za-z0-9+/]+={0,2}$/),
    key_protection: z.literal("electron-safe-storage-v1"),
  }).strict(),
}).passthrough();

export function validateProtectedLicenseConfig(
  rawConfig: unknown,
  decrypt: (encrypted: Buffer) => string,
  publicKeyB64: string,
  currentMachineId: string,
): DesktopLicenseResult {
  const config = protectedLicenseConfigSchema.safeParse(rawConfig);
  if (!config.success) return { valid: false, error: "Installer activation file is invalid" };
  if (config.data.license.machine_id !== currentMachineId) {
    return { valid: false, error: "Installer activation belongs to another machine" };
  }

  let key: string;
  try {
    key = decrypt(Buffer.from(config.data.license.encrypted_key, "base64")).trim();
  } catch {
    return { valid: false, error: "OS-protected activation could not be decrypted" };
  }

  const verification = verifySignedDesktopLicense(key, publicKeyB64);
  if (!verification.valid || !verification.license) return verification;
  const signed = verification.license;
  const stored = config.data.license;
  if (
    signed.machineId !== currentMachineId
    || signed.plan !== stored.plan
    || signed.maxMasters !== stored.max_masters
    || signed.expiresAt !== stored.expires_at
  ) {
    return { valid: false, error: "Installer activation metadata does not match its signature" };
  }

  return verification;
}

export function loadProtectedDesktopLicense(
  configPath: string,
  decrypt: (encrypted: Buffer) => string,
  publicKeyB64: string,
  currentMachineId: string,
): DesktopLicenseResult {
  try {
    const stat = fs.lstatSync(configPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > MAX_CONFIG_BYTES) {
      return { valid: false, error: "Installer activation file is not a safe regular file" };
    }
    const rawConfig: unknown = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return validateProtectedLicenseConfig(rawConfig, decrypt, publicKeyB64, currentMachineId);
  } catch {
    return { valid: false, error: "Installer activation file is missing or unreadable" };
  }
}
