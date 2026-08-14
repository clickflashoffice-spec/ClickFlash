import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  protectInstallerConfig,
  writeJsonAtomic,
} from "./installer-config";
import { installerConfigSchema } from "./installer-ipc-schemas";

const createdDirectories: string[] = [];

function createConfig() {
  return installerConfigSchema.parse({
    deskId: "MASTER_TUNIS_01",
    studioProfile: {
      studioName: "Tunis Studio",
      location: "Tunis",
      timezone: "Africa/Tunis",
      currency: "TND",
    },
    destination: {
      proposed_id: "MASTER_TUNIS_01",
      site_code: "TUNIS_01",
      name: "Tunis Studio",
      location: "Tunis",
      country: "TN",
      timezone: "Africa/Tunis",
      currency: "TND",
    },
    license: {
      key: "CF-TEST-payload.signature",
      plan: "pro",
      max_masters: 2,
      expires_at: null,
      machine_id: "machine-1",
    },
    hub: { tenant_id: "tenant-1" },
    pairings: [],
    firstSync: { heartbeat_ok: true, r2_test_ok: true },
    version: "5.0.0",
    installedAt: "2026-07-16T00:00:00.000Z",
  });
}

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) {
    for (const entry of fs.readdirSync(directory)) {
      fs.unlinkSync(path.join(directory, entry));
    }
    fs.rmdirSync(directory);
  }
});

describe("Installer configuration persistence", () => {
  it("replaces the plaintext license key with an OS-protected value", () => {
    const config = createConfig();
    const protectedConfig = protectInstallerConfig(
      config,
      (value) => Buffer.from(`protected:${value}`, "utf8"),
    );
    const serialized = JSON.stringify(protectedConfig);

    expect(serialized).not.toContain(config.license.key);
    expect(protectedConfig.license.key_protection).toBe("electron-safe-storage-v1");
    expect(protectedConfig.license.encrypted_key).not.toBe("");
  });

  it("writes one bounded JSON file without leaving temporary files", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "clickflash-installer-config-"));
    createdDirectories.push(directory);
    const target = path.join(directory, "installer-config.json");
    const protectedConfig = protectInstallerConfig(createConfig(), (value) => Buffer.from(value));
    const replacementConfig = protectInstallerConfig(
      { ...createConfig(), installedAt: "2026-07-16T01:00:00.000Z" },
      (value) => Buffer.from(`replacement:${value}`),
    );

    writeJsonAtomic(target, protectedConfig);
    writeJsonAtomic(target, replacementConfig);

    expect(JSON.parse(fs.readFileSync(target, "utf8"))).toEqual(replacementConfig);
    expect(fs.readdirSync(directory)).toEqual(["installer-config.json"]);
  });
});
