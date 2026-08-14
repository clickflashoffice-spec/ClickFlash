import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type {
  ApplicationComponent,
  ValidatedWriteEnvConfigPayload,
} from "./installer-ipc-schemas";

const MAX_FILE_BYTES = 65_536;
const MAX_TRANSACTION_BYTES = 131_072;
const ALLOWED_CONFIG_PATHS = new Set([
  "Master/.env",
  "Touch/.env",
  "clickflash-installation.json",
]);

export const APPLICATION_LAYOUT = {
  master: {
    directory: "Master",
    executable: "ClickFlash Master OS.exe",
  },
  touch: {
    directory: "Touch",
    executable: "ClickFlash - Touch Kiosk.exe",
  },
} as const;

type DesktopApplication = keyof typeof APPLICATION_LAYOUT;

export interface TransactionFile {
  relativePath: string;
  content: string;
}

export interface TransactionFileOperations {
  existsSync(filePath: string): boolean;
  lstatSync(filePath: string): { isFile(): boolean; isSymbolicLink(): boolean };
  openSync(filePath: string, flags: string, mode: number): number;
  writeFileSync(descriptor: number, content: string, encoding: BufferEncoding): void;
  fsyncSync(descriptor: number): void;
  closeSync(descriptor: number): void;
  copyFileSync(source: string, destination: string, mode: number): void;
  renameSync(source: string, destination: string): void;
  unlinkSync(filePath: string): void;
}

const nodeFileOperations: TransactionFileOperations = {
  existsSync: fs.existsSync,
  lstatSync: fs.lstatSync,
  openSync: fs.openSync,
  writeFileSync: fs.writeFileSync,
  fsyncSync: fs.fsyncSync,
  closeSync: fs.closeSync,
  copyFileSync: fs.copyFileSync,
  renameSync: fs.renameSync,
  unlinkSync: fs.unlinkSync,
};

function isDesktopApplication(value: ApplicationComponent): value is DesktopApplication {
  return value === "master" || value === "touch";
}

function quoteEnvironmentValue(value: string): string {
  return JSON.stringify(value);
}

function serializeEnvironment(environment: Record<string, string>): string {
  return `${Object.entries(environment)
    .map(([key, value]) => `${key}=${quoteEnvironmentValue(value)}`)
    .join("\n")}\n`;
}

export function getDesktopApplications(
  selectedApps: readonly ApplicationComponent[],
): DesktopApplication[] {
  return selectedApps.filter(isDesktopApplication);
}

export function getApplicationExecutablePath(
  deploymentRoot: string,
  application: DesktopApplication,
): string {
  const layout = APPLICATION_LAYOUT[application];
  return path.join(deploymentRoot, layout.directory, layout.executable);
}

export function getCanonicalApplicationExecutable(
  deploymentRoot: string,
  application: DesktopApplication,
): string | null {
  try {
    const canonicalRoot = fs.realpathSync(deploymentRoot);
    const candidate = getApplicationExecutablePath(canonicalRoot, application);
    if (!fs.statSync(candidate).isFile()) return null;

    const canonicalCandidate = fs.realpathSync(candidate);
    const relative = path.relative(canonicalRoot, canonicalCandidate);
    const layout = APPLICATION_LAYOUT[application];
    const expectedRelative = path.join(layout.directory, layout.executable);
    return relative.toLowerCase() === expectedRelative.toLowerCase()
      ? canonicalCandidate
      : null;
  } catch {
    return null;
  }
}

export function getMissingApplicationExecutables(
  deploymentRoot: string,
  selectedApps: readonly ApplicationComponent[],
): string[] {
  return getDesktopApplications(selectedApps)
    .filter((application) => !getCanonicalApplicationExecutable(deploymentRoot, application))
    .map((application) => path.join(
      APPLICATION_LAYOUT[application].directory,
      APPLICATION_LAYOUT[application].executable,
    ));
}

export function createApplicationConfigurationFiles(
  input: ValidatedWriteEnvConfigPayload,
  hubBase: string,
  installerVersion: string,
  configuredAt = new Date().toISOString(),
): TransactionFile[] {
  const sharedEnvironment = {
    NODE_ENV: "production",
    CLOUD_API_URL: hubBase,
    DESK_ID: input.deskId,
    SITE_CODE: input.siteCode,
    TENANT_ID: input.tenantId || "",
    TIMEZONE: input.timezone,
    LOCATION_NAME: input.location,
    CURRENCY: input.currency,
  };
  const files: TransactionFile[] = [];

  if (input.selectedApps.includes("master")) {
    files.push({
      relativePath: "Master/.env",
      content: serializeEnvironment({
        ...sharedEnvironment,
        BACKEND_PORT: "8090",
      }),
    });
  }

  if (input.selectedApps.includes("touch")) {
    files.push({
      relativePath: "Touch/.env",
      content: serializeEnvironment({
        ...sharedEnvironment,
        TOUCH_BACKEND_PORT: "8091",
        FRONTEND_PORT: "8001",
      }),
    });
  }

  const environmentDigest = crypto.createHash("sha256")
    .update(files.map((file) => `${file.relativePath}\0${file.content}`).join("\0"))
    .digest("hex");
  files.push({
    relativePath: "clickflash-installation.json",
    content: `${JSON.stringify({
      schema_version: 1,
      installer_version: installerVersion,
      configured_at: configuredAt,
      components: input.selectedApps,
      desk_id: input.deskId,
      site_code: input.siteCode,
      tenant_id: input.tenantId,
      environment_sha256: environmentDigest,
    }, null, 2)}\n`,
  });

  return files;
}

function normalizeAllowedTarget(root: string, relativePath: string): string {
  const normalizedRelative = relativePath.replace(/\\/g, "/");
  if (!ALLOWED_CONFIG_PATHS.has(normalizedRelative)) {
    throw new Error(`Configuration path is not allowlisted: ${relativePath}`);
  }

  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Configuration path escapes the deployment root: ${relativePath}`);
  }
  return target;
}

export function writeFilesTransactionally(
  deploymentRoot: string,
  files: readonly TransactionFile[],
  operations: TransactionFileOperations = nodeFileOperations,
): void {
  if (files.length === 0) throw new Error("No application configuration files were provided");
  const root = path.resolve(deploymentRoot);
  const uniquePaths = new Set(files.map((file) => file.relativePath.replace(/\\/g, "/")));
  if (uniquePaths.size !== files.length) throw new Error("Duplicate application configuration path");

  let totalBytes = 0;
  const transactionId = `${process.pid}.${crypto.randomBytes(6).toString("hex")}`;
  const records = files.map((file) => {
    const bytes = Buffer.byteLength(file.content, "utf8");
    if (bytes > MAX_FILE_BYTES) throw new Error("Application configuration file exceeds the allowed size");
    totalBytes += bytes;
    const target = normalizeAllowedTarget(root, file.relativePath);
    const directory = path.dirname(target);
    if (!operations.existsSync(directory)) {
      throw new Error(`Application directory is missing: ${path.relative(root, directory)}`);
    }
    const temporary = path.join(directory, `.${path.basename(target)}.${transactionId}.tmp`);
    const backup = path.join(directory, `.${path.basename(target)}.${transactionId}.bak`);
    return { ...file, target, temporary, backup, hadOriginal: false, committed: false };
  });
  if (totalBytes > MAX_TRANSACTION_BYTES) {
    throw new Error("Application configuration transaction exceeds the allowed size");
  }

  try {
    for (const record of records) {
      let descriptor: number | undefined;
      try {
        descriptor = operations.openSync(record.temporary, "wx", 0o600);
        operations.writeFileSync(descriptor, record.content, "utf8");
        operations.fsyncSync(descriptor);
      } finally {
        if (descriptor !== undefined) operations.closeSync(descriptor);
      }
    }

    for (const record of records) {
      if (operations.existsSync(record.target)) {
        const targetStat = operations.lstatSync(record.target);
        if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
          throw new Error(`Refusing to replace non-file configuration: ${record.relativePath}`);
        }
        operations.copyFileSync(record.target, record.backup, fs.constants.COPYFILE_EXCL);
        record.hadOriginal = true;
      }
      operations.renameSync(record.temporary, record.target);
      record.committed = true;
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const record of [...records].reverse()) {
      try {
        if (record.committed && operations.existsSync(record.target)) {
          operations.unlinkSync(record.target);
        }
        if (record.hadOriginal && operations.existsSync(record.backup)) {
          operations.renameSync(record.backup, record.target);
        }
      } catch {
        rollbackFailed = true;
      }
    }
    for (const record of records) {
      try {
        if (operations.existsSync(record.temporary)) operations.unlinkSync(record.temporary);
        if (!rollbackFailed && operations.existsSync(record.backup)) operations.unlinkSync(record.backup);
      } catch {
        // Preserve the original failure; uniquely named recovery files remain available.
      }
    }
    throw error;
  }

  for (const record of records) {
    for (const cleanupPath of [record.temporary, record.backup]) {
      try {
        if (operations.existsSync(cleanupPath)) operations.unlinkSync(cleanupPath);
      } catch {
        // A successful commit remains valid; a uniquely named recovery file may remain.
      }
    }
  }
}
