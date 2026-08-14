/**
 * generate-guardian-hash.js
 *
 * Run after copying helper_scripts/ — generates a SHA-256 sidecar file next to
 * KioskGuardian.exe so electron-main.js can verify binary integrity at runtime.
 *
 * Usage (standalone):
 *   node scripts/generate-guardian-hash.js
 *
 * Also invoked automatically by electron-builder afterPack hook (see electron-builder.yml).
 */

"use strict";

const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const GUARDIAN_SRC = path.join(__dirname, "..", "helper_scripts", "KioskGuardian.exe");
const HASH_SRC     = GUARDIAN_SRC + ".sha256";

function generateHash(exePath, hashPath) {
  if (!fs.existsSync(exePath)) {
    console.warn(`[HashGen] KioskGuardian.exe not found at ${exePath} — skipping`);
    return;
  }

  const data   = fs.readFileSync(exePath);
  const digest = crypto.createHash("sha256").update(data).digest("hex");

  fs.writeFileSync(hashPath, digest + "\n", "utf8");
  console.log(`[HashGen] ${path.basename(exePath)} → ${digest}`);
  console.log(`[HashGen] Written to ${hashPath}`);
}

// ── Standalone run ────────────────────────────────────────────────────────────
if (require.main === module) {
  generateHash(GUARDIAN_SRC, HASH_SRC);
}

// ── electron-builder afterPack hook ──────────────────────────────────────────
// electron-builder calls module.exports as a function with { appOutDir, packager }
module.exports = async function afterPack({ appOutDir }) {
  const resourcesDir = path.join(appOutDir, "resources", "helper_scripts");
  const exePath      = path.join(resourcesDir, "KioskGuardian.exe");
  const hashPath     = exePath + ".sha256";
  generateHash(exePath, hashPath);
};
