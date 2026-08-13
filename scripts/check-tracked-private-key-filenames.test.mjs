import assert from "node:assert/strict";
import test from "node:test";
import {
  findTrackedPrivateKeyFilenames,
  isPrivateKeyFilename,
} from "./check-tracked-private-key-filenames.mjs";

test("detects private-key filenames without opening files", () => {
  const trackedPaths = [
    "payload_private_key.pem",
    "apps/installer/payload-private-key.pem",
    "secrets/id_ed25519",
    "signing/release.p12",
    "android/upload.keystore",
  ];

  assert.deepEqual(findTrackedPrivateKeyFilenames(trackedPaths), trackedPaths);
});

test("allows public keys and certificates", () => {
  const allowedPaths = [
    "apps/installer/license-public-key.txt",
    "certificates/root-ca.pem",
    "docs/public.key.example",
  ];

  for (const candidatePath of allowedPaths) {
    assert.equal(isPrivateKeyFilename(candidatePath), false);
  }
});

test("normalizes Windows path separators", () => {
  assert.equal(
    isPrivateKeyFilename("apps\\installer\\payload_private_key.pem"),
    true,
  );
});
