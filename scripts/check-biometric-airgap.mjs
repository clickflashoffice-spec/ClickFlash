import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
export const REPOSITORY_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

/**
 * Biometric Air-Gap Rules (SEC-002 / ADR-012):
 * 1. Kiosk transfer and metadata export payloads must NEVER contain raw 512D ArcFace descriptors.
 * 2. Calls to sendAlbumToKiosks or sendAlbumToTouch must never set excludeBiometrics: false.
 * 3. Kiosk-facing interfaces must not expose raw descriptor arrays.
 */
export function checkFileContentForAirgapViolations(filePath, content) {
  const violations = [];
  const normalizedPath = filePath.replaceAll("\\", "/");

  // Only scan TypeScript/JavaScript source files
  if (!/\.(ts|tsx|js|mjs|cjs)$/.test(normalizedPath)) {
    return violations;
  }

  // Skip tests, mocks, and node_modules
  if (
    /\.(test|spec)\.(ts|tsx|js|mjs)$/.test(normalizedPath) ||
    normalizedPath.includes("/tests/") ||
    normalizedPath.includes("/__tests__/") ||
    normalizedPath.includes("/__mocks__/") ||
    normalizedPath.includes("node_modules")
  ) {
    return violations;
  }

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Rule 1: Detecting raw descriptor export to metadata.json without exclusion check
    if (
      line.includes("metadata.json") &&
      line.includes("descriptor") &&
      !line.includes("excludeBiometrics") &&
      !line.includes("delete")
    ) {
      violations.push({
        file: normalizedPath,
        line: lineNum,
        rule: "BIOMETRIC-001",
        message: "Potential un-sanitized biometric descriptor written to metadata.json"
      });
    }

    // Rule 2: Kiosk sync route or transfer call with excludeBiometrics set to false
    if (/sendAlbumTo(?:Kiosks|Touch)\s*\([^)]*excludeBiometrics\s*:\s*false/i.test(line)) {
      violations.push({
        file: normalizedPath,
        line: lineNum,
        rule: "BIOMETRIC-002",
        message: "Explicit disablement of biometric air-gap (excludeBiometrics: false) detected"
      });
    }
  }

  return violations;
}

export function scanRepositoryAirgap(repoRoot = REPOSITORY_ROOT) {
  const allViolations = [];
  const targetDirs = ["apps/desktop/master", "apps/desktop/touch", "apps/self-service"];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", "dist", "dist-ui", "build", ".next", ".turbo", "coverage", "playwright-report", "release", "temp", "logs", "resources"].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const relPath = path.relative(repoRoot, fullPath);
          const v = checkFileContentForAirgapViolations(relPath, content);
          if (v.length > 0) {
            allViolations.push(...v);
          }
        } catch {}
      }
    }
  }

  for (const t of targetDirs) {
    walk(path.join(repoRoot, t));
  }

  return allViolations;
}

function pathsMatch(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);

  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && pathsMatch(invokedPath, SCRIPT_PATH)) {
  const violations = scanRepositoryAirgap();

  if (violations.length > 0) {
    console.error(`[SEC-002] Biometric Air-Gap Violations Detected (${violations.length}):`);
    for (const v of violations) {
      console.error(`  - [${v.rule}] ${v.file}:${v.line} — ${v.message}`);
    }
    process.exit(1);
  }

  console.log("✓ [SEC-002] Biometric air-gap audit passed: 0 leaks detected.");
  process.exit(0);
}
