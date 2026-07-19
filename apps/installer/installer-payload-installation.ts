import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  isSafeRelativePayloadPath,
  loadAndVerifyPayloadBundle,
  PAYLOAD_MANIFEST_FILENAME,
  type PayloadBundleSummary,
  type PayloadComponentId,
  type PayloadTrustRoots,
  verifyPayloadEnvelope,
} from "./installer-payload-verification";

export const INSTALLATION_CONFIG_FILENAME = "clickflash-installation.json";

const COMPONENT_CONFIGURATION_EXTRAS = {
  master: [".env"],
  touch: [".env"],
} as const;
const MAX_ENVELOPE_BYTES = 6 * 1024 * 1024;

export type PayloadInstallationMode = "install" | "repair";

export interface PayloadInstallationHooks {
  expectedManifestSha256?: string;
  afterStageVerified?: (stageDirectory: string) => void | Promise<void>;
  afterTargetSwap?: (targetDirectory: string) => void | Promise<void>;
}

export interface PayloadInstallationResult {
  directory: string;
  mode: PayloadInstallationMode;
  summary: PayloadBundleSummary;
  recoveryBackup?: string;
}

function pathsEqual(left: string, right: string): boolean {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function isPathWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertSourceAndTargetAreDisjoint(source: string, target: string): void {
  if (
    pathsEqual(source, target)
    || isPathWithin(source, target)
    || isPathWithin(target, source)
  ) {
    throw new Error("Payload source and installation destination must be separate directories");
  }
}

function normalizedComponents(components: readonly PayloadComponentId[]): string {
  return [...components].sort().join(",");
}

function assertSelectedComponentsMatch(
  selectedComponents: readonly PayloadComponentId[],
  availableComponents: readonly PayloadComponentId[],
): void {
  if (normalizedComponents(selectedComponents) !== normalizedComponents(availableComponents)) {
    throw new Error("Selected desktop components must exactly match the signed payload bundle");
  }
}

function fsyncFile(filePath: string): void {
  const descriptor = fs.openSync(filePath, "r+");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function copyFileDurably(source: string, destination: string): void {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  fsyncFile(destination);
}

function getTransactionDirectory(
  targetDirectory: string,
  kind: "stage" | "backup",
  transactionId: string,
): string {
  const parent = path.dirname(targetDirectory);
  const targetName = path.basename(targetDirectory);
  const transactionDirectory = path.join(
    parent,
    `.${targetName}.clickflash-${kind}-${transactionId}`,
  );
  if (!pathsEqual(path.dirname(transactionDirectory), parent)) {
    throw new Error("Payload transaction path escaped the installation parent");
  }
  return transactionDirectory;
}

function removeTransactionDirectory(
  transactionDirectory: string,
  targetDirectory: string,
): void {
  const parent = path.dirname(targetDirectory);
  const targetName = path.basename(targetDirectory);
  const basename = path.basename(transactionDirectory);
  if (
    !pathsEqual(path.dirname(transactionDirectory), parent)
    || !basename.startsWith(`.${targetName}.clickflash-`)
  ) {
    throw new Error("Refused to remove an invalid payload transaction directory");
  }
  if (!fs.existsSync(transactionDirectory)) return;
  const stats = fs.lstatSync(transactionDirectory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error("Payload transaction path is not a regular directory");
  }
  fs.rmSync(transactionDirectory, { recursive: true, force: false });
}

function copyVerifiedPayloadToStage(
  sourceDirectory: string,
  stageDirectory: string,
  manifest: Awaited<ReturnType<typeof loadAndVerifyPayloadBundle>>["manifest"],
): void {
  fs.mkdirSync(stageDirectory, { recursive: false });
  for (const component of manifest.components) {
    for (const file of component.files) {
      copyFileDurably(
        path.join(sourceDirectory, component.source_directory, ...file.path.split("/")),
        path.join(stageDirectory, component.source_directory, ...file.path.split("/")),
      );
    }
  }
  copyFileDurably(
    path.join(sourceDirectory, PAYLOAD_MANIFEST_FILENAME),
    path.join(stageDirectory, PAYLOAD_MANIFEST_FILENAME),
  );
}

function copyPreservedConfiguration(
  targetDirectory: string,
  stageDirectory: string,
  components: readonly PayloadComponentId[],
): void {
  for (const component of components) {
    const directory = component === "master" ? "Master" : "Touch";
    const source = path.join(targetDirectory, directory, ".env");
    if (fs.existsSync(source)) {
      copyFileDurably(source, path.join(stageDirectory, directory, ".env"));
    }
  }
  const installationConfig = path.join(targetDirectory, INSTALLATION_CONFIG_FILENAME);
  if (fs.existsSync(installationConfig)) {
    copyFileDurably(
      installationConfig,
      path.join(stageDirectory, INSTALLATION_CONFIG_FILENAME),
    );
  }
}

async function verifyInstalledPayload(
  directory: string,
  trustRoots: PayloadTrustRoots,
  installerVersion: string,
  requiredComponents: PayloadComponentId[],
) {
  return loadAndVerifyPayloadBundle(directory, trustRoots, installerVersion, {
    requiredComponents,
    allowedExtraPaths: COMPONENT_CONFIGURATION_EXTRAS,
    allowedExtraRootPaths: [INSTALLATION_CONFIG_FILENAME],
  });
}

async function listRepairCandidateFiles(
  componentDirectory: string,
  relativeDirectory = "",
): Promise<string[]> {
  const currentDirectory = relativeDirectory
    ? path.join(componentDirectory, ...relativeDirectory.split("/"))
    : componentDirectory;
  const entries = await fs.promises.readdir(currentDirectory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    if (!isSafeRelativePayloadPath(relativePath)) {
      throw new Error(`Installed payload contains an unsafe path: ${relativePath}`);
    }
    if (entry.isSymbolicLink()) {
      throw new Error(`Installed payload links are not allowed: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...await listRepairCandidateFiles(componentDirectory, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error(`Installed payload contains an unsupported entry: ${relativePath}`);
    }
  }
  return files;
}

async function inspectRepairCandidate(
  targetDirectory: string,
  sourceManifestSha256: string,
  trustRoots: PayloadTrustRoots,
  installerVersion: string,
  requiredComponents: PayloadComponentId[],
): Promise<void> {
  const rootEntries = await fs.promises.readdir(targetDirectory, { withFileTypes: true });
  const allowedRootEntries = new Set([
    "Master",
    "Touch",
    PAYLOAD_MANIFEST_FILENAME,
    INSTALLATION_CONFIG_FILENAME,
  ]);
  for (const entry of rootEntries) {
    if (!allowedRootEntries.has(entry.name) || entry.isSymbolicLink()) {
      throw new Error(`Installation contains an unmanaged root entry: ${entry.name}`);
    }
  }

  const envelopePath = path.join(targetDirectory, PAYLOAD_MANIFEST_FILENAME);
  const envelopeStats = await fs.promises.lstat(envelopePath);
  if (!envelopeStats.isFile() || envelopeStats.isSymbolicLink() || envelopeStats.size > MAX_ENVELOPE_BYTES) {
    throw new Error("Installed payload manifest is invalid");
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(await fs.promises.readFile(envelopePath, "utf8"));
  } catch {
    throw new Error("Installed payload manifest is invalid");
  }
  const installed = verifyPayloadEnvelope(envelope, trustRoots, installerVersion);
  if (installed.summary.manifestSha256 !== sourceManifestSha256) {
    throw new Error("Version-changing upgrades are not enabled; select the installed release for repair");
  }
  assertSelectedComponentsMatch(requiredComponents, installed.summary.components);

  for (const component of installed.manifest.components) {
    const componentDirectory = path.join(targetDirectory, component.source_directory);
    if (!fs.existsSync(componentDirectory)) continue;
    const stats = await fs.promises.lstat(componentDirectory);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error(`Installed component is not a regular directory: ${component.source_directory}`);
    }
    const declaredPaths = new Set(component.files.map((file) => file.path.toLowerCase()));
    const allowedExtras = new Set(
      COMPONENT_CONFIGURATION_EXTRAS[component.id].map((file) => file.toLowerCase()),
    );
    for (const actualPath of await listRepairCandidateFiles(componentDirectory)) {
      const normalizedPath = actualPath.toLowerCase();
      if (!declaredPaths.has(normalizedPath) && !allowedExtras.has(normalizedPath)) {
        throw new Error(`Installation contains an unmanaged file: ${component.source_directory}/${actualPath}`);
      }
    }
  }
}

async function getInstallationMode(
  targetDirectory: string,
  sourceManifestSha256: string,
  trustRoots: PayloadTrustRoots,
  installerVersion: string,
  requiredComponents: PayloadComponentId[],
): Promise<PayloadInstallationMode> {
  const entries = await fs.promises.readdir(targetDirectory);
  if (entries.length === 0) return "install";

  try {
    await inspectRepairCandidate(
      targetDirectory,
      sourceManifestSha256,
      trustRoots,
      installerVersion,
      requiredComponents,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Version-changing upgrades")) {
      throw error;
    }
    throw new Error("Installation destination is not empty or a verified ClickFlash installation");
  }
  return "repair";
}

export async function installOrRepairPayloadBundle(
  sourceDirectoryInput: string,
  targetDirectoryInput: string,
  trustRoots: PayloadTrustRoots,
  installerVersion: string,
  selectedComponents: PayloadComponentId[],
  hooks: PayloadInstallationHooks = {},
): Promise<PayloadInstallationResult> {
  const source = await loadAndVerifyPayloadBundle(
    sourceDirectoryInput,
    trustRoots,
    installerVersion,
    { requiredComponents: selectedComponents },
  );
  if (
    hooks.expectedManifestSha256
    && source.summary.manifestSha256 !== hooks.expectedManifestSha256
  ) {
    throw new Error("Payload manifest changed after operator approval; select the bundle again");
  }
  assertSelectedComponentsMatch(selectedComponents, source.summary.components);

  const targetInputStats = await fs.promises.lstat(targetDirectoryInput);
  if (!targetInputStats.isDirectory() || targetInputStats.isSymbolicLink()) {
    throw new Error("Installation destination must be a regular directory");
  }
  const targetDirectory = await fs.promises.realpath(targetDirectoryInput);
  const targetStats = await fs.promises.lstat(targetDirectory);
  if (!targetStats.isDirectory() || targetStats.isSymbolicLink()) {
    throw new Error("Installation destination must be a regular directory");
  }
  assertSourceAndTargetAreDisjoint(source.directory, targetDirectory);

  const mode = await getInstallationMode(
    targetDirectory,
    source.summary.manifestSha256,
    trustRoots,
    installerVersion,
    selectedComponents,
  );
  const transactionId = crypto.randomBytes(8).toString("hex");
  const stageDirectory = getTransactionDirectory(targetDirectory, "stage", transactionId);
  const backupDirectory = getTransactionDirectory(targetDirectory, "backup", transactionId);
  if (fs.existsSync(stageDirectory) || fs.existsSync(backupDirectory)) {
    throw new Error("Payload transaction path already exists");
  }

  let originalMoved = false;
  let replacementMoved = false;
  try {
    copyVerifiedPayloadToStage(source.directory, stageDirectory, source.manifest);
    if (mode === "repair") {
      copyPreservedConfiguration(targetDirectory, stageDirectory, selectedComponents);
    }
    const staged = await verifyInstalledPayload(
      stageDirectory,
      trustRoots,
      installerVersion,
      selectedComponents,
    );
    if (staged.summary.manifestSha256 !== source.summary.manifestSha256) {
      throw new Error("Staged payload does not match the approved release");
    }
    await hooks.afterStageVerified?.(stageDirectory);

    fs.renameSync(targetDirectory, backupDirectory);
    originalMoved = true;
    fs.renameSync(stageDirectory, targetDirectory);
    replacementMoved = true;
    await hooks.afterTargetSwap?.(targetDirectory);

    const installed = await verifyInstalledPayload(
      targetDirectory,
      trustRoots,
      installerVersion,
      selectedComponents,
    );
    if (installed.summary.manifestSha256 !== source.summary.manifestSha256) {
      throw new Error("Installed payload does not match the approved release");
    }

    let recoveryBackup: string | undefined;
    try {
      removeTransactionDirectory(backupDirectory, targetDirectory);
    } catch {
      recoveryBackup = backupDirectory;
    }
    return {
      directory: targetDirectory,
      mode,
      summary: installed.summary,
      ...(recoveryBackup ? { recoveryBackup } : {}),
    };
  } catch (error) {
    if (originalMoved) {
      try {
        if (replacementMoved && fs.existsSync(targetDirectory)) {
          if (fs.existsSync(stageDirectory)) {
            removeTransactionDirectory(stageDirectory, targetDirectory);
          }
          fs.renameSync(targetDirectory, stageDirectory);
        }
        if (fs.existsSync(backupDirectory)) {
          fs.renameSync(backupDirectory, targetDirectory);
        }
        originalMoved = false;
        if (fs.existsSync(stageDirectory)) {
          removeTransactionDirectory(stageDirectory, targetDirectory);
        }
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          `Payload installation failed and recovery data was preserved at ${backupDirectory}`,
        );
      }
    } else if (fs.existsSync(stageDirectory)) {
      removeTransactionDirectory(stageDirectory, targetDirectory);
    }
    throw error;
  }
}
