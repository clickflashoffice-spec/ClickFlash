import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
export const REPOSITORY_ROOT = fs.realpathSync(
  path.resolve(path.dirname(SCRIPT_PATH), "..", "..", ".."),
);

function pathsMatch(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);

  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

export function isPathInside(parentPath, candidatePath) {
  const relative = path.relative(parentPath, candidatePath);

  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function assertExternalOutputDirectory(outputDirectory) {
  if (isPathInside(REPOSITORY_ROOT, outputDirectory)) {
    throw new Error(
      "Refusing to write payload signing material inside the ClickFlash repository.",
    );
  }
}

export function resolveOutputDirectory({
  argv = process.argv.slice(2),
  env = process.env,
} = {}) {
  const inlineArgument = argv.find((argument) =>
    argument.startsWith("--output-dir="),
  );
  const outputFlagIndex = argv.indexOf("--output-dir");
  const argumentValue = inlineArgument
    ? inlineArgument.slice("--output-dir=".length)
    : outputFlagIndex >= 0
      ? argv[outputFlagIndex + 1]
      : undefined;
  const configuredDirectory = argumentValue || env.CLICKFLASH_PAYLOAD_KEY_DIR;

  if (!configuredDirectory) {
    throw new Error(
      "Set CLICKFLASH_PAYLOAD_KEY_DIR or pass --output-dir with a directory outside the repository.",
    );
  }

  const outputDirectory = path.resolve(configuredDirectory);
  assertExternalOutputDirectory(outputDirectory);
  return outputDirectory;
}

export function generatePayloadKey({
  outputDirectory = resolveOutputDirectory(),
} = {}) {
  const requestedOutputDirectory = path.resolve(outputDirectory);
  assertExternalOutputDirectory(requestedOutputDirectory);

  fs.mkdirSync(requestedOutputDirectory, { recursive: true, mode: 0o700 });
  const verifiedOutputDirectory = fs.realpathSync(requestedOutputDirectory);
  assertExternalOutputDirectory(verifiedOutputDirectory);

  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

  const privateKeyPem = privateKey.export({
    type: "pkcs8",
    format: "pem",
  });

  // Extract raw 32-byte public key from SPKI format
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  // Ed25519 SPKI DER prefix is 12 bytes long: 302a300506032b6570032100
  const rawPublicKey = publicKeyDer.slice(12);
  const publicKeyBase64 = rawPublicKey.toString("base64");

  // keyId could be a hash of the public key or a descriptive name
  const keyId = "payload-key-v1-" + Date.now();

  const keyPath = path.join(verifiedOutputDirectory, "payload-private-key.pem");

  fs.writeFileSync(keyPath, privateKeyPem, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });

  return {
    keyId,
    publicKeyBase64,
    keyPath,
  };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && pathsMatch(invokedPath, SCRIPT_PATH)) {
  try {
    console.log(JSON.stringify(generatePayloadKey(), null, 2));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Key generation failed";
    console.error(JSON.stringify({ error: message }));
    process.exitCode = 1;
  }
}
