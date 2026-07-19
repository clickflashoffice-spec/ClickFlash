import {
  generateKeyPairSync,
  sign,
} from "crypto";
import { validateProtectedLicenseConfig } from "../../../desktop-license";

function createFixture(machineId = "machine-1") {
  const pair = generateKeyPairSync("ed25519");
  const payload = {
    plan: "pro" as const,
    maxMasters: 5,
    expiresAt: "2099-12-31",
    createdAt: "2026-07-18T00:00:00.000Z",
    machineId,
    nonce: "fixture-1",
  };
  const payloadBytes = Buffer.from(JSON.stringify(payload));
  const signature = sign(null, payloadBytes, pair.privateKey);
  const key = `CF-LIVE-${payloadBytes.toString("base64url")}.${signature.toString("base64url")}`;
  const publicDer = pair.publicKey.export({ type: "spki", format: "der" });
  const publicKey = Buffer.from(publicDer).subarray(-32).toString("base64");
  const config = {
    deskId: "MASTER_1",
    license: {
      plan: payload.plan,
      max_masters: payload.maxMasters,
      expires_at: payload.expiresAt,
      machine_id: machineId,
      encrypted_key: Buffer.from("encrypted-fixture").toString("base64"),
      key_protection: "electron-safe-storage-v1" as const,
    },
  };
  return { config, key, publicKey };
}

describe("Master protected desktop license", () => {
  it("accepts a matching hardware-bound signed activation", () => {
    const fixture = createFixture();
    const result = validateProtectedLicenseConfig(
      fixture.config,
      () => fixture.key,
      fixture.publicKey,
      "machine-1",
    );

    expect(result.valid).toBe(true);
    expect(result.license?.plan).toBe("pro");
  });

  it("rejects activation copied to another machine", () => {
    const fixture = createFixture();
    const result = validateProtectedLicenseConfig(
      fixture.config,
      () => fixture.key,
      fixture.publicKey,
      "machine-2",
    );

    expect(result).toEqual({ valid: false, error: "Installer activation belongs to another machine" });
  });

  it("rejects unsigned metadata changes", () => {
    const fixture = createFixture();
    const result = validateProtectedLicenseConfig(
      { ...fixture.config, license: { ...fixture.config.license, max_masters: 100 } },
      () => fixture.key,
      fixture.publicKey,
      "machine-1",
    );

    expect(result).toEqual({
      valid: false,
      error: "Installer activation metadata does not match its signature",
    });
  });

  it("rejects activation that cannot be decrypted", () => {
    const fixture = createFixture();
    const result = validateProtectedLicenseConfig(
      fixture.config,
      () => { throw new Error("decrypt failed"); },
      fixture.publicKey,
      "machine-1",
    );

    expect(result).toEqual({
      valid: false,
      error: "OS-protected activation could not be decrypted",
    });
  });
});
