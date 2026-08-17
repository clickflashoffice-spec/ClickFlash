import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { logger } from './logger.js';
import { getSwarmTools, handleSwarmPlanTask, handleSwarmSynthesize } from './swarm.js';
import { getCompetitorTools, handleCompetitorScan, handleFindBetterIdeas } from './competitor.js';
import { getRevenueTools, handleYieldSimulator, handleRevenueDashboard, handleAbandonedCartScan } from './revenue.js';
import { getMobileTools, handleBleBeaconStatus, handleEdgeHealthCheck, handleCameraFleetStatus } from './mobile.js';
import { getAiPipelineTools, handleCullingStats, handleVectorIndexHealth, handleTriggerBatchEnhance, handleFaceMatchAccuracy } from './ai_pipeline.js';
import { getAnalyticsTools, handleParkHeatmap, handleGuestJourneyTrace, handleDailyBriefing, handleWeeklyTrendReport } from './analytics.js';
import { getWhatsappTools, handleWhatsappSendMagicLink, handleWhatsappCampaignStatus, handleSalesSwarmDeploy, handleLeadScoring } from './whatsapp.js';
import { getPhotographerTools, handlePhotographerLeaderboard, handlePhotographerDispatch, handleShiftPlanner } from './photographer.js';
import { getComplianceTools, handleGdprAudit, handleBiometricConsentCheck, handlePciDssScan } from './compliance.js';
import { getDevopsTools, handleAutoFixLoop, handleIssueScanner, handleBuildStatus, handleDependencyAudit, handleBundleSizeCheck, handleDeadCodeScanner, handleChangelogGenerator, handleTechDebtTracker } from './devops.js';
import { getCustomerTools, handleCustomerSegmentation, handleNpsCalculator, handleChurnPredictor } from './customer.js';
import { getGlobalTools, handleMultiVenueOverview, handleCurrencyConverter, handleVenueComparison } from './global.js';
import { getCodeIntelTools, handleApiEndpointLister, handleEnvValidator, handleMonorepoHealthScore, handleErrorLogAnalyzer, handleAccessibilityAudit, handleI18nScanner, handleLicenseChecker, handlePerformanceProfiler, handlePhotoPipelineStatus, handleDeploymentReadiness, handleRedisMonitor, handleMigrationPlanner } from './code_intel.js';
import { getProductionTools, handleAuditAppBoundaries, handleSearchArchitectureGaps, handleUiUxAccessibilityFixer, handleFinalProductionReadiness } from './production.js';
import { infiniteLoopTools, handleInfiniteLoopCall } from './infinite-loop.js';
import { getInnovationTools, handleAuditUxFlow, handleGenerateFeatureIdea, handleStartInfiniteFeatureLoop } from './innovation.js';
import { getDeepIntelTools, handleDeepThinkAnalyze, handleDeepScanAst, handleDeepSearchSymbols, handleDeepPlanSynthesizer, handleDeepScanArchitecture } from './deep_intel.js';
import { getChaosTools, handleChaosEdgeFaultInjector, handleOfflineStoragePressureTester } from './chaos.js';
import { getVisionTools, handleArcfaceVectorBenchmarker, handleBurstActionShotScorer } from './vision.js';
import { getYieldArbitrageTools, handleDynamicYieldArbitrageEngine, handleWhaleLeadNegotiator } from './yield_arbitrage.js';
import { getCryptoTools, handleDrmEphemeralWatermarkVerifier, handleHardwareLicenseEnclaveValidator } from './crypto.js';
import { getSimulationTools, handleSyntheticParkSimulator, handleLoadStressBenchmark } from './simulation.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const APP_FILTERS = {
  master: "clickflash-master",
  touch: "clickflash-touch",
  website: "main-website",
  gallery: "star-master-customer",
  management: "star-master-management",
  moneytrash: "moneytrash-uploader",
} as const;
const APP_NAMES = Object.keys(APP_FILTERS);
const MAX_SOURCE_BYTES = 1_048_576;
const MAX_LOG_BYTES = 10_485_760;

function isKnownAppName(value: unknown): value is keyof typeof APP_FILTERS {
  return typeof value === "string" && Object.hasOwn(APP_FILTERS, value);
}

function resolveContainedRegularFile(rootDir: string, requestedPath: unknown): string | null {
  if (typeof requestedPath !== "string" || requestedPath.length === 0) return null;
  const resolvedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(resolvedRoot, requestedPath);
  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) return null;
  try {
    const stat = fs.lstatSync(resolvedPath);
    return stat.isFile() && !stat.isSymbolicLink() ? resolvedPath : null;
  } catch {
    return null;
  }
}

export function registerTools(): Tool[] {
  return [
    ...getSwarmTools(),
    ...getCompetitorTools(),
    ...getRevenueTools(),
    ...getMobileTools(),
    ...getAiPipelineTools(),
    ...getAnalyticsTools(),
    ...getWhatsappTools(),
    ...getPhotographerTools(),
    ...getComplianceTools(),
    ...getDevopsTools(),
    ...getCustomerTools(),
    ...getGlobalTools(),
    ...getCodeIntelTools(),
    ...getProductionTools(),
    ...infiniteLoopTools,
    ...getInnovationTools(),
    ...getDeepIntelTools(),
    ...getChaosTools(),
    ...getVisionTools(),
    ...getYieldArbitrageTools(),
    ...getCryptoTools(),
    ...getSimulationTools(),

    {
      name: "start_app",
      description: "Start a ClickFlash app in the background",
      inputSchema: {
        type: "object",
        properties: {
          appName: { type: "string", enum: APP_NAMES, description: "Name of the app to start" }
        },
        required: ["appName"]
      }
    },
    {
      name: "run_ecosystem_tests",
      description: "Run ecosystem E2E tests and return results",
      inputSchema: {
        type: "object",
        properties: {},
      }
    },
    {
      name: "query_local_db",
      description: "Query the local SQLite database for Master or Touch",
      inputSchema: {
        type: "object",
        properties: {
          app: { type: "string", enum: ["master", "touch"] },
          query: { type: "string", description: "Read-only SQL query" }
        },
        required: ["app", "query"]
      }
    },
    {
      name: "create_plan",
      description: "Initialize a new project implementation plan and task tracking list",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the plan" },
          description: { type: "string", description: "Brief description of the work" }
        },
        required: ["title", "description"]
      }
    },
    {
      name: "update_task_status",
      description: "Update the status of a specific task in task.md",
      inputSchema: {
        type: "object",
        properties: {
          taskText: { type: "string", description: "The text of the task to find (e.g., 'Setup UI components')" },
          status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"], description: "The new status of the task" }
        },
        required: ["taskText", "status"]
      }
    },
    {
      name: "append_walkthrough",
      description: "Append an execution summary to walkthrough.md",
      inputSchema: {
        type: "object",
        properties: {
          content: { type: "string", description: "Markdown content to append describing what was done" }
        },
        required: ["content"]
      }
    },
    {
      name: "audit_architecture",
      description: "Scans the monorepo for architectural anti-patterns and compliance with the ClickFlash mandate.",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "scan_security",
      description: "Code scanner specifically looking for common security gaps mentioned in the ClickFlash security checklist.",
      inputSchema: {
        type: "object",
        properties: {
          appName: { type: "string", enum: APP_NAMES, description: "Name of the app to scan" }
        },
        required: ["appName"]
      }
    },
    {
      name: "suggest_refactor",
      description: "Analyzes a specific file or component and provides targeted structural improvements.",
      inputSchema: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "Relative path to the file to analyze" }
        },
        required: ["filePath"]
      }
    },
    {
      name: "discover_shared_assets",
      description: "Allows agents to quickly query the monorepo for existing shared code to prevent duplication.",
      inputSchema: {
        type: "object",
        properties: {
          assetType: { type: "string", enum: ["types", "ui"], description: "The type of shared asset to discover" }
        },
        required: ["assetType"]
      }
    },
    {
      name: "fetch_app_logs",
      description: "Reads the most recent logs outputted by @clickflash/logger for an app.",
      inputSchema: {
        type: "object",
        properties: {
          appName: { type: "string", enum: APP_NAMES, description: "Name of the app" },
          lines: { type: "number", minimum: 1, maximum: 1000, description: "Number of tail lines to fetch" }
        },
        required: ["appName"]
      }
    },
    {
      name: "ceo_scan",
      description: "CEO Agent: Scans the entire ClickFlash monorepo (ROADMAP.md, packages_gap_report.json, and codebase health) and returns the single highest-ROI task to work on next. Use this as the starting point of an autonomous improvement loop.",
      inputSchema: {
        type: "object",
        properties: {
          focus: { 
            type: "string", 
            enum: ["roadmap", "security", "performance", "testing", "revenue"],
            description: "Optional strategic focus area. Defaults to automatic detection." 
          }
        },
        required: []
      }
    },
    {
      name: "ceo_deploy_swarm",
      description: "CEO Agent: Given a task description from ceo_scan, generates a structured execution plan with agent assignments, file targets, and verification steps. The calling AI client should then execute each agent's work.",
      inputSchema: {
        type: "object",
        properties: {
          task: { type: "string", description: "The task description returned by ceo_scan" },
          maxAgents: { type: "number", minimum: 1, maximum: 10, description: "Max parallel agents to deploy. Default 5." }
        },
        required: ["task"]
      }
    },
    {
      name: "ceo_status",
      description: "CEO Agent: Returns the current strategic status of the ClickFlash ecosystem — roadmap progress, recent changes, open gaps, and suggested next moves.",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ];
}

// Helper for Plan Mode
function getPlanDir() {
  const rootDir = path.resolve(__dirname, "../../..");
  const planDir = path.join(rootDir, ".clickflash-plans");
  if (!fs.existsSync(planDir)) {
    fs.mkdirSync(planDir, { recursive: true });
  }
  return planDir;
}

export async function handleToolCall(name: string, args: any) {
  if (name === "start_app") {
    const appName: unknown = args.appName;
    if (!isKnownAppName(appName)) {
      return { content: [{ type: "text", text: "Error: Unknown application." }] };
    }
    const filter = APP_FILTERS[appName];
    return {
      content: [{ type: "text", text: `To start ${appName}, please run this command in your terminal: pnpm --filter ${filter} run dev` }]
    };
  } else if (name === "run_ecosystem_tests") {
    try {
      const { stdout, stderr } = await execAsync("pnpm run test:e2e", { 
        cwd: path.resolve(__dirname, "../../.."),
        timeout: 60000 
      });
      return { content: [{ type: "text", text: `STDOUT:\n${stdout}\nSTDERR:\n${stderr}` }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error: ${e.message}\n${e.stdout || ''}\n${e.stderr || ''}` }] };
    }
  } else if (name === "query_local_db") {
    const isWrite = args.query.toLowerCase().trim().match(/^(insert|update|delete|drop|alter|create)/i);
    if (isWrite) {
      return { content: [{ type: "text", text: "Error: Only SELECT queries are allowed." }] };
    }
    try {
      const rootDir = path.resolve(__dirname, "../../..");
      const dbPath = path.join(rootDir, "apps", args.app, "prisma", "dev.db");
      
      if (!fs.existsSync(dbPath)) {
        return { content: [{ type: "text", text: `Database file not found at ${dbPath}` }] };
      }

      const db = new Database(dbPath, { readonly: true });
      const rows = db.prepare(args.query).all();
      db.close();
      return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `DB Error: ${e.message}` }] };
    }
  } else if (name === "create_plan") {
    const planDir = getPlanDir();
    const implPlan = `# ${args.title}\n\n${args.description}\n\n## Proposed Changes\n\n`;
    const taskPlan = `# Tasks for ${args.title}\n\n- [ ] Initial Task\n`;
    const walkPlan = `# Walkthrough for ${args.title}\n\n`;
    
    const implPath = path.join(planDir, "implementation_plan.md");
    const taskPath = path.join(planDir, "task.md");
    const walkPath = path.join(planDir, "walkthrough.md");
    
    if (!fs.existsSync(implPath)) fs.writeFileSync(implPath, implPlan);
    if (!fs.existsSync(taskPath)) fs.writeFileSync(taskPath, taskPlan);
    if (!fs.existsSync(walkPath)) fs.writeFileSync(walkPath, walkPlan);
    
    return { content: [{ type: "text", text: `Plan artifacts created (or preserved if existing) in ${planDir}.` }] };
  } else if (name === "update_task_status") {
    const taskFile = path.join(getPlanDir(), "task.md");
    if (!fs.existsSync(taskFile)) {
      return { content: [{ type: "text", text: "Error: task.md does not exist. Call create_plan first." }] };
    }
    
    let content = fs.readFileSync(taskFile, "utf-8");
    const lines = content.split('\n');
    let updated = false;
    
    const newCheckbox = args.status === "DONE" ? "[x]" : (args.status === "IN_PROGRESS" ? "[/]" : "[ ]");
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(args.taskText)) {
        lines[i] = lines[i].replace(/\[([ x/])\]/i, newCheckbox);
        updated = true;
        break;
      }
    }
    
    if (updated) {
      fs.writeFileSync(taskFile, lines.join('\n'));
      return { content: [{ type: "text", text: `Task updated to ${args.status}.` }] };
    } else {
      return { content: [{ type: "text", text: `Task matching '${args.taskText}' not found.` }] };
    }
  } else if (name === "append_walkthrough") {
    const walkFile = path.join(getPlanDir(), "walkthrough.md");
    if (!fs.existsSync(walkFile)) {
      return { content: [{ type: "text", text: "Error: walkthrough.md does not exist. Call create_plan first." }] };
    }
    
    fs.appendFileSync(walkFile, `\n\n${args.content}\n`);
    return { content: [{ type: "text", text: "Walkthrough updated successfully." }] };
  } else if (name === "audit_architecture") {
    const rootDir = path.resolve(__dirname, "../../..");
    try {
      const { stdout: consoleLogs } = await execAsync("git grep -n 'console\\.log' -- 'apps/' || true", { cwd: rootDir });
      const { stdout: bannedSaaS } = await execAsync("git grep -E -n '(Auth0|@clerk|pusher|firebase|vercel)' -- 'apps/' || true", { cwd: rootDir });
      
      let report = "Architecture Audit Report:\n\n";
      report += "1. logger.info usage (violates Zero logger.info mandate):\n";
      report += consoleLogs ? consoleLogs : "No violations found.\n";
      report += "\n2. Banned SaaS Usage (violates 100% Custom mandate):\n";
      report += bannedSaaS ? bannedSaaS : "No violations found.\n";
      
      return { content: [{ type: "text", text: report }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Audit error: ${e.message}` }] };
    }
  } else if (name === "scan_security") {
    if (!isKnownAppName(args.appName)) {
      return { content: [{ type: "text", text: "Error: Unknown application." }] };
    }
    const rootDir = path.resolve(__dirname, "../../..");
    const targetDir = path.join("apps", args.appName);
    try {
      let sqlRisks = "";
      try {
        const result = await execFileAsync("git", ["grep", "-n", "-E", "prepare\\(.*\\$\\{.*\\}.*\\)", "--", targetDir], { cwd: rootDir });
        sqlRisks = result.stdout;
      } catch (e: any) {
        if (e.stdout) {
          sqlRisks = e.stdout;
        }
      }
      
      let report = `Security Scan for ${args.appName}:\n\n`;
      report += "1. Potential SQL Injection (string interpolation in .prepare):\n";
      report += sqlRisks ? sqlRisks : "No violations found.\n";
      
      return { content: [{ type: "text", text: report }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Scan error: ${e.message}` }] };
    }
  } else if (name === "suggest_refactor") {
    const rootDir = path.resolve(__dirname, "../../..");
    const absolutePath = resolveContainedRegularFile(rootDir, args.filePath);
    if (!absolutePath) {
       return { content: [{ type: "text", text: "File not found or outside the workspace." }] };
    }
    if (fs.statSync(absolutePath).size > MAX_SOURCE_BYTES) {
       return { content: [{ type: "text", text: "File exceeds the 1 MiB analysis limit." }] };
    }
    const fileContent = fs.readFileSync(absolutePath, "utf-8");
    const lines = fileContent.split("\n");
    let suggestions = `Refactoring Suggestions for ${args.filePath}:\n`;
    
    if (lines.length > 200) {
      suggestions += `- [Bloated Component] File has ${lines.length} lines. Consider splitting it into smaller sub-components.\n`;
    }
    if (fileContent.includes("memo(") && !fileContent.includes("displayName")) {
      suggestions += `- [Missing displayName] Component uses React.memo but doesn't set a displayName. This is required by AGENTS.md.\n`;
    }
    if (fileContent.includes("fetch(") && !fileContent.includes("useQuery")) {
      suggestions += `- [State Management] Detected raw fetch() usage. Consider migrating to React Query (useQuery/useMutation) for server state.\n`;
    }
    
    if (suggestions.split("\n").length === 2) {
      suggestions += "No major structural issues detected.";
    }
    return { content: [{ type: "text", text: suggestions }] };
  } else if (name === "discover_shared_assets") {
    const rootDir = path.resolve(__dirname, "../../..");
    const packagePath = path.join(rootDir, "packages", args.assetType, "src");
    
    try {
      const indexFile = path.join(packagePath, "index.ts");
      if (fs.existsSync(indexFile)) {
         const content = fs.readFileSync(indexFile, "utf-8");
         return { content: [{ type: "text", text: `Exports for @clickflash/${args.assetType}:\n\n${content}` }] };
      } else {
         let output = "";
         if (fs.existsSync(packagePath)) {
            const files = fs.readdirSync(packagePath, { withFileTypes: true });
            output = files.map(f => `${f.isDirectory() ? 'd' : '-'} ${f.name}`).join('\n');
         } else {
            output = "Directory does not exist.";
         }
         return { content: [{ type: "text", text: `Index file not found. Files in package:\n${output}` }] };
      }
    } catch (e: any) {
      return { content: [{ type: "text", text: `Discovery error: ${e.message}` }] };
    }
  } else if (name === "fetch_app_logs") {
    try {
      if (!isKnownAppName(args.appName)) {
        return { content: [{ type: "text", text: "Error: Unknown application." }] };
      }
      const lines = Number.isInteger(args.lines) ? Math.min(Math.max(args.lines, 1), 1000) : 100;
      const rootDir = path.resolve(__dirname, "../../..");
      const logDir = path.join(rootDir, "apps", args.appName, "logs");
      if (!fs.existsSync(logDir) || fs.lstatSync(logDir).isSymbolicLink()) {
         return { content: [{ type: "text", text: `No logs directory found for ${args.appName} at ${logDir}` }] };
      }
      
      const files = fs.readdirSync(logDir)
        .filter((file) => file.endsWith(".log"))
        .map((file) => ({ file, fullPath: resolveContainedRegularFile(logDir, file) }))
        .filter((entry): entry is { file: string; fullPath: string } => Boolean(entry.fullPath))
        .filter((entry) => fs.statSync(entry.fullPath).size <= MAX_LOG_BYTES)
        .sort((a, b) => fs.statSync(a.fullPath).mtimeMs - fs.statSync(b.fullPath).mtimeMs);
      if (files.length === 0) return { content: [{ type: "text", text: "Log directory is empty or has no .log files." }] };
      
      const latestLog = files.at(-1)!;
      const content = fs.readFileSync(latestLog.fullPath, "utf8").split(/\r?\n/).slice(-lines).join("\n");
      return { content: [{ type: "text", text: `Latest log (${latestLog.file}):\n${content}` }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error fetching logs: ${e.message}` }] };
    }
  } else if (name === "swarm_plan_task") {
    return await handleSwarmPlanTask(args);
  } else if (name === "swarm_synthesize_results") {
    return await handleSwarmSynthesize(args);
  } else if (name === "ceo_scan") {
    const rootDir = path.resolve(__dirname, "../../../..");
    const focus: string = args.focus || 'auto';
    
    try {
      // 1. Read ROADMAP.md to find unchecked items
      const roadmapPath = path.join(rootDir, "ROADMAP.md");
      let roadmapTasks: string[] = [];
      if (fs.existsSync(roadmapPath)) {
        const roadmap = fs.readFileSync(roadmapPath, "utf-8");
        const lines = roadmap.split("\n");
        roadmapTasks = lines
          .filter(l => l.match(/^\s*-\s*\[\s\]/)) // Unchecked items
          .map(l => l.replace(/^\s*-\s*\[\s\]\s*/, '').trim());
      }

      // 2. Read gap report for blocking issues
      const gapPath = path.join(rootDir, "packages_gap_report.json");
      let blockingGaps: any[] = [];
      if (fs.existsSync(gapPath)) {
        const gaps = JSON.parse(fs.readFileSync(gapPath, "utf-8"));
        blockingGaps = gaps.filter((g: any) => g.blocking === "yes" && (g.severity === "CRITICAL" || g.severity === "HIGH"));
      }

      // 3. Check git status for uncommitted work
      let gitStatus = '';
      try {
        const { stdout } = await execAsync("git status --porcelain | head -20", { cwd: rootDir });
        gitStatus = stdout.trim();
      } catch { /* ignore */ }

      // 4. Prioritize based on focus
      let recommendation = '';
      let priority = '';

      if (blockingGaps.length > 0 && (focus === 'auto' || focus === 'security')) {
        const gap = blockingGaps[0];
        priority = 'CRITICAL';
        recommendation = `[SECURITY] Fix ${gap.severity} issue: ${gap.description} in ${gap.location}. Impact: ${gap.impact}. Fix: ${gap.fix}`;
      } else if (roadmapTasks.length > 0 && (focus === 'auto' || focus === 'roadmap' || focus === 'revenue')) {
        priority = 'HIGH';
        recommendation = `[ROADMAP] ${roadmapTasks[0]}`;
      } else {
        priority = 'MEDIUM';
        recommendation = '[MAINTENANCE] All roadmap items and critical gaps are resolved. Run test coverage expansion or performance profiling.';
      }

      const report = [
        `=== CEO SCAN REPORT ===${"\n"}`,
        `Priority: ${priority}`,
        `Focus: ${focus}`,
        `Recommendation: ${recommendation}`,
        ``,
        `--- Roadmap Status ---`,
        `Remaining items: ${roadmapTasks.length}`,
        roadmapTasks.length > 0 ? `Next 3:\n${roadmapTasks.slice(0, 3).map((t, i) => `  ${i + 1}. ${t}`).join('\n')}` : 'All complete!',
        ``,
        `--- Blocking Gaps ---`,
        `Count: ${blockingGaps.length}`,
        blockingGaps.length > 0 ? `Top: ${blockingGaps[0].description} (${blockingGaps[0].location})` : 'None remaining.',
        ``,
        `--- Workspace ---`,
        gitStatus ? `Uncommitted changes:\n${gitStatus}` : 'Clean workspace.',
      ].join('\n');

      return { content: [{ type: "text", text: report }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `CEO Scan error: ${e.message}` }] };
    }
  } else if (name === "ceo_deploy_swarm") {
    const task: string = args.task;
    const maxAgents: number = Math.min(args.maxAgents || 5, 10);

    // Generate a structured agent deployment plan that the calling AI client can execute
    const plan = {
      task,
      maxAgents,
      timestamp: new Date().toISOString(),
      agents: [
        {
          role: "Research Agent",
          instruction: `Explore the codebase files related to: ${task}. Identify all files that need modification, existing patterns to follow, and dependencies to consider.`,
          model: "flash",
        },
        {
          role: "Implementation Agent",
          instruction: `Implement the changes for: ${task}. Write production-ready TypeScript code following existing ClickFlash patterns. Use @clickflash/errors for error handling and @clickflash/logger for logging.`,
          model: "pro",
        },
        {
          role: "Test Agent",
          instruction: `Write comprehensive Vitest unit tests for the changes made for: ${task}. Aim for >80% coverage on new code.`,
          model: "flash",
        },
        {
          role: "Verification Agent",
          instruction: `After implementation, run: npm run typecheck:all && pnpm run test:all. Report any failures.`,
          model: "flash",
        },
      ].slice(0, maxAgents),
      verification: {
        commands: [
          "npm run typecheck:all",
          "pnpm run test:all",
          "npm run lint:all",
        ],
        successCriteria: "All commands must exit with code 0.",
      },
    };

    return { content: [{ type: "text", text: JSON.stringify(plan, null, 2) }] };
  } else if (name === "ceo_status") {
    const rootDir = path.resolve(__dirname, "../../../..");
    
    try {
      // Read ROADMAP.md
      const roadmapPath = path.join(rootDir, "ROADMAP.md");
      let completed = 0;
      let remaining = 0;
      let phases: string[] = [];
      
      if (fs.existsSync(roadmapPath)) {
        const roadmap = fs.readFileSync(roadmapPath, "utf-8");
        const lines = roadmap.split("\n");
        for (const line of lines) {
          if (line.match(/^\s*-\s*\[x\]/i)) completed++;
          if (line.match(/^\s*-\s*\[\s\]/)) remaining++;
          if (line.startsWith('## Phase')) phases.push(line.replace('## ', ''));
        }
      }

      // Git log for recent changes
      let recentCommits = '';
      try {
        const { stdout } = await execAsync('git log --oneline -5', { cwd: rootDir });
        recentCommits = stdout.trim();
      } catch { /* ignore */ }

      const status = [
        `=== CLICKFLASH CEO STATUS ===${"\n"}`,
        `Version: 2.0.0 | Ecosystem: V8.0 Omni-Modal`,
        ``,
        `--- Roadmap Progress ---`,
        `Completed: ${completed} | Remaining: ${remaining} | Total: ${completed + remaining}`,
        `Progress: ${Math.round((completed / Math.max(completed + remaining, 1)) * 100)}%`,
        `Phases: ${phases.join(' → ')}`,
        ``,
        `--- Recent Activity ---`,
        recentCommits || 'No recent commits.',
        ``,
        `--- Strategic Recommendation ---`,
        remaining > 0 
          ? `Focus on completing Phase 1 before advancing. ${remaining} items remain across ${phases.length} phases.`
          : `All roadmap items complete. Consider expanding to V9.0 or scaling operations.`,
      ].join('\n');

      return { content: [{ type: "text", text: status }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `CEO Status error: ${e.message}` }] };
    }
  } else if (name === "competitor_scan") {
    return await handleCompetitorScan(args);
  } else if (name === "find_better_ideas") {
    return await handleFindBetterIdeas(args);
  } else if (name === "yield_simulator") {
    return await handleYieldSimulator(args);
  } else if (name === "revenue_dashboard") {
    return await handleRevenueDashboard(args);
  } else if (name === "abandoned_cart_scan") {
    return await handleAbandonedCartScan(args);
  } else if (name === "ble_beacon_status") {
    return await handleBleBeaconStatus(args);
  } else if (name === "edge_health_check") {
    return await handleEdgeHealthCheck(args);
  } else if (name === "camera_fleet_status") {
    return await handleCameraFleetStatus(args);
  } else if (name === "culling_stats") {
    return await handleCullingStats(args);
  } else if (name === "vector_index_health") {
    return await handleVectorIndexHealth(args);
  } else if (name === "trigger_batch_enhance") {
    return await handleTriggerBatchEnhance(args);
  } else if (name === "face_match_accuracy") {
    return await handleFaceMatchAccuracy(args);
  } else if (name === "park_heatmap") {
    return await handleParkHeatmap(args);
  } else if (name === "guest_journey_trace") {
    return await handleGuestJourneyTrace(args);
  } else if (name === "daily_briefing") {
    return await handleDailyBriefing(args);
  } else if (name === "weekly_trend_report") {
    return await handleWeeklyTrendReport(args);
  } else if (name === "whatsapp_send_magic_link") {
    return await handleWhatsappSendMagicLink(args);
  } else if (name === "whatsapp_campaign_status") {
    return await handleWhatsappCampaignStatus(args);
  } else if (name === "sales_swarm_deploy") {
    return await handleSalesSwarmDeploy(args);
  } else if (name === "lead_scoring") {
    return await handleLeadScoring(args);
  } else if (name === "photographer_leaderboard") {
    return await handlePhotographerLeaderboard(args);
  } else if (name === "photographer_dispatch") {
    return await handlePhotographerDispatch(args);
  } else if (name === "shift_planner") {
    return await handleShiftPlanner(args);
  } else if (name === "gdpr_audit") {
    return await handleGdprAudit(args);
  } else if (name === "biometric_consent_check") {
    return await handleBiometricConsentCheck(args);
  } else if (name === "pci_dss_scan") {
    return await handlePciDssScan(args);
  } else if (name === "auto_fix_loop") {
    return await handleAutoFixLoop(args);
  } else if (name === "issue_scanner") {
    return await handleIssueScanner(args);
  } else if (name === "build_status") {
    return await handleBuildStatus(args);
  } else if (name === "dependency_audit") {
    return await handleDependencyAudit(args);
  } else if (name === "bundle_size_check") {
    return await handleBundleSizeCheck(args);
  } else if (name === "dead_code_scanner") {
    return await handleDeadCodeScanner(args);
  } else if (name === "changelog_generator") {
    return await handleChangelogGenerator(args);
  } else if (name === "tech_debt_tracker") {
    return await handleTechDebtTracker(args);
  } else if (name === "customer_segmentation") {
    return await handleCustomerSegmentation(args);
  } else if (name === "nps_calculator") {
    return await handleNpsCalculator(args);
  } else if (name === "churn_predictor") {
    return await handleChurnPredictor(args);
  } else if (name === "multi_venue_overview") {
    return await handleMultiVenueOverview(args);
  } else if (name === "currency_converter") {
    return await handleCurrencyConverter(args);
  } else if (name === "venue_comparison") {
    return await handleVenueComparison(args);
  } else if (name === "api_endpoint_lister") {
    return await handleApiEndpointLister(args);
  } else if (name === "env_validator") {
    return await handleEnvValidator(args);
  } else if (name === "monorepo_health_score") {
    return await handleMonorepoHealthScore(args);
  } else if (name === "error_log_analyzer") {
    return await handleErrorLogAnalyzer(args);
  } else if (name === "accessibility_audit") {
    return await handleAccessibilityAudit(args);
  } else if (name === "i18n_scanner") {
    return await handleI18nScanner(args);
  } else if (name === "license_checker") {
    return await handleLicenseChecker(args);
  } else if (name === "performance_profiler") {
    return await handlePerformanceProfiler(args);
  } else if (name === "photo_pipeline_status") {
    return await handlePhotoPipelineStatus(args);
  } else if (name === "deployment_readiness") {
    return await handleDeploymentReadiness(args);
  } else if (name === "redis_monitor") {
    return await handleRedisMonitor(args);
  } else if (name === "migration_planner") {
    return await handleMigrationPlanner(args);
  } else if (name === "audit_app_boundaries") {
    return await handleAuditAppBoundaries(args);
  } else if (name === "search_architecture_gaps") {
    return await handleSearchArchitectureGaps(args);
  } else if (name === "ui_ux_accessibility_fixer") {
    return await handleUiUxAccessibilityFixer(args);
  } else if (name === "final_production_readiness") {
    return await handleFinalProductionReadiness(args);
  } else if (name === "start_infinite_loop" || name === "report_gap_fixed" || name === "check_loop_status") {
    return await handleInfiniteLoopCall(name, args);
  } else if (name === "audit_ux_flow") {
    return await handleAuditUxFlow(args);
  } else if (name === "generate_feature_idea") {
    return await handleGenerateFeatureIdea(args);
  } else if (name === "start_infinite_feature_loop") {
    return await handleStartInfiniteFeatureLoop(args);
  } else if (name === "deep_think_analyze") {
    return await handleDeepThinkAnalyze(args);
  } else if (name === "deep_scan_ast") {
    return await handleDeepScanAst(args);
  } else if (name === "deep_search_symbols") {
    return await handleDeepSearchSymbols(args);
  } else if (name === "deep_plan_synthesizer") {
    return await handleDeepPlanSynthesizer(args);
  } else if (name === "deep_scan_architecture") {
    return await handleDeepScanArchitecture(args);
  } else if (name === "chaos_edge_fault_injector") {
    return await handleChaosEdgeFaultInjector(args);
  } else if (name === "offline_storage_pressure_tester") {
    return await handleOfflineStoragePressureTester(args);
  } else if (name === "arcface_vector_benchmarker") {
    return await handleArcfaceVectorBenchmarker(args);
  } else if (name === "burst_action_shot_scorer") {
    return await handleBurstActionShotScorer(args);
  } else if (name === "dynamic_yield_arbitrage_engine") {
    return await handleDynamicYieldArbitrageEngine(args);
  } else if (name === "whale_lead_negotiator") {
    return await handleWhaleLeadNegotiator(args);
  } else if (name === "drm_ephemeral_watermark_verifier") {
    return await handleDrmEphemeralWatermarkVerifier(args);
  } else if (name === "hardware_license_enclave_validator") {
    return await handleHardwareLicenseEnclaveValidator(args);
  } else if (name === "synthetic_park_simulator") {
    return await handleSyntheticParkSimulator(args);
  } else if (name === "load_stress_benchmark") {
    return await handleLoadStressBenchmark(args);
  }

  
  throw new Error(`Unknown tool: ${name}`);
}
