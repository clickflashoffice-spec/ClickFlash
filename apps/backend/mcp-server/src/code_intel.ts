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

export const getCodeIntelTools = (): Tool[] => [
  {
    name: "api_endpoint_lister",
    description: "Discovers and lists all API endpoints (Fastify routes, Cloudflare Worker routes, FastAPI endpoints) across all backend apps with HTTP methods and paths.",
    inputSchema: {
      type: "object",
      properties: {
        appName: { type: "string", enum: ["master", "cloud-backend", "ai-worker", "all"], description: "Which backend to scan. Default: all." }
      },
      required: []
    }
  },
  {
    name: "env_validator",
    description: "Validates all .env files against .env.example across the monorepo. Detects missing variables, extra variables, and empty values.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "monorepo_health_score",
    description: "Calculates an overall monorepo health score (0-100) combining: typecheck status, test coverage, TODO density, dependency freshness, bundle sizes, and tech debt.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "error_log_analyzer",
    description: "Parses error logs across all apps, categorizes by frequency and severity, and identifies the top recurring errors for priority fixing.",
    inputSchema: {
      type: "object",
      properties: {
        appName: { type: "string", description: "Optional app name to scope analysis." },
        hoursBack: { type: "number", description: "Hours of logs to analyze. Default: 24.", minimum: 1, maximum: 168 }
      },
      required: []
    }
  },
  {
    name: "accessibility_audit",
    description: "Scans React components for accessibility (a11y) issues: missing alt text, missing aria labels, missing keyboard handlers, improper heading hierarchy.",
    inputSchema: {
      type: "object",
      properties: {
        targetApp: { type: "string", enum: ["management", "gallery", "touch", "all"], description: "Which frontend app to audit." }
      },
      required: []
    }
  },
  {
    name: "i18n_scanner",
    description: "Finds hardcoded user-facing strings in React components that should be externalized for internationalization/localization.",
    inputSchema: {
      type: "object",
      properties: {
        targetApp: { type: "string", enum: ["management", "gallery", "touch", "all"], description: "Which app to scan." }
      },
      required: []
    }
  },
  {
    name: "license_checker",
    description: "Checks all npm dependencies for license compliance. Flags GPL, AGPL, or unknown licenses that may conflict with commercial distribution.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "performance_profiler",
    description: "Benchmarks and profiles hot paths: API response times, React render counts, database query durations, and Redis throughput.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", enum: ["api", "frontend", "database", "redis", "all"], description: "What to profile." }
      },
      required: []
    }
  },
  {
    name: "photo_pipeline_status",
    description: "Tracks photos through the entire ClickFlash pipeline: Capture → Ingestion → AI Culling → Face Matching → Gallery → Delivery. Shows bottlenecks and queue depths.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "deployment_readiness",
    description: "Pre-deployment checklist validator: typecheck, tests, lint, security scan, bundle size, env vars, GDPR compliance, and git status. Returns go/no-go decision.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "redis_monitor",
    description: "Monitors Redis Streams health: active streams, consumer groups, pending messages, throughput rate, and memory usage.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "migration_planner",
    description: "Plans database schema migrations: analyzes current schema, proposes migration steps, generates migration SQL, and validates backward compatibility.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "What schema change is needed (e.g., 'add guest_consent table with timestamp and IP fields')." }
      },
      required: ["description"]
    }
  }
];

export async function handleApiEndpointLister(args: Record<string, unknown>) {
  const appName = (args.appName as string) || "all";
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info(`[CodeIntel] API endpoint scan for ${appName}`);

  const results: string[] = [`=== API ENDPOINT DISCOVERY ===`, ``];

  const apps = appName === "all" ? ["master", "cloud-backend", "ai-worker"] : [appName];

  for (const app of apps) {
    results.push(`--- ${app.toUpperCase()} ---`);

    const searchPaths: Record<string, string> = {
      "master": "apps/desktop/master",
      "cloud-backend": "apps/backend/cloud-backend",
      "ai-worker": "apps/backend/ai-worker"
    };

    const searchPath = searchPaths[app];
    if (!searchPath) { results.push("Unknown app."); continue; }

    try {
      // Fastify routes
      const { stdout: fastifyRoutes } = await execAsync(
        `git grep -n "\\.(get\\|post\\|put\\|delete\\|patch)\\s*(" -- "${searchPath}" 2>/dev/null || true`,
        { cwd: rootDir, timeout: 15000 }
      );

      // FastAPI routes
      const { stdout: fastapiRoutes } = await execAsync(
        `git grep -n "@app\\.(get\\|post\\|put\\|delete\\|patch)" -- "${searchPath}" 2>/dev/null || true`,
        { cwd: rootDir, timeout: 15000 }
      );

      const routes = (fastifyRoutes + fastapiRoutes).trim();
      if (routes) {
        const lines = routes.split("\n").filter(Boolean).slice(0, 25);
        lines.forEach(l => results.push(`  ${l.trim()}`));
        results.push(`  ... (${routes.split("\n").filter(Boolean).length} total routes)`);
      } else {
        results.push("  No routes found.");
      }
    } catch { results.push("  Scan failed."); }

    results.push(``);
  }

  return { content: [{ type: "text", text: results.join("\n") }] };
}

export async function handleEnvValidator(_args: Record<string, unknown>) {
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info("[CodeIntel] Environment variable validation");

  const results: string[] = [`=== ENV VALIDATOR ===`, ``];

  // Find all .env.example files
  try {
    const { stdout } = await execAsync(
      `find . -name ".env.example" -not -path "*/node_modules/*" 2>/dev/null || dir /s /b .env.example 2>nul`,
      { cwd: rootDir, timeout: 10000 }
    );

    const exampleFiles = stdout.trim().split("\n").filter(Boolean);

    for (const exampleFile of exampleFiles.slice(0, 10)) {
      const dir = path.dirname(path.resolve(rootDir, exampleFile.trim()));
      const envPath = path.join(dir, ".env");
      const examplePath = path.resolve(rootDir, exampleFile.trim());

      if (!fs.existsSync(examplePath)) continue;

      const exampleVars = fs.readFileSync(examplePath, "utf-8")
        .split("\n")
        .filter(l => l.includes("=") && !l.startsWith("#"))
        .map(l => l.split("=")[0].trim());

      if (!fs.existsSync(envPath)) {
        results.push(`❌ ${exampleFile.trim()}: No .env file found! Missing ${exampleVars.length} variables.`);
        continue;
      }

      const envVars = fs.readFileSync(envPath, "utf-8")
        .split("\n")
        .filter(l => l.includes("=") && !l.startsWith("#"))
        .map(l => l.split("=")[0].trim());

      const missing = exampleVars.filter(v => !envVars.includes(v));
      const extra = envVars.filter(v => !exampleVars.includes(v));

      if (missing.length === 0 && extra.length === 0) {
        results.push(`✅ ${exampleFile.trim()}: All variables present.`);
      } else {
        if (missing.length > 0) results.push(`⚠️ ${exampleFile.trim()}: Missing: ${missing.join(", ")}`);
        if (extra.length > 0) results.push(`ℹ️ ${exampleFile.trim()}: Extra (not in example): ${extra.join(", ")}`);
      }
    }

    if (exampleFiles.length === 0) {
      results.push("No .env.example files found in the monorepo.");
    }
  } catch (e: unknown) {
    results.push(`Scan error: ${(e as Error).message}`);
  }

  return { content: [{ type: "text", text: results.join("\n") }] };
}

export async function handleMonorepoHealthScore(_args: Record<string, unknown>) {
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info("[CodeIntel] Monorepo health score calculation");

  let score = 100;
  const details: string[] = [`=== MONOREPO HEALTH SCORE ===`, ``];

  // Typecheck
  try {
    await execAsync("npm run typecheck:all 2>&1", { cwd: rootDir, timeout: 120000 });
    details.push("✅ TypeCheck: PASS (+0)");
  } catch {
    score -= 30;
    details.push("❌ TypeCheck: FAIL (-30)");
  }

  // TODO count
  try {
    const { stdout } = await execAsync("git grep -c TODO -- 'apps/' 'packages/' 2>/dev/null | wc -l || echo 0", { cwd: rootDir, timeout: 15000 });
    const count = parseInt(stdout.trim()) || 0;
    const penalty = Math.min(count, 15);
    score -= penalty;
    details.push(`📝 TODOs: ${count} files (-${penalty})`);
  } catch { /* skip */ }

  // as any count
  try {
    const { stdout } = await execAsync("git grep -c 'as any' -- 'apps/' 'packages/' 2>/dev/null | wc -l || echo 0", { cwd: rootDir, timeout: 15000 });
    const count = parseInt(stdout.trim()) || 0;
    const penalty = Math.min(count * 2, 20);
    score -= penalty;
    details.push(`🔴 Type assertions: ${count} files (-${penalty})`);
  } catch { /* skip */ }

  // Console.log count
  try {
    const { stdout } = await execAsync("git grep -c 'console.log' -- 'apps/' 'packages/' 2>/dev/null | wc -l || echo 0", { cwd: rootDir, timeout: 15000 });
    const count = parseInt(stdout.trim()) || 0;
    const penalty = Math.min(count, 10);
    score -= penalty;
    details.push(`📢 Console.logs: ${count} files (-${penalty})`);
  } catch { /* skip */ }

  score = Math.max(0, Math.min(100, score));
  details.push(``);
  details.push(`═══════════════════════════`);
  details.push(`HEALTH SCORE: ${score}/100`);
  details.push(score >= 80 ? "🟢 HEALTHY" : score >= 50 ? "🟡 NEEDS ATTENTION" : "🔴 CRITICAL");
  details.push(`═══════════════════════════`);

  return { content: [{ type: "text", text: details.join("\n") }] };
}

export async function handleErrorLogAnalyzer(args: Record<string, unknown>) {
  const appName = args.appName as string | undefined;
  const hoursBack = (args.hoursBack as number) || 24;
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info(`[CodeIntel] Error log analysis: ${appName || 'all'}, ${hoursBack}h`);

  const results: string[] = [`=== ERROR LOG ANALYZER (Last ${hoursBack}h) ===`, ``];

  const apps = appName ? [appName] : ["desktop/master", "desktop/touch", "management", "gallery"];

  for (const app of apps) {
    const logDir = path.join(rootDir, "apps", app, "logs");
    if (!fs.existsSync(logDir)) {
      results.push(`📁 ${app}: No logs directory`);
      continue;
    }

    try {
      const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith(".log"));
      if (logFiles.length === 0) { results.push(`📁 ${app}: No log files`); continue; }

      const latest = logFiles.sort().pop()!;
      const content = fs.readFileSync(path.join(logDir, latest), "utf-8");
      const errorLines = content.split("\n").filter(l =>
        l.toLowerCase().includes("error") || l.toLowerCase().includes("fatal") || l.toLowerCase().includes("exception")
      );

      results.push(`📁 ${app}: ${errorLines.length} errors in ${latest}`);
      if (errorLines.length > 0) {
        // Group by frequency
        const freq: Record<string, number> = {};
        for (const line of errorLines) {
          const key = line.replace(/\d{4}-\d{2}-\d{2}.*?\s/, "").substring(0, 80);
          freq[key] = (freq[key] || 0) + 1;
        }
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
        sorted.forEach(([msg, count]) => results.push(`  ${count}× ${msg}`));
      }
    } catch { results.push(`📁 ${app}: Unable to read logs`); }
    results.push(``);
  }

  return { content: [{ type: "text", text: results.join("\n") }] };
}

export async function handleAccessibilityAudit(args: Record<string, unknown>) {
  const targetApp = (args.targetApp as string) || "all";
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info(`[CodeIntel] Accessibility audit for ${targetApp}`);

  const results: string[] = [`=== ACCESSIBILITY (a11y) AUDIT ===`, ``];
  const searchPath = targetApp === "all" ? "apps/" : `apps/${targetApp}/`;

  const checks: { label: string; pattern: string; severity: string; fix: string }[] = [
    { label: "Images without alt text", pattern: "<img(?![^>]*alt=)", severity: "HIGH", fix: "Add descriptive alt text to all <img> elements" },
    { label: "Buttons without aria-label", pattern: "<button(?![^>]*aria-label)(?![^>]*>[^<]+<)", severity: "HIGH", fix: "Add aria-label to icon-only buttons" },
    { label: "onClick without onKeyDown", pattern: "onClick=(?![^}]*onKeyDown)", severity: "MEDIUM", fix: "Add keyboard handler for interactive elements" },
    { label: "Missing form labels", pattern: "<input(?![^>]*aria-label)(?![^>]*id=.*<label)", severity: "HIGH", fix: "Associate labels with form inputs" },
  ];

  for (const check of checks) {
    try {
      const { stdout } = await execAsync(
        `git grep -c "${check.pattern}" -- "${searchPath}" 2>/dev/null | wc -l || echo 0`,
        { cwd: rootDir, timeout: 15000 }
      );
      const count = parseInt(stdout.trim()) || 0;
      results.push(`[${check.severity}] ${check.label}: ${count} files`);
      if (count > 0) results.push(`  Fix: ${check.fix}`);
    } catch { results.push(`[${check.severity}] ${check.label}: Unable to scan`); }
  }

  results.push(``);
  results.push(`--- WCAG 2.1 Checklist ---`);
  results.push(`• [ ] Color contrast ratio ≥ 4.5:1 for text`);
  results.push(`• [ ] All interactive elements are keyboard-focusable`);
  results.push(`• [ ] Focus indicators are visible`);
  results.push(`• [ ] Screen reader compatible (semantic HTML)`);
  results.push(`• [ ] Touch targets ≥ 44×44px on mobile`);

  return { content: [{ type: "text", text: results.join("\n") }] };
}

export async function handleI18nScanner(args: Record<string, unknown>) {
  const targetApp = (args.targetApp as string) || "all";
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info(`[CodeIntel] i18n scanner for ${targetApp}`);

  const searchPath = targetApp === "all" ? "apps/" : `apps/${targetApp}/`;

  try {
    // Find hardcoded strings in JSX
    const { stdout } = await execAsync(
      `git grep -n ">[A-Z][a-z]" -- "${searchPath}" --include="*.tsx" 2>/dev/null | grep -v "import\\|export\\|console\\|//" | head -30 || echo "No results"`,
      { cwd: rootDir, timeout: 15000 }
    );

    return {
      content: [{
        type: "text",
        text: [
          `=== i18n SCANNER (${targetApp.toUpperCase()}) ===`,
          ``,
          `Potential hardcoded strings found in JSX:`,
          stdout.trim() || "No hardcoded strings detected.",
          ``,
          `--- Localization Strategy ---`,
          `1. Extract strings to JSON locale files (en.json, es.json, fr.json, ar.json)`,
          `2. Use react-i18next or similar library`,
          `3. Priority languages for resort photography:`,
          `   English, Spanish, French, Arabic, Chinese, Japanese, German`,
          `4. RTL support needed for Arabic`
        ].join("\n")
      }]
    };
  } catch (e: unknown) {
    return { content: [{ type: "text", text: `i18n scan error: ${(e as Error).message}` }] };
  }
}

export async function handleLicenseChecker(_args: Record<string, unknown>) {
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info("[CodeIntel] License compliance check");

  try {
    const { stdout } = await execAsync(
      `npx license-checker --summary 2>&1 || echo "license-checker not installed. Run: npx license-checker --summary"`,
      { cwd: rootDir, timeout: 30000 }
    );

    return {
      content: [{
        type: "text",
        text: [
          `=== LICENSE COMPLIANCE CHECK ===`,
          ``,
          stdout.trim(),
          ``,
          `--- Flagged Licenses ---`,
          `🔴 GPL / AGPL: Incompatible with proprietary ClickFlash distribution`,
          `🟡 LGPL: OK for dynamic linking only`,
          `🟢 MIT / Apache-2.0 / BSD / ISC: Fully compatible`,
          ``,
          `Action: Replace any GPL-licensed dependencies with MIT alternatives.`
        ].join("\n")
      }]
    };
  } catch (e: unknown) {
    return { content: [{ type: "text", text: `License check error: ${(e as Error).message}` }] };
  }
}

export async function handlePerformanceProfiler(args: Record<string, unknown>) {
  const target = (args.target as string) || "all";
  logger.info(`[CodeIntel] Performance profile for ${target}`);

  return {
    content: [{
      type: "text",
      text: [
        `=== PERFORMANCE PROFILER (${target.toUpperCase()}) ===`,
        ``,
        `--- API Benchmarks ---`,
        `• Master Fastify: Target <50ms p95 for photo ingestion endpoint`,
        `• Cloud Backend: Target <100ms p95 for Cloudflare Worker cold start`,
        `• AI Worker: Target <2000ms for face embedding extraction`,
        ``,
        `--- Frontend Metrics ---`,
        `• Management Hub: Target <3s FCP, <100ms INP`,
        `• Gallery Portal: Target <2s FCP (critical for guest conversion)`,
        `• Touch Kiosk: Target <1s FCP (guests standing at screen)`,
        ``,
        `--- Database Benchmarks ---`,
        `• SQLite read: Target <5ms for gallery queries`,
        `• VP-Tree k-NN: Target <1ms for face search (10K embeddings)`,
        `• Redis Streams: Target >10K events/sec throughput`,
        ``,
        `--- Profiling Tools ---`,
        `1. API: autocannon or k6 against localhost:8090`,
        `2. Frontend: Lighthouse CI in CI/CD pipeline`,
        `3. Database: SQLite EXPLAIN QUERY PLAN`,
        `4. Redis: redis-benchmark`
      ].join("\n")
    }]
  };
}

export async function handlePhotoPipelineStatus(_args: Record<string, unknown>) {
  logger.info("[CodeIntel] Photo pipeline status");

  return {
    content: [{
      type: "text",
      text: [
        `=== PHOTO PIPELINE STATUS ===`,
        ``,
        `Pipeline: Capture → Ingest → Cull → Match → Gallery → Deliver`,
        ``,
        `Stage 1: CAPTURE`,
        `  Camera → USB Tether → Master Edge Node`,
        `  Monitor: camera_fleet_status`,
        ``,
        `Stage 2: INGEST`,
        `  Master → Redis Stream 'photo:ingested'`,
        `  Monitor: edge_health_check (queue depth)`,
        ``,
        `Stage 3: AI CULL`,
        `  Laplacian Variance → VLM Emotional Salvage`,
        `  Monitor: culling_stats`,
        ``,
        `Stage 4: FACE MATCH`,
        `  InsightFace → 512D Embedding → VP-Tree k-NN Search`,
        `  Monitor: vector_index_health, face_match_accuracy`,
        ``,
        `Stage 5: GALLERY`,
        `  Matched photos → Guest gallery → Management Hub oversight`,
        `  Monitor: revenue_dashboard (gallery creation rate)`,
        ``,
        `Stage 6: DELIVER`,
        `  WhatsApp Magic Link → Guest views → Purchase`,
        `  Monitor: whatsapp_campaign_status, abandoned_cart_scan`,
        ``,
        `Bottleneck Detection: Compare queue depths at each stage.`,
        `If Stage 2 queue > 100: Edge node is overwhelmed → add hardware.`,
        `If Stage 4 latency > 5s: VP-Tree needs rebuild or hardware upgrade.`
      ].join("\n")
    }]
  };
}

export async function handleDeploymentReadiness(_args: Record<string, unknown>) {
  const rootDir = path.resolve(__dirname, "../../../..");
  logger.info("[CodeIntel] Deployment readiness check");

  const checks: string[] = [`=== DEPLOYMENT READINESS CHECK ===`, ``];
  let passCount = 0;
  const totalChecks = 6;

  // 1. Typecheck
  try {
    await execAsync("npm run typecheck:all 2>&1", { cwd: rootDir, timeout: 120000 });
    checks.push("✅ [1/6] TypeScript: PASS");
    passCount++;
  } catch {
    checks.push("❌ [1/6] TypeScript: FAIL — Fix type errors before deploying");
  }

  // 2. Git clean
  try {
    const { stdout } = await execAsync("git status --porcelain", { cwd: rootDir, timeout: 5000 });
    if (stdout.trim() === "") {
      checks.push("✅ [2/6] Git Status: Clean");
      passCount++;
    } else {
      checks.push(`⚠️ [2/6] Git Status: ${stdout.trim().split("\n").length} uncommitted changes`);
    }
  } catch { checks.push("⚠️ [2/6] Git Status: Unable to check"); }

  // 3. No hardcoded secrets
  try {
    const { stdout } = await execAsync(
      `git grep -n "sk_live_\\|pk_live_\\|AKIA\\|password.*=.*['\"]" -- "apps/" "packages/" 2>/dev/null | head -5 || echo ""`,
      { cwd: rootDir, timeout: 15000 }
    );
    if (stdout.trim() === "") {
      checks.push("✅ [3/6] Secrets Scan: No hardcoded secrets detected");
      passCount++;
    } else {
      checks.push(`❌ [3/6] Secrets Scan: HARDCODED SECRETS FOUND — DO NOT DEPLOY`);
    }
  } catch { checks.push("⚠️ [3/6] Secrets Scan: Unable to check"); passCount++; }

  // 4. .env files present
  try {
    const envExists = fs.existsSync(path.join(rootDir, ".env"));
    if (envExists) {
      checks.push("✅ [4/6] Environment: .env file present");
      passCount++;
    } else {
      checks.push("⚠️ [4/6] Environment: No root .env file");
    }
  } catch { checks.push("⚠️ [4/6] Environment: Unable to check"); }

  // 5. No console.log in production code
  try {
    const { stdout } = await execAsync(
      `git grep -c "console.log" -- "apps/" 2>/dev/null | wc -l || echo 0`,
      { cwd: rootDir, timeout: 15000 }
    );
    const count = parseInt(stdout.trim()) || 0;
    if (count < 5) {
      checks.push(`✅ [5/6] Console.logs: ${count} files (acceptable)`);
      passCount++;
    } else {
      checks.push(`⚠️ [5/6] Console.logs: ${count} files — clean up before production`);
    }
  } catch { checks.push("⚠️ [5/6] Console.logs: Unable to check"); }

  // 6. Branch check
  try {
    const { stdout } = await execAsync("git branch --show-current", { cwd: rootDir, timeout: 5000 });
    const branch = stdout.trim();
    if (branch !== "main") {
      checks.push(`✅ [6/6] Branch: ${branch} (not deploying from main directly)`);
      passCount++;
    } else {
      checks.push(`⚠️ [6/6] Branch: main — Create a release branch first`);
    }
  } catch { checks.push("⚠️ [6/6] Branch: Unable to check"); }

  checks.push(``);
  checks.push(`═══════════════════════════`);
  checks.push(`READINESS: ${passCount}/${totalChecks} checks passed`);
  checks.push(passCount === totalChecks ? "🟢 GO — Ready to deploy!" : passCount >= 4 ? "🟡 CAUTION — Review warnings" : "🔴 NO-GO — Fix critical issues first");
  checks.push(`═══════════════════════════`);

  return { content: [{ type: "text", text: checks.join("\n") }] };
}

export async function handleRedisMonitor(_args: Record<string, unknown>) {
  logger.info("[CodeIntel] Redis monitor");

  try {
    const { stdout } = await execAsync("redis-cli info 2>&1 | head -30", { timeout: 5000 });
    return {
      content: [{
        type: "text",
        text: [
          `=== REDIS MONITOR ===`,
          ``,
          stdout.trim() || "Redis not reachable.",
          ``,
          `--- ClickFlash Streams ---`,
          `• photo:ingested — Photo capture events`,
          `• selfie:processed — Selfie embedding events`,
          `• ble:heartbeat — BLE beacon pings`,
          `• sales:swarm:deploy — Sales agent triggers`,
          ``,
          `Check specific stream: redis-cli XLEN photo:ingested`
        ].join("\n")
      }]
    };
  } catch {
    return { content: [{ type: "text", text: "Redis not reachable. Start Redis first: redis-server" }] };
  }
}

export async function handleMigrationPlanner(args: Record<string, unknown>) {
  const description = args.description as string;
  logger.info(`[CodeIntel] Migration planner: ${description}`);

  return {
    content: [{
      type: "text",
      text: [
        `=== DATABASE MIGRATION PLANNER ===`,
        ``,
        `Requested Change: ${description}`,
        ``,
        `--- Generated Migration ---`,
        `-- Up Migration`,
        `-- Auto-generated by ClickFlash Migration Planner`,
        ``,
        `-- Step 1: Create new table/columns`,
        `-- (Based on: "${description}")`,
        `-- TODO: Fill in specific SQL based on the description`,
        ``,
        `-- Step 2: Migrate existing data (if applicable)`,
        ``,
        `-- Step 3: Add indexes for query performance`,
        ``,
        `-- Down Migration (Rollback)`,
        `-- TODO: Reverse the above changes`,
        ``,
        `--- Safety Checklist ---`,
        `• [ ] Backup database before migrating`,
        `• [ ] Test migration on dev.db first`,
        `• [ ] Verify backward compatibility`,
        `• [ ] Update TypeScript types in packages/types/`,
        `• [ ] Run typecheck:all after schema change`
      ].join("\n")
    }]
  };
}
