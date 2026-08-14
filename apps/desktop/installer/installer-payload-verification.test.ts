import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  loadAndVerifyPayloadBundle,
  PAYLOAD_MANIFEST_FILENAME,
  PAYLOAD_SIGNATURE_DOMAIN,
  type PayloadManifest,
  verifyPayloadEnvelope,
} from "./installer-payload-verification";

const createdDirectories: string[] = [];

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createSigningKey() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ format: "der", type: "spki" });
  return {
    privateKey,
    publicKeyBase64: publicDer.subarray(publicDer.length - 32).toString("base64"),
  };
}

function createBundle(): { root: string; manifest: PayloadManifest } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clickflash-payload-"));
  createdDirectories.push(root);
  fs.mkdirSync(path.join(root, "Master"));
  fs.mkdirSync(path.join(root, "Touch"));
  fs.writeFileSync(path.join(root, "Master", "ClickFlash Master OS.exe"), "master-release");
  fs.writeFileSync(path.join(root, "Master", "resources.bin"), "master-resources");
  fs.writeFileSync(path.join(root, "Touch", "ClickFlash - Touch Kiosk.exe"), "touch-release");

  return {
    root,
    manifest: {
      schema_version: 1,
      release_id: "release_2026_07_17",
      version: "5.0.0",
      platform: "win32",
      arch: "x64",
      created_at: "2026-07-17T00:00:00.000Z",
      min_installer_version: "5.0.0",
      components: [
        {
          id: "master",
          source_directory: "Master",
          executable: "ClickFlash Master OS.exe",
          files: [
            { path: "ClickFlash Master OS.exe", size: 14, sha256: sha256("master-release") },
            { path: "resources.bin", size: 16, sha256: sha256("master-resources") },
          ],
        },
        {
          id: "touch",
          source_directory: "Touch",
          executable: "ClickFlash - Touch Kiosk.exe",
          files: [
            { path: "ClickFlash - Touch Kiosk.exe", size: 13, sha256: sha256("touch-release") },
          ],
        },
      ],
    },
  };
}

function createEnvelope(manifest: unknown, privateKey: crypto.KeyObject, keyId = "payload_test_1") {
  const manifestBytes = Buffer.from(JSON.stringify(manifest), "utf8");
  const signedPayload = Buffer.concat([
    Buffer.from(PAYLOAD_SIGNATURE_DOMAIN, "utf8"),
    Buffer.from([0]),
    manifestBytes,
  ]);
  return {
    schema_version: 1 as const,
    algorithm: "Ed25519" as const,
    key_id: keyId,
    manifest: manifestBytes.toString("base64url"),
    signature: crypto.sign(null, signedPayload, privateKey).toString("base64url"),
  };
}

function writeEnvelope(root: string, envelope: unknown): void {
  fs.writeFileSync(path.join(root, PAYLOAD_MANIFEST_FILENAME), JSON.stringify(envelope));
}

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("signed application payload verification", () => {
  it("verifies a signed bundle and every declared file", async () => {
    const signingKey = createSigningKey();
    const { root, manifest } = createBundle();
    writeEnvelope(root, createEnvelope(manifest, signingKey.privateKey));

    const verified = await loadAndVerifyPayloadBundle(
      root,
      { payload_test_1: signingKey.publicKeyBase64 },
      "5.0.0",
      { requiredComponents: ["master", "touch"] },
    );

    expect(verified.summary).toMatchObject({
      releaseId: "release_2026_07_17",
      version: "5.0.0",
      keyId: "payload_test_1",
      components: ["master", "touch"],
      fileCount: 3,
      totalBytes: 43,
    });
    expect(verified.summary.manifestSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects a signature made by an untrusted key", () => {
    const trustedKey = createSigningKey();
    const attackerKey = createSigningKey();
    const { manifest } = createBundle();
    const envelope = createEnvelope(manifest, attackerKey.privateKey);

    expect(() => verifyPayloadEnvelope(
      envelope,
      { payload_test_1: trustedKey.publicKeyBase64 },
      "5.0.0",
    )).toThrow("Payload manifest signature is invalid");
  });

  it("fails closed when no payload trust root is configured", async () => {
    const signingKey = createSigningKey();
    const { root, manifest } = createBundle();
    writeEnvelope(root, createEnvelope(manifest, signingKey.privateKey));

    await expect(loadAndVerifyPayloadBundle(root, {}, "5.0.0")).rejects.toThrow(
      "Payload trust root is not configured",
    );
  });

  it("rejects signed manifests containing traversal paths", () => {
    const signingKey = createSigningKey();
    const { manifest } = createBundle();
    const unsafeManifest = structuredClone(manifest) as PayloadManifest;
    unsafeManifest.components[0].files[0].path = "../ClickFlash Master OS.exe";

    expect(() => verifyPayloadEnvelope(
      createEnvelope(unsafeManifest, signingKey.privateKey),
      { payload_test_1: signingKey.publicKeyBase64 },
      "5.0.0",
    )).toThrow();
  });

  it("rejects a payload file changed after the manifest was signed", async () => {
    const signingKey = createSigningKey();
    const { root, manifest } = createBundle();
    writeEnvelope(root, createEnvelope(manifest, signingKey.privateKey));
    fs.writeFileSync(path.join(root, "Master", "resources.bin"), "tampered-content!");

    await expect(loadAndVerifyPayloadBundle(
      root,
      { payload_test_1: signingKey.publicKeyBase64 },
      "5.0.0",
    )).rejects.toThrow(/Payload file (?:size|hash) mismatch/);
  });

  it("rejects undeclared files inside application components", async () => {
    const signingKey = createSigningKey();
    const { root, manifest } = createBundle();
    writeEnvelope(root, createEnvelope(manifest, signingKey.privateKey));
    fs.writeFileSync(path.join(root, "Touch", "injected.dll"), "malware");

    await expect(loadAndVerifyPayloadBundle(
      root,
      { payload_test_1: signingKey.publicKeyBase64 },
      "5.0.0",
    )).rejects.toThrow("Payload contains an undeclared file");
  });

  it("rejects undeclared entries at the bundle root", async () => {
    const signingKey = createSigningKey();
    const { root, manifest } = createBundle();
    writeEnvelope(root, createEnvelope(manifest, signingKey.privateKey));
    fs.writeFileSync(path.join(root, "unsigned-launcher.exe"), "unexpected");

    await expect(loadAndVerifyPayloadBundle(
      root,
      { payload_test_1: signingKey.publicKeyBase64 },
      "5.0.0",
    )).rejects.toThrow("undeclared root entry");
  });

  it("rejects a Touch directory omitted from the signed manifest", async () => {
    const signingKey = createSigningKey();
    const { root, manifest } = createBundle();
    const masterOnlyManifest = structuredClone(manifest);
    masterOnlyManifest.components = masterOnlyManifest.components.filter(
      (component) => component.id === "master",
    );
    writeEnvelope(root, createEnvelope(masterOnlyManifest, signingKey.privateKey));

    await expect(loadAndVerifyPayloadBundle(
      root,
      { payload_test_1: signingKey.publicKeyBase64 },
      "5.0.0",
    )).rejects.toThrow("undeclared Touch component");
  });

  it("allows only explicitly named post-verification configuration files", async () => {
    const signingKey = createSigningKey();
    const { root, manifest } = createBundle();
    writeEnvelope(root, createEnvelope(manifest, signingKey.privateKey));
    fs.writeFileSync(path.join(root, "Master", ".env"), "DESK_ID=test");

    await expect(loadAndVerifyPayloadBundle(
      root,
      { payload_test_1: signingKey.publicKeyBase64 },
      "5.0.0",
      { allowedExtraPaths: { master: [".env"] } },
    )).resolves.toBeDefined();
  });

  it("enforces the payload minimum Installer version", () => {
    const signingKey = createSigningKey();
    const { manifest } = createBundle();
    manifest.min_installer_version = "6.0.0";

    expect(() => verifyPayloadEnvelope(
      createEnvelope(manifest, signingKey.privateKey),
      { payload_test_1: signingKey.publicKeyBase64 },
      "5.0.0",
    )).toThrow("Payload requires Installer 6.0.0 or newer");
  });
});
