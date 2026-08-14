import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { InstallerConfig } from "./installer-ipc-schemas";

const MAX_CONFIG_BYTES = 262_144;

export interface ProtectedInstallerConfig extends Omit<InstallerConfig, "license"> {
  license: Omit<InstallerConfig["license"], "key"> & {
    encrypted_key: string;
    key_protection: "electron-safe-storage-v1";
  };
}

export function protectInstallerConfig(
  config: InstallerConfig,
  encrypt: (plainText: string) => Buffer,
): ProtectedInstallerConfig {
  const { key, ...licenseMetadata } = config.license;
  return {
    ...config,
    license: {
      ...licenseMetadata,
      encrypted_key: encrypt(key).toString("base64"),
      key_protection: "electron-safe-storage-v1",
    },
  };
}

export function writeJsonAtomic(filePath: string, value: unknown): void {
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(payload, "utf8") > MAX_CONFIG_BYTES) {
    throw new Error("Installer configuration exceeds the allowed size");
  }

  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`,
  );
  let descriptor: number | undefined;

  try {
    descriptor = fs.openSync(temporaryPath, "wx", 0o600);
    fs.writeFileSync(descriptor, payload, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}
