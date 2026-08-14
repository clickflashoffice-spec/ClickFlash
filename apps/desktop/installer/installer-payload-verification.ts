import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

import { APPLICATION_LAYOUT } from "./installer-application-config";
import { verifyAuthenticodeSignature } from "./installer-authenticode";

export const PAYLOAD_MANIFEST_FILENAME = "clickflash-payload-manifest.json";
export const PAYLOAD_SIGNATURE_DOMAIN = "clickflash-payload-manifest/v1";

const MAX_ENVELOPE_BYTES = 6 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 4 * 1024 * 1024;
const MAX_COMPONENT_FILES = 20_000;
const MAX_PAYLOAD_BYTES = 20 * 1024 * 1024 * 1024;
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const WINDOWS_RESERVED_NAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

const identifierSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const semverSchema = z.string().max(64).regex(SEMVER_PATTERN);
const relativePayloadPathSchema = z.string()
  .min(1)
  .max(1_024)
  .refine(isSafeRelativePayloadPath, "Payload path must be a normalized relative Windows path");

const payloadFileSchema = z.object({
  path: relativePayloadPathSchema,
  size: z.number().int().nonnegative().max(MAX_PAYLOAD_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

const payloadComponentSchema = z.object({
  id: z.enum(["master", "touch"]),
  source_directory: z.enum(["Master", "Touch"]),
  executable: z.enum([
    "ClickFlash Master OS.exe",
    "ClickFlash - Touch Kiosk.exe",
  ]),
  files: z.array(payloadFileSchema).min(1).max(MAX_COMPONENT_FILES),
}).strict().superRefine((component, context) => {
  const layout = APPLICATION_LAYOUT[component.id];
  if (component.source_directory !== layout.directory) {
    context.addIssue({
      code: "custom",
      path: ["source_directory"],
      message: `Component ${component.id} must use ${layout.directory}`,
    });
  }
  if (component.executable !== layout.executable) {
    context.addIssue({
      code: "custom",
      path: ["executable"],
      message: `Component ${component.id} must use its canonical executable`,
    });
  }
  if (!component.files.some((file) => file.path.toLowerCase() === layout.executable.toLowerCase())) {
    context.addIssue({
      code: "custom",
      path: ["files"],
      message: `Component ${component.id} must declare its canonical executable`,
    });
  }

  const normalizedPaths = component.files.map((file) => file.path.toLowerCase());
  if (new Set(normalizedPaths).size !== normalizedPaths.length) {
    context.addIssue({
      code: "custom",
      path: ["files"],
      message: "Payload file paths must be unique on Windows",
    });
  }
});

export const payloadManifestSchema = z.object({
  schema_version: z.literal(1),
  release_id: identifierSchema,
  version: semverSchema,
  platform: z.literal("win32"),
  arch: z.literal("x64"),
  created_at: z.string().max(64).refine(isCanonicalIsoTimestamp, "Invalid release timestamp"),
  min_installer_version: semverSchema,
  components: z.array(payloadComponentSchema).min(1).max(2),
}).strict().superRefine((manifest, context) => {
  const componentIds = manifest.components.map((component) => component.id);
  if (new Set(componentIds).size !== componentIds.length) {
    context.addIssue({ code: "custom", path: ["components"], message: "Components must be unique" });
  }
  if (!componentIds.includes("master")) {
    context.addIssue({ code: "custom", path: ["components"], message: "Master payload is required" });
  }

  const totalBytes = manifest.components.reduce(
    (componentTotal, component) => componentTotal
      + component.files.reduce((fileTotal, file) => fileTotal + file.size, 0),
    0,
  );
  if (totalBytes > MAX_PAYLOAD_BYTES) {
    context.addIssue({ code: "custom", path: ["components"], message: "Payload is too large" });
  }
});

export const payloadEnvelopeSchema = z.object({
  schema_version: z.literal(1),
  algorithm: z.literal("Ed25519"),
  key_id: identifierSchema,
  manifest: z.string().min(1).max(Math.ceil(MAX_MANIFEST_BYTES * 4 / 3) + 8),
  signature: z.string().min(1).max(128),
}).strict();

export type PayloadManifest = z.infer<typeof payloadManifestSchema>;
export type PayloadComponentId = PayloadManifest["components"][number]["id"];
export type PayloadTrustRoots = Readonly<Record<string, string>>;

export interface PayloadBundleSummary {
  releaseId: string;
  version: string;
  keyId: string;
  components: PayloadComponentId[];
  fileCount: number;
  totalBytes: number;
  manifestSha256: string;
}

export type PayloadBundleSelectionResult =
  | { success: true; directory: string; summary: PayloadBundleSummary }
  | { success: false; canceled?: boolean; error?: string };

export interface VerifiedPayloadBundle {
  directory: string;
  manifest: PayloadManifest;
  summary: PayloadBundleSummary;
}

export interface VerifyPayloadBundleOptions {
  requiredComponents?: PayloadComponentId[];
  allowedExtraPaths?: Partial<Record<PayloadComponentId, readonly string[]>>;
  allowedExtraRootPaths?: readonly string[];
}

function isCanonicalIsoTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export function isSafeRelativePayloadPath(value: string): boolean {
  if (
    value.includes("\\")
    || value.includes(":")
    || Array.from(value).some((character) => character.charCodeAt(0) <= 0x1f)
    || /[<>"|?*]/.test(value)
    || value.startsWith("/")
    || value.endsWith("/")
    || path.posix.normalize(value) !== value
  ) {
    return false;
  }

  const segments = value.split("/");
  return segments.every((segment) => (
    segment.length > 0
    && segment !== "."
    && segment !== ".."
    && !segment.endsWith(".")
    && !segment.endsWith(" ")
    && !WINDOWS_RESERVED_NAME_PATTERN.test(segment)
  ));
}

function decodeBase64Url(value: string, label: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`${label} is not canonical base64url`);
  }
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) {
    throw new Error(`${label} is not canonical base64url`);
  }
  return decoded;
}

function decodeRawEd25519PublicKey(value: string): Buffer {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new Error("Payload public key must be a canonical 32-byte base64 value");
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32 || decoded.toString("base64") !== value) {
    throw new Error("Payload public key must be a canonical 32-byte base64 value");
  }
  return decoded;
}

function compareSemver(left: string, right: string): number {
  const leftParts = left.split(/[+-]/, 1)[0].split(".").map(Number);
  const rightParts = right.split(/[+-]/, 1)[0].split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] > rightParts[index] ? 1 : -1;
    }
  }
  return 0;
}

export function createPayloadSignatureInput(manifestBytes: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from(PAYLOAD_SIGNATURE_DOMAIN, "utf8"),
    Buffer.from([0]),
    manifestBytes,
  ]);
}

export function verifyPayloadEnvelope(
  envelopeInput: unknown,
  trustRoots: PayloadTrustRoots,
  installerVersion: string,
): { manifest: PayloadManifest; summary: PayloadBundleSummary } {
  const envelopeResult = payloadEnvelopeSchema.safeParse(envelopeInput);
  if (!envelopeResult.success) {
    throw new Error("Payload envelope format is invalid");
  }
  const envelope = envelopeResult.data;
  if (!SEMVER_PATTERN.test(installerVersion)) {
    throw new Error("Installer version is invalid");
  }

  const publicKeyValue = trustRoots[envelope.key_id];
  if (!publicKeyValue) {
    throw new Error(`Payload signing key is not trusted: ${envelope.key_id}`);
  }

  const manifestBytes = decodeBase64Url(envelope.manifest, "Payload manifest");
  const signature = decodeBase64Url(envelope.signature, "Payload signature");
  if (manifestBytes.length > MAX_MANIFEST_BYTES) {
    throw new Error("Payload manifest is too large");
  }
  if (signature.length !== 64) {
    throw new Error("Payload signature has an invalid length");
  }

  const rawPublicKey = decodeRawEd25519PublicKey(publicKeyValue);
  const publicKey = crypto.createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, rawPublicKey]),
    format: "der",
    type: "spki",
  });
  if (!crypto.verify(null, createPayloadSignatureInput(manifestBytes), publicKey, signature)) {
    throw new Error("Payload manifest signature is invalid");
  }

  let parsedManifest: unknown;
  try {
    parsedManifest = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes));
  } catch {
    throw new Error("Payload manifest is not valid UTF-8 JSON");
  }
  const manifestResult = payloadManifestSchema.safeParse(parsedManifest);
  if (!manifestResult.success) {
    throw new Error("Payload manifest format is invalid");
  }
  const manifest = manifestResult.data;
  if (compareSemver(installerVersion, manifest.min_installer_version) < 0) {
    throw new Error(`Payload requires Installer ${manifest.min_installer_version} or newer`);
  }

  const files = manifest.components.flatMap((component) => component.files);
  return {
    manifest,
    summary: {
      releaseId: manifest.release_id,
      version: manifest.version,
      keyId: envelope.key_id,
      components: manifest.components.map((component) => component.id),
      fileCount: files.length,
      totalBytes: files.reduce((total, file) => total + file.size, 0),
      manifestSha256: crypto.createHash("sha256").update(manifestBytes).digest("hex"),
    },
  };
}

async function listPayloadFiles(directory: string, relativeDirectory = ""): Promise<string[]> {
  const absoluteDirectory = relativeDirectory
    ? path.join(directory, ...relativeDirectory.split("/"))
    : directory;
  const entries = await fs.promises.readdir(absoluteDirectory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    if (!isSafeRelativePayloadPath(relativePath)) {
      throw new Error(`Payload contains an unsafe path: ${relativePath}`);
    }
    if (entry.isSymbolicLink()) {
      throw new Error(`Payload links are not allowed: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...await listPayloadFiles(directory, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error(`Payload contains an unsupported file type: ${relativePath}`);
    }
  }
  return files;
}

async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

function isPathWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function verifyComponentFiles(
  bundleDirectory: string,
  component: PayloadManifest["components"][number],
  allowedExtraPaths: readonly string[],
): Promise<void> {
  const componentDirectory = path.join(bundleDirectory, component.source_directory);
  const componentStats = await fs.promises.lstat(componentDirectory);
  if (!componentStats.isDirectory() || componentStats.isSymbolicLink()) {
    throw new Error(`Payload component directory is invalid: ${component.source_directory}`);
  }

  const canonicalComponentDirectory = await fs.promises.realpath(componentDirectory);
  if (!isPathWithin(bundleDirectory, canonicalComponentDirectory)) {
    throw new Error(`Payload component escapes the selected bundle: ${component.source_directory}`);
  }

  const actualPaths = await listPayloadFiles(componentDirectory);
  const declaredPaths = new Map(component.files.map((file) => [file.path.toLowerCase(), file]));
  const allowedExtras = new Set(allowedExtraPaths.map((filePath) => filePath.toLowerCase()));
  const actualPathsByNormalizedPath = new Map(
    actualPaths.map((actualPath) => [actualPath.toLowerCase(), actualPath]),
  );
  if (actualPathsByNormalizedPath.size !== actualPaths.length) {
    throw new Error(`Payload contains case-colliding paths: ${component.source_directory}`);
  }

  for (const actualPath of actualPaths) {
    const normalized = actualPath.toLowerCase();
    if (!declaredPaths.has(normalized) && !allowedExtras.has(normalized)) {
      throw new Error(`Payload contains an undeclared file: ${component.source_directory}/${actualPath}`);
    }
  }
  for (const file of component.files) {
    const actualRelativePath = actualPathsByNormalizedPath.get(file.path.toLowerCase());
    if (!actualRelativePath) {
      throw new Error(`Payload file is missing: ${component.source_directory}/${file.path}`);
    }

    const absolutePath = path.join(componentDirectory, ...actualRelativePath.split("/"));
    const stats = await fs.promises.lstat(absolutePath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error(`Payload file is not a regular file: ${component.source_directory}/${file.path}`);
    }
    const canonicalPath = await fs.promises.realpath(absolutePath);
    if (!isPathWithin(canonicalComponentDirectory, canonicalPath)) {
      throw new Error(`Payload file escapes its component: ${component.source_directory}/${file.path}`);
    }
    if (stats.size !== file.size) {
      throw new Error(`Payload file size mismatch: ${component.source_directory}/${file.path}`);
    }
    if (await hashFile(absolutePath) !== file.sha256) {
      throw new Error(`Payload file hash mismatch: ${component.source_directory}/${file.path}`);
    }

    if (file.path.toLowerCase().endsWith(".exe") || file.path.toLowerCase().endsWith(".dll")) {
      try {
        if (!await verifyAuthenticodeSignature(absolutePath)) {
          throw new Error(`Payload executable is not properly signed: ${component.source_directory}/${file.path}`);
        }
      } catch (err) {
        throw new Error(`Failed to verify Authenticode signature for: ${component.source_directory}/${file.path}. ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}

export async function loadAndVerifyPayloadBundle(
  selectedDirectory: string,
  trustRoots: PayloadTrustRoots,
  installerVersion: string,
  options: VerifyPayloadBundleOptions = {},
): Promise<VerifiedPayloadBundle> {
  if (Object.keys(trustRoots).length === 0) {
    throw new Error("Payload trust root is not configured");
  }

  const selectedDirectoryStats = await fs.promises.lstat(selectedDirectory);
  if (!selectedDirectoryStats.isDirectory() || selectedDirectoryStats.isSymbolicLink()) {
    throw new Error("Selected payload bundle is not a regular directory");
  }
  const directory = await fs.promises.realpath(selectedDirectory);
  const directoryStats = await fs.promises.lstat(directory);
  if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink()) {
    throw new Error("Selected payload bundle is not a regular directory");
  }

  const envelopePath = path.join(directory, PAYLOAD_MANIFEST_FILENAME);
  const envelopeStats = await fs.promises.lstat(envelopePath);
  if (!envelopeStats.isFile() || envelopeStats.isSymbolicLink()) {
    throw new Error(`Payload bundle must contain ${PAYLOAD_MANIFEST_FILENAME}`);
  }
  if (envelopeStats.size > MAX_ENVELOPE_BYTES) {
    throw new Error("Payload envelope is too large");
  }

  const allowedExtraRootPaths = options.allowedExtraRootPaths ?? [];
  for (const extraPath of allowedExtraRootPaths) {
    if (!isSafeRelativePayloadPath(extraPath) || extraPath.includes("/")) {
      throw new Error(`Allowed payload root path is invalid: ${extraPath}`);
    }
  }
  const allowedRootEntries = new Set([
    "Master",
    "Touch",
    PAYLOAD_MANIFEST_FILENAME,
    ...allowedExtraRootPaths,
  ]);
  const rootEntries = await fs.promises.readdir(directory, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (!allowedRootEntries.has(entry.name)) {
      throw new Error(`Payload bundle contains an undeclared root entry: ${entry.name}`);
    }
    if (entry.isSymbolicLink()) {
      throw new Error(`Payload bundle links are not allowed: ${entry.name}`);
    }
    if (allowedExtraRootPaths.includes(entry.name) && !entry.isFile()) {
      throw new Error(`Payload bundle root extra is not a regular file: ${entry.name}`);
    }
  }

  let envelopeInput: unknown;
  try {
    envelopeInput = JSON.parse(await fs.promises.readFile(envelopePath, "utf8"));
  } catch {
    throw new Error("Payload envelope is not valid JSON");
  }
  const verified = verifyPayloadEnvelope(envelopeInput, trustRoots, installerVersion);

  const manifestComponentIds = new Set(
    verified.manifest.components.map((component) => component.id),
  );
  if (rootEntries.some((entry) => entry.name === "Touch") && !manifestComponentIds.has("touch")) {
    throw new Error("Payload bundle contains an undeclared Touch component");
  }

  const availableComponents = manifestComponentIds;
  for (const requiredComponent of options.requiredComponents ?? []) {
    if (!availableComponents.has(requiredComponent)) {
      throw new Error(`Payload bundle does not contain the selected ${requiredComponent} component`);
    }
  }

  for (const component of verified.manifest.components) {
    const allowedExtraPaths = options.allowedExtraPaths?.[component.id] ?? [];
    for (const extraPath of allowedExtraPaths) {
      if (!isSafeRelativePayloadPath(extraPath)) {
        throw new Error(`Allowed payload path is invalid: ${extraPath}`);
      }
    }
    await verifyComponentFiles(directory, component, allowedExtraPaths);
  }

  return { directory, manifest: verified.manifest, summary: verified.summary };
}
