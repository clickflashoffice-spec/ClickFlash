/**
 * ClickFlash Installer — Build helper script
 * Copies Master and Touch release builds into the installer extraResources staging area.
 */

import fs from "fs";
import path from "path";
import { logger } from '@clickflash/logger';

const installerDir = process.cwd();
const masterRelease = path.resolve(installerDir, "..", "master", "release");
const touchRelease = path.resolve(installerDir, "..", "touch", "release");
const stagingDir = path.resolve(installerDir, "staging");

function copyDir(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    logger.warn(`[copy-payloads] Source not found: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

fs.mkdirSync(stagingDir, { recursive: true });
copyDir(masterRelease, path.join(stagingDir, "master"));
copyDir(touchRelease, path.join(stagingDir, "touch"));

logger.info("[copy-payloads] Payloads staged successfully.");
