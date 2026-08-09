import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  INSTALLATION_CONFIG_FILENAME,
  installOrRepairPayloadBundle,
  uninstallPayloadBundle,
  recoverInterruptedTransaction,
} from "./installer-payload-installation";
import {
  createSignedPayloadRelease,
  type PayloadReleaseOptions,
} from "./installer-payload-release";
import { loadAndVerifyPayloadBundle } from "./installer-payload-verification";

const createdDirectories: string[] = [];
const releaseOptions: PayloadReleaseOptions = {
  releaseId: "release_install_test",
  version: "2.0.0",
  createdAt: "2026-07-17T00:00:00.000Z",
  minInstallerVersion: "5.0.0",
};

function createTemporaryDirectory(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  createdDirectories.push(directory);
  return directory;
}

function createBundle(): string {
  const root = createTemporaryDirectory("clickflash-install-source-");
  fs.mkdirSync(path.join(root, "Master", "resources"), { recursive: true });
  fs.mkdirSync(path.join(root, "Touch"));
  fs.writeFileSync(path.join(root, "Master", "ClickFlash Master OS.exe"), "master-release");
  fs.writeFileSync(path.join(root, "Master", "resources", "app.asar"), "master-asar");
  fs.writeFileSync(path.join(root, "Touch", "ClickFlash - Touch Kiosk.exe"), "touch-release");
  return root;
}

function createSigningKey() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ format: "der", type: "spki" });
  return {
    privateKey,
    publicKeyBase64: publicDer.subarray(publicDer.length - 32).toString("base64"),
  };
}

async function signBundle(
  root: string,
  privateKey: crypto.KeyObject,
  options = releaseOptions,
): Promise<void> {
  await createSignedPayloadRelease(root, options, privateKey, "payload_install_test");
}

function transactionEntries(target: string): string[] {
  const prefix = `.${path.basename(target)}.clickflash-`;
  return fs.readdirSync(path.dirname(target)).filter((entry) => entry.startsWith(prefix));
}

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("transactional payload installation", () => {
  it("installs an approved bundle through a verified same-volume stage", async () => {
    const source = createBundle();
    const target = createTemporaryDirectory("clickflash-install-target-");
    const signingKey = createSigningKey();
    await signBundle(source, signingKey.privateKey);

    const result = await installOrRepairPayloadBundle(
      source,
      target,
      { payload_install_test: signingKey.publicKeyBase64 },
      "5.0.0",
      ["master", "touch"],
    );

    expect(result.mode).toBe("install");
    expect(fs.readFileSync(
      path.join(target, "Master", "ClickFlash Master OS.exe"),
      "utf8",
    )).toBe("master-release");
    expect(fs.existsSync(path.join(target, "Touch", "ClickFlash - Touch Kiosk.exe"))).toBe(true);
    expect(transactionEntries(target)).toEqual([]);
  });

  it("repairs missing or corrupt payload files while preserving configuration", async () => {
    const source = createBundle();
    const target = createTemporaryDirectory("clickflash-repair-target-");
    const signingKey = createSigningKey();
    const trustRoots = { payload_install_test: signingKey.publicKeyBase64 };
    await signBundle(source, signingKey.privateKey);
    await installOrRepairPayloadBundle(source, target, trustRoots, "5.0.0", ["master", "touch"]);
    fs.writeFileSync(path.join(target, "Master", ".env"), "DESK_ID=preserved\n");
    fs.writeFileSync(path.join(target, "Touch", ".env"), "TOUCH_ID=preserved\n");
    fs.writeFileSync(path.join(target, INSTALLATION_CONFIG_FILENAME), "preserved-config");
    fs.writeFileSync(path.join(target, "Master", "ClickFlash Master OS.exe"), "corrupt");
    fs.unlinkSync(path.join(target, "Master", "resources", "app.asar"));

    const result = await installOrRepairPayloadBundle(
      source,
      target,
      trustRoots,
      "5.0.0",
      ["master", "touch"],
    );

    expect(result.mode).toBe("repair");
    expect(fs.readFileSync(path.join(target, "Master", "ClickFlash Master OS.exe"), "utf8"))
      .toBe("master-release");
    expect(fs.readFileSync(path.join(target, "Master", "resources", "app.asar"), "utf8"))
      .toBe("master-asar");
    expect(fs.readFileSync(path.join(target, "Master", ".env"), "utf8"))
      .toBe("DESK_ID=preserved\n");
    expect(fs.readFileSync(path.join(target, INSTALLATION_CONFIG_FILENAME), "utf8"))
      .toBe("preserved-config");
    expect(transactionEntries(target)).toEqual([]);
  });

  it("restores the prior installation when post-swap verification fails", async () => {
    const source = createBundle();
    const target = createTemporaryDirectory("clickflash-rollback-target-");
    const signingKey = createSigningKey();
    const trustRoots = { payload_install_test: signingKey.publicKeyBase64 };
    await signBundle(source, signingKey.privateKey);
    await installOrRepairPayloadBundle(source, target, trustRoots, "5.0.0", ["master", "touch"]);
    fs.writeFileSync(path.join(target, "Master", "ClickFlash Master OS.exe"), "prior-corrupt-state");

    await expect(installOrRepairPayloadBundle(
      source,
      target,
      trustRoots,
      "5.0.0",
      ["master", "touch"],
      {
        afterTargetSwap: (installedDirectory) => {
          fs.writeFileSync(
            path.join(installedDirectory, "Master", "ClickFlash Master OS.exe"),
            "post-swap-corruption",
          );
        },
      },
    )).rejects.toThrow("Payload file size mismatch");

    expect(fs.readFileSync(path.join(target, "Master", "ClickFlash Master OS.exe"), "utf8"))
      .toBe("prior-corrupt-state");
    expect(transactionEntries(target)).toEqual([]);
  });

  it("refuses unmanaged non-empty destinations without modifying them", async () => {
    const source = createBundle();
    const target = createTemporaryDirectory("clickflash-unmanaged-target-");
    const signingKey = createSigningKey();
    await signBundle(source, signingKey.privateKey);
    fs.writeFileSync(path.join(target, "customer-data.txt"), "preserve me");

    await expect(installOrRepairPayloadBundle(
      source,
      target,
      { payload_install_test: signingKey.publicKeyBase64 },
      "5.0.0",
      ["master", "touch"],
    )).rejects.toThrow("not empty or a verified ClickFlash installation");
    expect(fs.readFileSync(path.join(target, "customer-data.txt"), "utf8")).toBe("preserve me");
    expect(transactionEntries(target)).toEqual([]);
  });

  it("allows version-changing upgrades and preserves configuration", async () => {
    const firstSource = createBundle();
    const secondSource = createBundle();
    const target = createTemporaryDirectory("clickflash-upgrade-target-");
    const signingKey = createSigningKey();
    const trustRoots = { payload_install_test: signingKey.publicKeyBase64 };
    await signBundle(firstSource, signingKey.privateKey);
    await signBundle(secondSource, signingKey.privateKey, {
      ...releaseOptions,
      releaseId: "release_install_test_2",
      version: "2.1.0",
    });
    await installOrRepairPayloadBundle(
      firstSource,
      target,
      trustRoots,
      "5.0.0",
      ["master", "touch"],
    );
    fs.writeFileSync(path.join(target, "Master", ".env"), "DESK_ID=upgrade\n");
    
    // Change a file in second source so we can verify the upgrade
    fs.writeFileSync(path.join(secondSource, "Master", "ClickFlash Master OS.exe"), "master-release-v2");
    await signBundle(secondSource, signingKey.privateKey, {
      ...releaseOptions,
      releaseId: "release_install_test_2",
      version: "2.1.0",
    });

    const result = await installOrRepairPayloadBundle(
      secondSource,
      target,
      trustRoots,
      "5.0.0",
      ["master", "touch"],
    );

    expect(result.mode).toBe("upgrade");
    expect(fs.readFileSync(path.join(target, "Master", "ClickFlash Master OS.exe"), "utf8"))
      .toBe("master-release-v2");
    expect(fs.readFileSync(path.join(target, "Master", ".env"), "utf8"))
      .toBe("DESK_ID=upgrade\n");
    expect(transactionEntries(target)).toEqual([]);
  });

  it("recovers an interrupted transaction when target is missing but backup exists", async () => {
    const source = createBundle();
    const target = createTemporaryDirectory("clickflash-recover-target-");
    const signingKey = createSigningKey();
    const trustRoots = { payload_install_test: signingKey.publicKeyBase64 };
    await signBundle(source, signingKey.privateKey);
    await installOrRepairPayloadBundle(source, target, trustRoots, "5.0.0", ["master", "touch"]);

    // Manually simulate a reboot mid-swap
    const parent = path.dirname(target);
    const backupDir = path.join(parent, `.${path.basename(target)}.clickflash-backup-12345678`);
    const stageDir = path.join(parent, `.${path.basename(target)}.clickflash-stage-12345678`);
    
    fs.renameSync(target, backupDir);
    fs.mkdirSync(stageDir); // Fake stage directory

    await recoverInterruptedTransaction(target);

    // Should have restored target and cleaned up stage
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.existsSync(backupDir)).toBe(false);
    expect(fs.existsSync(stageDir)).toBe(false);
    expect(fs.readFileSync(path.join(target, "Master", "ClickFlash Master OS.exe"), "utf8"))
      .toBe("master-release");
  });

  it("does nothing during recovery if target exists and is valid", async () => {
    const source = createBundle();
    const target = createTemporaryDirectory("clickflash-recover-target-noop-");
    const signingKey = createSigningKey();
    const trustRoots = { payload_install_test: signingKey.publicKeyBase64 };
    await signBundle(source, signingKey.privateKey);
    await installOrRepairPayloadBundle(source, target, trustRoots, "5.0.0", ["master", "touch"]);

    const parent = path.dirname(target);
    const backupDir = path.join(parent, `.${path.basename(target)}.clickflash-backup-12345678`);
    fs.mkdirSync(backupDir);

    await recoverInterruptedTransaction(target);

    // Backup should be ignored since target is non-empty
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.existsSync(backupDir)).toBe(true);
    // Cleanup fake backup for next tests
    fs.rmSync(backupDir, { recursive: true, force: true });
  });
});

describe("safe payload uninstallation", () => {
  it("safely uninstalls a verified payload bundle and cleans up", async () => {
    const source = createBundle();
    const target = createTemporaryDirectory("clickflash-uninstall-target-");
    const signingKey = createSigningKey();
    const trustRoots = { payload_install_test: signingKey.publicKeyBase64 };
    await signBundle(source, signingKey.privateKey);
    await installOrRepairPayloadBundle(source, target, trustRoots, "5.0.0", ["master", "touch"]);

    expect(fs.existsSync(target)).toBe(true);
    
    const result = await uninstallPayloadBundle(
      target,
      (await loadAndVerifyPayloadBundle(source, trustRoots, "5.0.0", { requiredComponents: ["master", "touch"] })).summary.manifestSha256,
      trustRoots,
      "5.0.0",
      ["master", "touch"],
    );

    expect(result.directory).toBe(target);
    expect(result.recoveryBackup).toBeUndefined();
    expect(fs.existsSync(target)).toBe(false);
    expect(transactionEntries(target)).toEqual([]);
  });

  it("refuses to uninstall an unverified directory", async () => {
    const source = createBundle();
    const target = createTemporaryDirectory("clickflash-uninstall-unverified-");
    const signingKey = createSigningKey();
    const trustRoots = { payload_install_test: signingKey.publicKeyBase64 };
    await signBundle(source, signingKey.privateKey);
    
    // Create an invalid directory instead of a real install
    fs.writeFileSync(path.join(target, "unrelated.txt"), "preserve me");

    // We need the manifest hash to pass into uninstall, so load the source bundle
    const sourceBundle = await loadAndVerifyPayloadBundle(source, trustRoots, "5.0.0", { requiredComponents: ["master", "touch"] });

    await expect(uninstallPayloadBundle(
      target,
      sourceBundle.summary.manifestSha256,
      trustRoots,
      "5.0.0",
      ["master", "touch"],
    )).rejects.toThrow("Refused to uninstall an unverified directory");
    
    // Directory should remain untouched
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.readFileSync(path.join(target, "unrelated.txt"), "utf8")).toBe("preserve me");
  });
});
