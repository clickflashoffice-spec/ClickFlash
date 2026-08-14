import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { APPLICATION_LAYOUT } from "./installer-application-config";
import {
  createPayloadSignatureInput,
  isSafeRelativePayloadPath,
  loadAndVerifyPayloadBundle,
  PAYLOAD_MANIFEST_FILENAME,
  payloadEnvelopeSchema,
  payloadManifestSchema,
  type PayloadBundleSummary,
  type PayloadComponentId,
  type PayloadManifest,
} from "./installer-payload-verification";

const MAX_COMPONENT_FILES = 20_000;
const MAX_PRIVATE_KEY_BYTES = 16_384;
const MAX_ENVELOPE_BYTES = 6 * 1024 * 1024;
const PRIVATE_KEY_MARKER = /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/;
const FORBIDDEN_RELEASE_PATHS = [
  /(^|\/)\.env(?:\.|$)/i,
  /\.(?:key|pem|p12|pfx)$/i,
  /(^|\/)(?:private[_-]?key|secrets?)(?:\.|$)/i,
];

export interface PayloadReleaseOptions {
  releaseId: string;
  version: string;
  createdAt: string;
  minInstallerVersion: string;
}

export interface SignedPayloadEnvelope {
  schema_version: 1;
  algorithm: "Ed25519";
  key_id: string;
  manifest: string;
  signature: string;
}

export interface SignedPayloadRelease {
  manifest: PayloadManifest;
  envelope: SignedPayloadEnvelope;
  publicKeyBase64: string;
  summary: PayloadBundleSummary;
}

interface InventoryFile {
  path: string;
  size: number;
  sha256: string;
}

function comparePaths(left: string, right: string): number {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isPathWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertReleasePathAllowed(relativePath: string): void {
  if (!isSafeRelativePayloadPath(relativePath)) {
    throw new Error(`Release contains an unsafe path: ${relativePath}`);
  }
  if (FORBIDDEN_RELEASE_PATHS.some((pattern) => pattern.test(relativePath))) {
    throw new Error(`Release contains a forbidden secret-like path: ${relativePath}`);
  }
}

async function hashAndInspectFile(filePath: string, displayPath: string): Promise<{
  size: number;
  sha256: string;
}> {
  const before = await fs.promises.lstat(filePath);
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new Error(`Release entry is not a regular file: ${displayPath}`);
  }

  const hash = crypto.createHash("sha256");
  let markerTail = "";
  for await (const chunk of fs.createReadStream(filePath)) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    hash.update(buffer);
    const markerInput = `${markerTail}${buffer.toString("latin1")}`;
    if (PRIVATE_KEY_MARKER.test(markerInput)) {
      throw new Error(`Release contains private-key material: ${displayPath}`);
    }
    markerTail = markerInput.slice(-64);
  }

  const after = await fs.promises.lstat(filePath);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
    throw new Error(`Release file changed while hashing: ${displayPath}`);
  }
  return { size: after.size, sha256: hash.digest("hex") };
}

async function inventoryDirectory(
  directory: string,
  relativeDirectory = "",
): Promise<InventoryFile[]> {
  const absoluteDirectory = relativeDirectory
    ? path.join(directory, ...relativeDirectory.split("/"))
    : directory;
  const entries = await fs.promises.readdir(absoluteDirectory, { withFileTypes: true });
  entries.sort((left, right) => comparePaths(left.name, right.name));

  const files: InventoryFile[] = [];
  for (const entry of entries) {
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    assertReleasePathAllowed(relativePath);
    if (entry.isSymbolicLink()) {
      throw new Error(`Release links are not allowed: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...await inventoryDirectory(directory, relativePath));
    } else if (entry.isFile()) {
      files.push({
        path: relativePath,
        ...await hashAndInspectFile(
          path.join(directory, ...relativePath.split("/")),
          relativePath,
        ),
      });
    } else {
      throw new Error(`Release contains an unsupported file type: ${relativePath}`);
    }
    if (files.length > MAX_COMPONENT_FILES) {
      throw new Error(`Release component exceeds ${MAX_COMPONENT_FILES.toLocaleString()} files`);
    }
  }
  return files;
}

async function assertBundleRootLayout(bundleDirectory: string): Promise<Set<string>> {
  const rootEntries = await fs.promises.readdir(bundleDirectory, { withFileTypes: true });
  const allowedEntries = new Set(["Master", "Touch", PAYLOAD_MANIFEST_FILENAME]);
  const names = new Set<string>();
  for (const entry of rootEntries) {
    if (!allowedEntries.has(entry.name)) {
      throw new Error(`Release bundle contains an unexpected root entry: ${entry.name}`);
    }
    if (entry.isSymbolicLink()) {
      throw new Error(`Release bundle links are not allowed: ${entry.name}`);
    }
    if (entry.name === PAYLOAD_MANIFEST_FILENAME) {
      const manifestStats = await fs.promises.lstat(path.join(bundleDirectory, entry.name));
      if (!entry.isFile() || manifestStats.size > MAX_ENVELOPE_BYTES) {
        throw new Error("Existing payload manifest is invalid or too large");
      }
    } else if (!entry.isDirectory()) {
      throw new Error(`Release component must be a directory: ${entry.name}`);
    }
    names.add(entry.name);
  }
  if (!names.has("Master")) {
    throw new Error("Release bundle must contain the Master component");
  }
  return names;
}

export async function createPayloadManifest(
  selectedDirectory: string,
  options: PayloadReleaseOptions,
): Promise<{ directory: string; manifest: PayloadManifest }> {
  const directory = await fs.promises.realpath(selectedDirectory);
  const directoryStats = await fs.promises.lstat(directory);
  if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink()) {
    throw new Error("Release bundle must be a regular directory");
  }
  const rootEntries = await assertBundleRootLayout(directory);
  const componentIds: PayloadComponentId[] = rootEntries.has("Touch")
    ? ["master", "touch"]
    : ["master"];

  const components: PayloadManifest["components"] = [];
  for (const id of componentIds) {
    const layout = APPLICATION_LAYOUT[id];
    const componentDirectory = path.join(directory, layout.directory);
    const stats = await fs.promises.lstat(componentDirectory);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error(`Release component is not a regular directory: ${layout.directory}`);
    }
    const canonicalComponentDirectory = await fs.promises.realpath(componentDirectory);
    if (!isPathWithin(directory, canonicalComponentDirectory)) {
      throw new Error(`Release component escapes the bundle: ${layout.directory}`);
    }
    components.push({
      id,
      source_directory: layout.directory,
      executable: layout.executable,
      files: await inventoryDirectory(componentDirectory),
    });
  }

  const parsed = payloadManifestSchema.safeParse({
    schema_version: 1,
    release_id: options.releaseId,
    version: options.version,
    platform: "win32",
    arch: "x64",
    created_at: options.createdAt,
    min_installer_version: options.minInstallerVersion,
    components,
  });
  if (!parsed.success) {
    throw new Error(`Release metadata or component layout is invalid: ${parsed.error.message}`);
  }
  return { directory, manifest: parsed.data };
}

export function parsePayloadSigningPrivateKey(value: string | Buffer): crypto.KeyObject {
  let privateKey: crypto.KeyObject;
  try {
    privateKey = crypto.createPrivateKey(value);
  } catch {
    throw new Error("Payload signing key is not a valid PKCS#8 private key");
  }
  if (privateKey.asymmetricKeyType !== "ed25519") {
    throw new Error("Payload signing key must use Ed25519");
  }
  return privateKey;
}

export async function readPayloadSigningPrivateKey(
  privateKeyPath: string,
  bundleDirectory: string,
): Promise<crypto.KeyObject> {
  const sourceStats = await fs.promises.lstat(privateKeyPath);
  if (!sourceStats.isFile() || sourceStats.isSymbolicLink() || sourceStats.size > MAX_PRIVATE_KEY_BYTES) {
    throw new Error("Payload signing key file is invalid");
  }
  const canonicalKeyPath = await fs.promises.realpath(privateKeyPath);
  const canonicalBundleDirectory = await fs.promises.realpath(bundleDirectory);
  if (isPathWithin(canonicalBundleDirectory, canonicalKeyPath)) {
    throw new Error("Payload signing key must be stored outside the release bundle");
  }
  return parsePayloadSigningPrivateKey(await fs.promises.readFile(canonicalKeyPath));
}

function getRawPublicKeyBase64(privateKey: crypto.KeyObject): string {
  const publicKey = crypto.createPublicKey(privateKey);
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  if (!Buffer.isBuffer(publicKeyDer) || publicKeyDer.length < 32) {
    throw new Error("Could not derive the payload public key");
  }
  return publicKeyDer.subarray(publicKeyDer.length - 32).toString("base64");
}

export function signPayloadManifest(
  manifestInput: PayloadManifest,
  privateKey: crypto.KeyObject,
  keyId: string,
): { envelope: SignedPayloadEnvelope; publicKeyBase64: string } {
  if (privateKey.asymmetricKeyType !== "ed25519") {
    throw new Error("Payload signing key must use Ed25519");
  }
  const manifest = payloadManifestSchema.parse(manifestInput);
  const manifestBytes = Buffer.from(JSON.stringify(manifest), "utf8");
  const envelope = payloadEnvelopeSchema.parse({
    schema_version: 1,
    algorithm: "Ed25519",
    key_id: keyId,
    manifest: manifestBytes.toString("base64url"),
    signature: crypto.sign(
      null,
      createPayloadSignatureInput(manifestBytes),
      privateKey,
    ).toString("base64url"),
  }) as SignedPayloadEnvelope;
  return { envelope, publicKeyBase64: getRawPublicKeyBase64(privateKey) };
}

function replaceFileAtomic(filePath: string, payload: string | Buffer): void {
  const directory = path.dirname(filePath);
  const suffix = `${process.pid}.${crypto.randomBytes(6).toString("hex")}`;
  const temporaryPath = path.join(directory, `.${PAYLOAD_MANIFEST_FILENAME}.${suffix}.tmp`);
  const backupPath = path.join(directory, `.${PAYLOAD_MANIFEST_FILENAME}.${suffix}.bak`);
  let descriptor: number | undefined;
  let backupCreated = false;

  try {
    descriptor = fs.openSync(temporaryPath, "wx", 0o600);
    fs.writeFileSync(descriptor, payload, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, backupPath);
      backupCreated = true;
    }
    fs.renameSync(temporaryPath, filePath);
    if (backupCreated) {
      fs.unlinkSync(backupPath);
      backupCreated = false;
    }
  } catch (error) {
    if (backupCreated && fs.existsSync(backupPath)) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        fs.renameSync(backupPath, filePath);
        backupCreated = false;
      } catch (recoveryError) {
        throw new AggregateError(
          [error, recoveryError],
          `Payload manifest update failed and recovery backup was preserved at ${backupPath}`,
        );
      }
    }
    throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function writeEnvelopeAtomic(filePath: string, envelope: SignedPayloadEnvelope): void {
  replaceFileAtomic(filePath, `${JSON.stringify(envelope, null, 2)}\n`);
}

export async function createSignedPayloadRelease(
  selectedDirectory: string,
  options: PayloadReleaseOptions,
  privateKey: crypto.KeyObject,
  keyId: string,
): Promise<SignedPayloadRelease> {
  const { directory, manifest } = await createPayloadManifest(selectedDirectory, options);
  const { envelope, publicKeyBase64 } = signPayloadManifest(manifest, privateKey, keyId);
  const envelopePath = path.join(directory, PAYLOAD_MANIFEST_FILENAME);
  const previousEnvelope = fs.existsSync(envelopePath)
    ? await fs.promises.readFile(envelopePath)
    : null;

  writeEnvelopeAtomic(envelopePath, envelope);
  try {
    const verified = await loadAndVerifyPayloadBundle(
      directory,
      { [keyId]: publicKeyBase64 },
      options.minInstallerVersion,
    );
    return {
      manifest,
      envelope,
      publicKeyBase64,
      summary: verified.summary,
    };
  } catch (error) {
    if (previousEnvelope) {
      replaceFileAtomic(envelopePath, previousEnvelope);
    } else if (fs.existsSync(envelopePath)) {
      fs.unlinkSync(envelopePath);
    }
    throw error;
  }
}
