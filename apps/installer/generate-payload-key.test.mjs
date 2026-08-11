import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  generatePayloadKey,
  REPOSITORY_ROOT,
  resolveOutputDirectory,
} from "./scripts/generate-payload-key.mjs";

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("payload signing key generation boundary", () => {
  it("requires an explicit external output directory", () => {
    expect(() => resolveOutputDirectory({ argv: [], env: {} })).toThrow(
      /CLICKFLASH_PAYLOAD_KEY_DIR/,
    );
  });

  it("rejects output anywhere inside the repository", () => {
    expect(() =>
      generatePayloadKey({
        outputDirectory: path.join(REPOSITORY_ROOT, "apps", "installer"),
      }),
    ).toThrow(/inside the ClickFlash repository/);
  });

  it("writes a new key only to an external directory and refuses overwrite", () => {
    const outputDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "clickflash-payload-key-"),
    );
    temporaryDirectories.push(outputDirectory);

    const result = generatePayloadKey({ outputDirectory });

    expect(result.keyPath).toBe(
      path.join(fs.realpathSync(outputDirectory), "payload-private-key.pem"),
    );
    expect(fs.existsSync(result.keyPath)).toBe(true);
    expect(result.publicKeyBase64).toMatch(/^[A-Za-z0-9+/]{43}=$/);

    expect(() => generatePayloadKey({ outputDirectory })).toThrow(
      /EEXIST|file already exists/i,
    );
  });
});
