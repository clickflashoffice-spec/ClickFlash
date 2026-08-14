import path from "node:path";

import {
  createSignedPayloadRelease,
  readPayloadSigningPrivateKey,
} from "../installer-payload-release";
import { PAYLOAD_MANIFEST_FILENAME } from "../installer-payload-verification";

interface PayloadReleaseArguments {
  bundle: string;
  privateKey: string;
  keyId: string;
  releaseId: string;
  version: string;
  minInstallerVersion: string;
  createdAt: string;
}

const OPTION_NAMES = {
  "--bundle": "bundle",
  "--private-key": "privateKey",
  "--key-id": "keyId",
  "--release-id": "releaseId",
  "--version": "version",
  "--min-installer-version": "minInstallerVersion",
  "--created-at": "createdAt",
} as const;

const USAGE = [
  "Usage:",
  "  pnpm payload:sign -- --bundle <directory> --private-key <pkcs8.pem>",
  "    --key-id <id> --release-id <id> --version <x.y.z>",
  "    --min-installer-version <x.y.z> --created-at <ISO-8601>",
  "",
  "The private key must be stored outside the bundle. Only its derived public key is printed.",
].join("\n");

export function parsePayloadReleaseArguments(argumentsList: string[]): PayloadReleaseArguments {
  const values: Partial<PayloadReleaseArguments> = {};
  for (let index = 0; index < argumentsList.length; index += 2) {
    const option = argumentsList[index] as keyof typeof OPTION_NAMES;
    const property = OPTION_NAMES[option];
    const value = argumentsList[index + 1];
    if (!property || !value || value.startsWith("--")) {
      throw new Error(`Invalid or incomplete option: ${option || "<missing>"}`);
    }
    if (values[property]) {
      throw new Error(`Duplicate option: ${option}`);
    }
    values[property] = value;
  }

  for (const property of Object.values(OPTION_NAMES)) {
    if (!values[property]) {
      const option = Object.entries(OPTION_NAMES)
        .find(([, candidate]) => candidate === property)?.[0];
      throw new Error(`Missing required option: ${option}`);
    }
  }
  return values as PayloadReleaseArguments;
}

export async function runPayloadReleaseCli(argumentsList: string[]): Promise<void> {
  if (argumentsList.includes("--help")) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const input = parsePayloadReleaseArguments(argumentsList);
  const bundleDirectory = path.resolve(input.bundle);
  const privateKey = await readPayloadSigningPrivateKey(
    path.resolve(input.privateKey),
    bundleDirectory,
  );
  const release = await createSignedPayloadRelease(
    bundleDirectory,
    {
      releaseId: input.releaseId,
      version: input.version,
      createdAt: input.createdAt,
      minInstallerVersion: input.minInstallerVersion,
    },
    privateKey,
    input.keyId,
  );

  process.stdout.write(`${JSON.stringify({
    success: true,
    envelope: path.join(bundleDirectory, PAYLOAD_MANIFEST_FILENAME),
    releaseId: release.summary.releaseId,
    version: release.summary.version,
    keyId: release.summary.keyId,
    publicKeyBase64: release.publicKeyBase64,
    manifestSha256: release.summary.manifestSha256,
    components: release.summary.components,
    fileCount: release.summary.fileCount,
    totalBytes: release.summary.totalBytes,
  }, null, 2)}\n`);
}

if (require.main === module) {
  runPayloadReleaseCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Payload release signing failed: ${message}\n`);
    process.exitCode = 1;
  });
}

