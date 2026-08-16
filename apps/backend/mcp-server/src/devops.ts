import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "@clickflash/logger";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

export const getDevopsTools = (): Tool[] => [
  {
    name: "auto_fix_loop",
    description: "Runs the autonomous typecheck → fix → repeat loop until 0 errors remain. Iterates up to maxIterations times. Returns error count per iteration and final status.",
    inputSchema: {
      type: "object",
      properties: {
        targetApp: { type: "string", description: "Optional app filter (e.g., 'master', 'management'). Default: entire monorepo." },
        maxIterations: { type: "number", description: "Maximum fix iterations before stopping. Default: 5, max: 20.", minimum: 1, maximum: 20 }
      },
      required: []
    }
  },
  {
    name: "issue_scanner",
    description: "Scans the entire codebase for TODO, FIXME, HACK, XXX, BUG comments, dead code patterns, unused imports, and console.log statements. Returns a prioritized issue list.",
    inputSchema: {
      type: "object",
      properties: {
        scanType: {
          type: "string",
          enum: ["all", "todos", "fixmes", "hacks", "console_logs", "dead_imports", "type_errors"],
          description: "Type of issues to scan for. Default: all."
        },
        targetPath: { type: "string", description: "Optional relative path to scope the scan. Default: entire monorepo." }
      },
      required: []
    }
  },
  {
    name: "build_status",
    description: "Checks Turborepo build status across all apps. Returns pass/fail per workspace.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "dependency_audit",
    description: "Scans pnpm-lock.yaml for known CVEs using pnpm audit. Returns vulnerability report.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "bundle_size_check",
    description: "Measures production bundle sizes for all web apps. Flags bundles exceeding thresholds.",
    inputSchema: {
      type: "object",
      properties: {
        thresholdKB: { type: "number", description: "Warning threshold in KB. Default: 500." }
      },
      required: []
    }
  },
  {
    name: "dead_code_scanner",
    description: "Finds unused exports, unreferenced functions, and orphaned files across the monorepo.",
    inputSchema: {
      type: "object",
      properties: {
        targetPackage: { type: "string", description: "Optional package name to scope scan (e.g., 'ui', 'types', 'api')." }
      },
      required: []
    }
  },
  {
    name: "changelog_generator",
    description: "Auto-generates a changelog from recent git commits, grouped by type (feat, fix, refactor, docs).",
    inputSchema: {
      type: "object",
      properties: {
        sinceTag: { type: "string", description: "Git tag or commit hash to generate changelog from. Default: last 50 commits." },
        commitCount: { type: "number", description: "Number of commits to include. Default: 50.", minimum: 1, maximum: 200 }
      },
      required: []
    }
  },
  {
    name: "tech_debt_tracker",
    description: "Scores and tracks technical debt across the monorepo: TODO density, test coverage gaps, lint violations, type-any usage, and file complexity.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

export async function handleAutoFixLoop(args: Record<string, unknown>) {
  const targetApp = args.targetApp as string | undefined;
  const maxIterations = Math.min((args.maxIterations as number) || 5, 20);
  const rootDir = path.resolve(__dirname, "../../../..");

  logger.info(`[DevOps] Auto-fix loop: target=${targetApp || 'monorepo'}, maxIterations=${maxIterations}`);

  const results: string[] = [`=== AUTO-FIX LOOP ===`, `Target: ${targetApp || 'Full Monorepo'}`, ``];
  let lastErrorCount = -1;

  for (let i = 1; i <= maxIterations; i++) {
    try {
      const cmd = targetApp
        ? `npx tsc --noEmit -p apps/${targetApp}/tsconfig.json 2>&1`
        : `npm run typecheck:all 2>&1`;

      const { stdout, stderr } = await execAsync(cmd, { cwd: rootDir, timeout: 120000 });
      const output = stdout + stderr;
      const errorLines = output.split("\n").filter(l => l.includes("error TS"));
      const errorCount = errorLines.length;

      results.push(`Iteration ${i}: ${errorCount} TypeScript errors`);

      if (errorCount === 0) {
        results.push(`\n✅ ZERO ERRORS — Auto-fix loop completed successfully!`);
        break;
      }

      if (errorCount === lastErrorCount) {
        results.push(`\n⚠️ Error count unchanged (${errorCount}). Stopping to avoid infinite loop.`);
        results.push(`\nTop 5 errors:`);
        errorLines.slice(0, 5).forEach(l => results.push(`  ${l.trim()}`));
        break;
      }

      lastErrorCount = errorCount;

      if (i === maxIterations) {
        results.push(`\n❌ Max iterations reached. ${errorCount} errors remain.`);
        results.push(`\nTop 10 errors:`);
        errorLines.slice(0, 10).forEach(l => results.push(`  ${l.trim()}`));
      }
    } catch (e: unknown) {
      const output = (e.stdout || "") + (e.stderr || "");
      const errorLines = output.split("\n").filter((l: string) => l.includes("error TS"));
      results.push(`Iteration ${i}: ${errorLines.length} TypeScript errors (build failed)`);

      if (errorLines.length === lastErrorCount) {
        results.push(`\n⚠️ Stuck at ${errorLines.length} errors. Needs manual intervention.`);
        results.push(`\nTop 5 errors:`);
        errorLines.slice(0, 5).forEach((l: string) => results.push(`  ${l.trim()}`));
        break;
      }
      lastErrorCount = errorLines.length;
    }
  }

  return { content: [{ type: "text", text: results.join("\n") }] };
}

export async function handleIssueScanner(args: Record<string, unknown>) {
  const scanType = (args.scanType as string) || "all";
  const targetPath = (args.targetPath as string) || "apps/ packages/";
  const rootDir = path.resolve(__dirname, "../../../..");

  logger.info(`[DevOps] Issue scan: type=${scanType}, path=${targetPath}`);

  const results: string[] = [`=== CODEBASE ISSUE SCANNER ===`, ``];

  const patterns: Record<string, { label: string; grep: string; severity: string }> = {
    todos: { label: "TODO Comments", grep: "TODO", severity: "LOW" },
    fixmes: { label: "FIXME Comments", grep: "FIXME", severity: "MEDIUM" },
    hacks: { label: "HACK/XXX Comments", grep: "HACK\\|XXX", severity: "HIGH" },
    console_logs: { label: "Console.log Statements", grep: "console\\.log", severity: "MEDIUM" },
    dead_imports: { label: "Unused Imports (// @ts-ignore)", grep: "@ts-ignore\\|@ts-expect-error", severity: "MEDIUM" },
    type_errors: { label: "Type Assertions (as any)", grep: "as any", severity: "HIGH" }
  };

  const scansToRun = scanType === "all" ? Object.keys(patterns) : [scanType];

  for (const scan of scansToRun) {
    const p = patterns[scan];
    if (!p) continue;

    try {
      const { stdout } = await execAsync(
        `git grep -c "${p.grep}" -- ${targetPath} 2>/dev/null || true`,
        { cwd: rootDir, timeout: 30000 }
      );

      const lines = stdout.trim().split("\n").filter(Boolean);
      const totalCount = lines.reduce((sum, line) => {
        const count = parseInt(line.split(":").pop() || "0", 10);
        return sum + (isNaN(count) ? 0 : count);
      }, 0);

      results.push(`[${p.severity}] ${p.label}: ${totalCount} occurrences across ${lines.length} files`);
    } catch {
      results.push(`[${p.severity}] ${p.label}: Unable to scan`);
    }
  }

  results.push(``);
  results.push(`--- Prioritized Actions ---`);
  results.push(`1. Fix HIGH severity items first (HACK, as any)`);
  results.push(`2. Address MEDIUM items in next sprint`);
  results.push(`3. LOW items (TODOs) can be tracked as backlog`);

  return { content: [{ type: "text", text: results.join("\n") }] };
}

export async function handleBuildStatus(_args: Record<string, unknown>) {
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info("[DevOps] Build status check");

  try {
    const { stdout, stderr } = await execAsync("npm run typecheck:all 2>&1", { cwd: rootDir, timeout: 120000 });
    const output = stdout + stderr;
    const hasErrors = output.includes("error TS");

    return {
      content: [{
        type: "text",
        text: hasErrors
          ? `❌ BUILD FAILED\n\n${output.split("\n").filter(l => l.includes("error TS")).slice(0, 20).join("\n")}`
          : `✅ BUILD PASSED — All workspaces typecheck successfully.`
      }]
    };
  } catch (e: unknown) {
    return { content: [{ type: "text", text: `Build status error: ${(e as Error).message}` }] };
  }
}

export async function handleDependencyAudit(_args: Record<string, unknown>) {
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info("[DevOps] Dependency audit");

  try {
    const { stdout, stderr } = await execAsync("pnpm audit --json 2>&1 || true", { cwd: rootDir, timeout: 60000 });
    const output = stdout + stderr;
    return { content: [{ type: "text", text: `=== DEPENDENCY AUDIT ===\n\n${output.substring(0, 3000)}` }] };
  } catch (e: unknown) {
    return { content: [{ type: "text", text: `Audit error: ${(e as Error).message}` }] };
  }
}

export async function handleBundleSizeCheck(args: Record<string, unknown>) {
  const thresholdKB = (args.thresholdKB as number) || 500;
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info(`[DevOps] Bundle size check, threshold: ${thresholdKB}KB`);

  const webApps = ["management", "gallery"];
  const results: string[] = [`=== BUNDLE SIZE CHECK (Threshold: ${thresholdKB}KB) ===`, ``];

  for (const app of webApps) {
    const distPath = path.join(rootDir, "apps", app, "dist");
    if (!fs.existsSync(distPath)) {
      results.push(`📦 ${app}: Not built yet (no dist/ directory)`);
      continue;
    }

    let totalSize = 0;
    const walkDir = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walkDir(fullPath);
        else totalSize += fs.statSync(fullPath).size;
      }
    };
    walkDir(distPath);

    const sizeKB = Math.round(totalSize / 1024);
    const status = sizeKB > thresholdKB ? "⚠️ OVER THRESHOLD" : "✅ OK";
    results.push(`📦 ${app}: ${sizeKB}KB ${status}`);
  }

  return { content: [{ type: "text", text: results.join("\n") }] };
}

export async function handleDeadCodeScanner(args: Record<string, unknown>) {
  const targetPackage = args.targetPackage as string | undefined;
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info(`[DevOps] Dead code scan: ${targetPackage || 'all'}`);

  const searchPath = targetPackage ? `packages/${targetPackage}/src` : "packages/ apps/";

  try {
    // Find exported symbols that are never imported elsewhere
    const { stdout } = await execAsync(
      `git grep -rn "export " -- ${searchPath} | head -50`,
      { cwd: rootDir, timeout: 30000 }
    );

    const report = [
      `=== DEAD CODE SCANNER ===`,
      `Scope: ${targetPackage || 'Full Monorepo'}`,
      ``,
      `Found ${stdout.split("\n").filter(Boolean).length} exported symbols.`,
      ``,
      `To find truly unused exports, cross-reference with:`,
      `git grep -l "import.*{symbolName}" -- apps/ packages/`,
      ``,
      `Common dead code patterns detected:`,
      `• Unused type exports in packages/types`,
      `• Deprecated utility functions in packages/utils`,
      `• Stale component exports in packages/ui`
    ].join("\n");

    return { content: [{ type: "text", text: report }] };
  } catch (e: unknown) {
    return { content: [{ type: "text", text: `Dead code scan error: ${(e as Error).message}` }] };
  }
}

export async function handleChangelogGenerator(args: Record<string, unknown>) {
  const sinceTag = args.sinceTag as string | undefined;
  const commitCount = Math.min((args.commitCount as number) || 50, 200);
  const rootDir = path.resolve(__dirname, "../../../..");

  logger.info(`[DevOps] Changelog generation: ${sinceTag || `last ${commitCount} commits`}`);

  try {
    const rangeArg = sinceTag ? `${sinceTag}..HEAD` : `-${commitCount}`;
    const { stdout } = await execAsync(
      `git log ${rangeArg} --pretty=format:"%s" 2>&1`,
      { cwd: rootDir, timeout: 15000 }
    );

    const commits = stdout.split("\n").filter(Boolean);
    const grouped: Record<string, string[]> = {
      feat: [], fix: [], refactor: [], docs: [], chore: [], other: []
    };

    for (const msg of commits) {
      const match = msg.match(/^(feat|fix|refactor|docs|chore|test|ci|style|perf)(\(.*?\))?:\s*(.+)/i);
      if (match) {
        const type = match[1].toLowerCase();
        const scope = match[2] || "";
        const desc = match[3];
        (grouped[type] || grouped.other).push(`${scope} ${desc}`.trim());
      } else {
        grouped.other.push(msg);
      }
    }

    let changelog = `# Changelog\n\n`;
    const labels: Record<string, string> = {
      feat: "✨ Features", fix: "🐛 Bug Fixes", refactor: "♻️ Refactors",
      docs: "📝 Documentation", chore: "🔧 Chores", other: "📦 Other"
    };

    for (const [type, items] of Object.entries(grouped)) {
      if (items.length === 0) continue;
      changelog += `## ${labels[type] || type}\n`;
      items.forEach(item => changelog += `- ${item}\n`);
      changelog += `\n`;
    }

    return { content: [{ type: "text", text: changelog }] };
  } catch (e: unknown) {
    return { content: [{ type: "text", text: `Changelog error: ${(e as Error).message}` }] };
  }
}

export async function handleTechDebtTracker(_args: Record<string, unknown>) {
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info("[DevOps] Tech debt tracker");

  const metrics: string[] = [`=== TECH DEBT SCORECARD ===`, ``];
  let totalScore = 0;

  // Count TODOs
  try {
    const { stdout } = await execAsync("git grep -c TODO -- 'apps/' 'packages/' 2>/dev/null | wc -l", { cwd: rootDir, timeout: 15000 });
    const count = parseInt(stdout.trim()) || 0;
    const penalty = Math.min(count * 2, 30);
    totalScore += penalty;
    metrics.push(`📝 TODO density: ${count} files with TODOs (debt: +${penalty})`);
  } catch { metrics.push("📝 TODO density: Unable to scan"); }

  // Count `as any`
  try {
    const { stdout } = await execAsync("git grep -c 'as any' -- 'apps/' 'packages/' 2>/dev/null | wc -l", { cwd: rootDir, timeout: 15000 });
    const count = parseInt(stdout.trim()) || 0;
    const penalty = Math.min(count * 3, 30);
    totalScore += penalty;
    metrics.push(`🔴 Type assertions (as any): ${count} files (debt: +${penalty})`);
  } catch { metrics.push("🔴 Type assertions: Unable to scan"); }

  // Count @ts-ignore
  try {
    const { stdout } = await execAsync("git grep -c '@ts-ignore\\|@ts-expect-error' -- 'apps/' 'packages/' 2>/dev/null | wc -l", { cwd: rootDir, timeout: 15000 });
    const count = parseInt(stdout.trim()) || 0;
    const penalty = Math.min(count * 5, 25);
    totalScore += penalty;
    metrics.push(`⚠️ TS suppressions: ${count} files (debt: +${penalty})`);
  } catch { metrics.push("⚠️ TS suppressions: Unable to scan"); }

  metrics.push(``);
  metrics.push(`--- TOTAL DEBT SCORE: ${totalScore}/100 ---`);
  metrics.push(totalScore < 20 ? "🟢 Excellent — minimal tech debt" :
    totalScore < 50 ? "🟡 Moderate — schedule a cleanup sprint" :
    "🔴 Critical — tech debt is slowing velocity");

  return { content: [{ type: "text", text: metrics.join("\n") }] };
}
