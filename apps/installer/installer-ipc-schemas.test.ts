import { describe, expect, it } from "vitest";

import {
  fleetRegistrationSchema,
  heartbeatSchema,
  launchAppsSchema,
  pairingExchangeSchema,
  registerWithHubSchema,
  writeEnvConfigSchema,
} from "./installer-ipc-schemas";

describe("Installer IPC schemas", () => {
  it("normalizes and accepts the supported Hub registration contract", () => {
    const result = registerWithHubSchema.parse({
      desk_id: "MASTER_TUNIS_01",
      site_code: "TUNIS_01",
      name: "Tunis Studio",
      location: "Tunis",
      country: "tn",
      timezone: "Africa/Tunis",
      currency: "tnd",
      hardware_fingerprint: "a".repeat(32),
      version: "5.0.0",
      mode: "install",
      access_token: "token",
    });

    expect(result.country).toBe("TN");
    expect(result.currency).toBe("TND");
  });

  it("rejects unknown fields and control-character injection", () => {
    expect(() => heartbeatSchema.parse({
      desk_id: "MASTER_1",
      status: "Online",
      version: "5.0.0",
      access_token: "token\r\nInjected: yes",
      unexpected: true,
    })).toThrow();
  });

  it("bounds pairing fields while leaving private-host semantics to the resolver", () => {
    expect(pairingExchangeSchema.safeParse({
      masterHost: "8.8.8.8",
      masterPort: 8090,
      masterDeskId: "MASTER_1",
      kioskId: "KIOSK_1",
      hardwareFingerprint: "a".repeat(32),
    }).success).toBe(true);

    expect(fleetRegistrationSchema.safeParse({
      deskId: "MASTER_1",
      name: "Studio",
      location: "Tunis",
      country: "TN",
      timezone: "Africa/Tunis",
      currency: "TND",
      cloudApiUrl: "https://hub.clickflash.app",
      token: "x".repeat(4_097),
    }).success).toBe(false);
  });

  it("accepts semantic application configuration and rejects arbitrary env or executable paths", () => {
    expect(writeEnvConfigSchema.safeParse({
      targetDir: "C:\\ClickFlash",
      selectedApps: ["master", "touch"],
      deskId: "MASTER_TUNIS_01",
      siteCode: "TUNIS_01",
      tenantId: "tenant-1",
      timezone: "Africa/Tunis",
      location: "Tunis",
      currency: "tnd",
    }).success).toBe(true);

    expect(writeEnvConfigSchema.safeParse({
      targetDir: "C:\\ClickFlash",
      selectedApps: ["touch"],
      deskId: "MASTER_TUNIS_01",
      siteCode: "TUNIS_01",
      tenantId: null,
      timezone: "Africa/Tunis",
      location: "Tunis",
      currency: "TND",
      envData: { ATTACKER_CONTROLLED: "true" },
    }).success).toBe(false);

    expect(launchAppsSchema.safeParse({
      components: ["master", "touch"],
    }).success).toBe(true);
    expect(launchAppsSchema.safeParse({
      components: ["master"],
      master: "C:\\Windows\\System32\\calc.exe",
    }).success).toBe(false);
  });
});
