import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  APPLICATION_LAYOUT,
  createApplicationConfigurationFiles,
  getMissingApplicationExecutables,
  getCanonicalApplicationExecutable,
  type TransactionFileOperations,
  writeFilesTransactionally,
} from "./installer-application-config";
import { writeEnvConfigSchema } from "./installer-ipc-schemas";

const createdDirectories: string[] = [];

function createDeploymentRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clickflash-deployment-"));
  createdDirectories.push(root);
  for (const layout of Object.values(APPLICATION_LAYOUT)) {
    const directory = path.join(root, layout.directory);
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, layout.executable), "signed-payload-placeholder");
  }
  return root;
}

function createInput(root: string) {
  return writeEnvConfigSchema.parse({
    targetDir: root,
    selectedApps: ["master", "touch", "management"],
    deskId: "MASTER_TUNIS_01",
    siteCode: "TUNIS_01",
    tenantId: "tenant-1",
    timezone: "Africa/Tunis",
    location: "Tunis #1",
    currency: "tnd",
  });
}

function createOperations(renameSync: TransactionFileOperations["renameSync"]): TransactionFileOperations {
  return {
    existsSync: fs.existsSync,
    lstatSync: fs.lstatSync,
    openSync: fs.openSync,
    writeFileSync: fs.writeFileSync,
    fsyncSync: fs.fsyncSync,
    closeSync: fs.closeSync,
    copyFileSync: fs.copyFileSync,
    renameSync,
    unlinkSync: fs.unlinkSync,
  };
}

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("transactional application configuration", () => {
  it("recognizes only the canonical Master and Touch payload layout", () => {
    const root = createDeploymentRoot();

    expect(getMissingApplicationExecutables(root, ["master", "touch"])).toEqual([]);
    expect(getCanonicalApplicationExecutable(root, "master")).toBe(
      path.join(root, "Master", "ClickFlash Master OS.exe"),
    );

    fs.renameSync(
      path.join(root, "Touch", "ClickFlash - Touch Kiosk.exe"),
      path.join(root, "Touch", "unexpected.exe"),
    );
    expect(getMissingApplicationExecutables(root, ["master", "touch"])).toEqual([
      path.join("Touch", "ClickFlash - Touch Kiosk.exe"),
    ]);
  });

  it("builds allowlisted non-secret environment files and a digest manifest", () => {
    const root = createDeploymentRoot();
    const files = createApplicationConfigurationFiles(
      createInput(root),
      "https://hub.clickflash.app",
      "5.0.0",
      "2026-07-17T00:00:00.000Z",
    );
    const combined = files.map((file) => file.content).join("\n");

    expect(files.map((file) => file.relativePath)).toEqual([
      "Master/.env",
      "Touch/.env",
      "clickflash-installation.json",
    ]);
    expect(combined).toContain('LOCATION_NAME="Tunis #1"');
    expect(combined).toContain('CLOUD_API_URL="https://hub.clickflash.app"');
    expect(combined).not.toMatch(/access_token|refresh_token|license|password|secret/i);
    expect(JSON.parse(files[2].content).environment_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("restores every prior file when a later commit fails", () => {
    const root = createDeploymentRoot();
    const targets = [
      path.join(root, "Master", ".env"),
      path.join(root, "Touch", ".env"),
      path.join(root, "clickflash-installation.json"),
    ];
    targets.forEach((target, index) => fs.writeFileSync(target, `old-${index}`));
    const files = createApplicationConfigurationFiles(
      createInput(root),
      "https://hub.clickflash.app",
      "5.0.0",
    );
    const operations = createOperations((source, destination) => {
      if (source.endsWith(".tmp") && destination === targets[1]) {
        throw new Error("simulated second-file commit failure");
      }
      fs.renameSync(source, destination);
    });

    expect(() => writeFilesTransactionally(root, files, operations)).toThrow(
      "simulated second-file commit failure",
    );
    targets.forEach((target, index) => {
      expect(fs.readFileSync(target, "utf8")).toBe(`old-${index}`);
    });
    for (const directory of [root, path.join(root, "Master"), path.join(root, "Touch")]) {
      expect(fs.readdirSync(directory).some((entry) => /\.(?:tmp|bak)$/.test(entry))).toBe(false);
    }
  });

  it("preserves recovery backups when rollback cannot restore a prior file", () => {
    const root = createDeploymentRoot();
    const masterTarget = path.join(root, "Master", ".env");
    const touchTarget = path.join(root, "Touch", ".env");
    fs.writeFileSync(masterTarget, "old-master");
    fs.writeFileSync(touchTarget, "old-touch");
    const files = createApplicationConfigurationFiles(
      createInput(root),
      "https://hub.clickflash.app",
      "5.0.0",
    );
    const operations = createOperations((source, destination) => {
      if (source.endsWith(".tmp") && destination === touchTarget) {
        throw new Error("simulated commit failure");
      }
      if (source.endsWith(".bak") && destination === masterTarget) {
        throw new Error("simulated rollback failure");
      }
      fs.renameSync(source, destination);
    });

    expect(() => writeFilesTransactionally(root, files, operations)).toThrow(
      "simulated commit failure",
    );
    expect(fs.readdirSync(path.join(root, "Master")).some((entry) => entry.endsWith(".bak"))).toBe(true);
  });
});
