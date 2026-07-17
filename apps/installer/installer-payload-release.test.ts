import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPayloadManifest,
  createSignedPayloadRelease,
  parsePayloadSigningPrivateKey,
  readPayloadSigningPrivateKey,
  signPayloadManifest,
  type PayloadReleaseOptions,
} from "./installer-payload-release";
import {
  loadAndVerifyPayloadBundle,
  PAYLOAD_MANIFEST_FILENAME,
} from "./installer-payload-verification";
import {
  parsePayloadReleaseArguments,
  runPayloadReleaseCli,
} from "./scripts/payload-release";

const createdDirectories: string[] = [];
const releaseOptions: PayloadReleaseOptions = {
  releaseId: "release_2026_07_17",
  version: "2.0.0",
  createdAt: "2026-07-17T00:00:00.000Z",
  minInstallerVersion: "5.0.0",
};

function createTemporaryDirectory(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  createdDirectories.push(directory);
  return directory;
}

function createBundle(includeTouch = true): string {
  const root = createTemporaryDirectory("clickflash-release-");
  fs.mkdirSync(path.join(root, "Master"));
  fs.writeFileSync(path.join(root, "Master", "ClickFlash Master OS.exe"), "master");
  fs.writeFileSync(path.join(root, "Master", "z-resource.bin"), "z");
  fs.writeFileSync(path.join(root, "Master", "A-resource.bin"), "a");
  if (includeTouch) {
    fs.mkdirSync(path.join(root, "Touch"));
    fs.writeFileSync(path.join(root, "Touch", "ClickFlash - Touch Kiosk.exe"), "touch");
  }
  return root;
}

function createSigningKey(): crypto.KeyObject {
  return crypto.generateKeyPairSync("ed25519").privateKey;
}

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("payload release signing", () => {
  it("builds a stable, sorted manifest and deterministic Ed25519 envelope", async () => {
    const root = createBundle();
    const privateKey = createSigningKey();
    const firstManifest = (await createPayloadManifest(root, releaseOptions)).manifest;
    const secondManifest = (await createPayloadManifest(root, releaseOptions)).manifest;
    const firstSigned = signPayloadManifest(firstManifest, privateKey, "payload_release_1");
    const secondSigned = signPayloadManifest(secondManifest, privateKey, "payload_release_1");

    expect(JSON.stringify(secondManifest)).toBe(JSON.stringify(firstManifest));
    expect(firstManifest.components[0].files.map((file) => file.path)).toEqual([
      "A-resource.bin",
      "ClickFlash Master OS.exe",
      "z-resource.bin",
    ]);
    expect(secondSigned.envelope).toEqual(firstSigned.envelope);
    expect(firstSigned.publicKeyBase64).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  });

  it("writes an atomically replaceable envelope that passes the production verifier", async () => {
    const root = createBundle();
    const privateKey = createSigningKey();
    const firstRelease = await createSignedPayloadRelease(
      root,
      releaseOptions,
      privateKey,
      "payload_release_1",
    );
    const firstEnvelope = fs.readFileSync(path.join(root, PAYLOAD_MANIFEST_FILENAME), "utf8");
    const secondRelease = await createSignedPayloadRelease(
      root,
      releaseOptions,
      privateKey,
      "payload_release_1",
    );

    expect(fs.readFileSync(path.join(root, PAYLOAD_MANIFEST_FILENAME), "utf8")).toBe(firstEnvelope);
    expect(secondRelease.summary.manifestSha256).toBe(firstRelease.summary.manifestSha256);
    await expect(loadAndVerifyPayloadBundle(
      root,
      { payload_release_1: firstRelease.publicKeyBase64 },
      "5.0.0",
      { requiredComponents: ["master", "touch"] },
    )).resolves.toBeDefined();
    expect(fs.readdirSync(root).some((entry) => /\.(?:tmp|bak)$/.test(entry))).toBe(false);
  });

  it("rejects environment files and private-key material before signing", async () => {
    const environmentBundle = createBundle(false);
    fs.writeFileSync(path.join(environmentBundle, "Master", ".env"), "TOKEN=secret");
    await expect(createPayloadManifest(environmentBundle, releaseOptions)).rejects.toThrow(
      "forbidden secret-like path",
    );

    const privateKeyBundle = createBundle(false);
    fs.writeFileSync(
      path.join(privateKeyBundle, "Master", "notes.txt"),
      "-----BEGIN PRIVATE KEY-----\nnot-a-real-key",
    );
    await expect(createPayloadManifest(privateKeyBundle, releaseOptions)).rejects.toThrow(
      "private-key material",
    );
  });

  it("rejects undeclared bundle-root files", async () => {
    const root = createBundle(false);
    fs.writeFileSync(path.join(root, "run-me.exe"), "unexpected");
    await expect(createPayloadManifest(root, releaseOptions)).rejects.toThrow(
      "unexpected root entry",
    );
  });

  it("loads only an external Ed25519 PKCS#8 key", async () => {
    const root = createBundle(false);
    const keyDirectory = createTemporaryDirectory("clickflash-signing-key-");
    const privateKey = createSigningKey();
    const pem = privateKey.export({ format: "pem", type: "pkcs8" });
    const externalKeyPath = path.join(keyDirectory, "payload.private.pem");
    fs.writeFileSync(externalKeyPath, pem, { mode: 0o600 });

    await expect(readPayloadSigningPrivateKey(externalKeyPath, root)).resolves.toMatchObject({
      asymmetricKeyType: "ed25519",
    });

    const bundledKeyPath = path.join(root, "payload.private.pem");
    fs.writeFileSync(bundledKeyPath, pem, { mode: 0o600 });
    await expect(readPayloadSigningPrivateKey(bundledKeyPath, root)).rejects.toThrow(
      "outside the release bundle",
    );
  });

  it("rejects non-Ed25519 private keys", () => {
    const rsaKey = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
    const rsaPem = rsaKey.export({ format: "pem", type: "pkcs8" });
    expect(() => parsePayloadSigningPrivateKey(rsaPem)).toThrow(
      "Payload signing key must use Ed25519",
    );
  });

  it("requires every explicit CLI input and rejects duplicates", () => {
    const validArguments = [
      "--bundle", "C:/release",
      "--private-key", "D:/keys/payload.pem",
      "--key-id", "payload_2026_1",
      "--release-id", "release_2026_07_17",
      "--version", "2.0.0",
      "--min-installer-version", "5.0.0",
      "--created-at", "2026-07-17T00:00:00.000Z",
    ];
    expect(parsePayloadReleaseArguments(validArguments)).toMatchObject({
      keyId: "payload_2026_1",
      releaseId: "release_2026_07_17",
    });
    expect(() => parsePayloadReleaseArguments(validArguments.slice(0, -2))).toThrow(
      "Missing required option: --created-at",
    );
    expect(() => parsePayloadReleaseArguments([
      ...validArguments,
      "--key-id", "duplicate",
    ])).toThrow("Duplicate option: --key-id");
  });

  it("runs the operator CLI without exposing private key material", async () => {
    const root = createBundle(false);
    const keyDirectory = createTemporaryDirectory("clickflash-cli-key-");
    const privateKeyPath = path.join(keyDirectory, "payload.private.pem");
    fs.writeFileSync(privateKeyPath, createSigningKey().export({
      format: "pem",
      type: "pkcs8",
    }), { mode: 0o600 });
    const output: string[] = [];
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });

    try {
      await runPayloadReleaseCli([
        "--bundle", root,
        "--private-key", privateKeyPath,
        "--key-id", "payload_cli_1",
        "--release-id", releaseOptions.releaseId,
        "--version", releaseOptions.version,
        "--min-installer-version", releaseOptions.minInstallerVersion,
        "--created-at", releaseOptions.createdAt,
      ]);
    } finally {
      stdout.mockRestore();
    }

    const result = JSON.parse(output.join("")) as Record<string, unknown>;
    expect(result).toMatchObject({
      success: true,
      keyId: "payload_cli_1",
      releaseId: releaseOptions.releaseId,
      components: ["master"],
    });
    expect(String(result.publicKeyBase64)).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    expect(output.join("")).not.toContain("BEGIN PRIVATE KEY");
    expect(fs.existsSync(path.join(root, PAYLOAD_MANIFEST_FILENAME))).toBe(true);
  });
});
