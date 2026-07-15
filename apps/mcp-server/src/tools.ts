import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export function registerTools(): Tool[] {
  return [
    {
      name: "start_app",
      description: "Start a ClickFlash app in the background",
      inputSchema: {
        type: "object",
        properties: {
          appName: { type: "string", description: "Name of the app to start (e.g., master, touch, website)" }
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
          appName: { type: "string", description: "Name of the app to scan (e.g. master, touch)" }
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
      name: "generate_license",
      description: "Generates an Ed25519-signed license directly from the MCP. Useful for automated setup or tests without interacting with the Management UI.",
      inputSchema: {
        type: "object",
        properties: {
          deskId: { type: "string" },
          plan: { type: "string", enum: ["free", "pro", "enterprise"] },
          maxMasters: { type: "number" }
        },
        required: ["deskId", "plan", "maxMasters"]
      }
    },
    {
      name: "run_migrations",
      description: "Automatically run Prisma migrations for a specified application.",
      inputSchema: {
        type: "object",
        properties: {
          appName: { type: "string", description: "Name of the app (e.g. master, management)" }
        },
        required: ["appName"]
      }
    },
    {
      name: "fetch_app_logs",
      description: "Reads the most recent logs outputted by @clickflash/logger for an app.",
      inputSchema: {
        type: "object",
        properties: {
          appName: { type: "string", description: "Name of the app (e.g. master)" },
          lines: { type: "number", description: "Number of tail lines to fetch" }
        },
        required: ["appName"]
      }
    },
    {
      name: "deploy_app",
      description: "Triggers a deployment for a specific app or the whole ecosystem.",
      inputSchema: {
        type: "object",
        properties: {
          appName: { type: "string", description: "Name of the app, or 'all' for ecosystem" }
        },
        required: ["appName"]
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
    const filterMap: Record<string, string> = {
      master: "clickflash-master",
      touch: "clickflash-touch",
      website: "main-website",
      gallery: "star-master-customer",
      management: "star-master-management",
      moneytrash: "moneytrash-uploader"
    };
    
    const filter = filterMap[args.appName] || args.appName;
    return {
      content: [{ type: "text", text: `To start ${args.appName}, please run this command in your terminal: pnpm --filter ${filter} run dev` }]
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
      report += "1. console.log usage (violates Zero console.log mandate):\n";
      report += consoleLogs ? consoleLogs : "No violations found.\n";
      report += "\n2. Banned SaaS Usage (violates 100% Custom mandate):\n";
      report += bannedSaaS ? bannedSaaS : "No violations found.\n";
      
      return { content: [{ type: "text", text: report }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Audit error: ${e.message}` }] };
    }
  } else if (name === "scan_security") {
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
    const absolutePath = path.join(rootDir, args.filePath);
    if (!fs.existsSync(absolutePath)) {
       return { content: [{ type: "text", text: `File not found: ${args.filePath}` }] };
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
  } else if (name === "generate_license") {
    try {
      const { generateEd25519KeyPair, generateEd25519License } = await import("@clickflash/licensing/src/ed25519");
      const pair = generateEd25519KeyPair();
      const license = generateEd25519License({
        plan: args.plan,
        maxMasters: args.maxMasters,
        expiresDays: 365,
        machineId: args.deskId
      }, pair.privateKey);
      return { content: [{ type: "text", text: `License: ${license}\nPrivateKey: ${pair.privateKey}\nPublicKey: ${pair.publicKey}` }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error generating license: ${e.message}` }] };
    }
  } else if (name === "run_migrations") {
    try {
      const rootDir = path.resolve(__dirname, "../../..");
      // Using generic db:push or prisma generate depending on the app.
      const { stdout, stderr } = await execAsync(`pnpm --filter clickflash-${args.appName} run db:push`, { cwd: rootDir });
      return { content: [{ type: "text", text: `Migration output:\n${stdout}\n${stderr}` }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Migration error: ${e.message}` }] };
    }
  } else if (name === "fetch_app_logs") {
    try {
      const lines = args.lines || 100;
      const rootDir = path.resolve(__dirname, "../../..");
      const logDir = path.join(rootDir, "apps", args.appName, "logs");
      if (!fs.existsSync(logDir)) {
         return { content: [{ type: "text", text: `No logs directory found for ${args.appName} at ${logDir}` }] };
      }
      
      const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
      if (files.length === 0) return { content: [{ type: "text", text: "Log directory is empty or has no .log files." }] };
      
      const latestLog = files.sort().pop();
      const logPath = path.join(logDir, latestLog!);
      
      let content = "";
      if (process.platform === "win32") {
        const { stdout } = await execAsync(`powershell -Command "Get-Content '${logPath}' -Tail ${lines}"`);
        content = stdout;
      } else {
        const { stdout } = await execAsync(`tail -n ${lines} "${logPath}"`);
        content = stdout;
      }
      return { content: [{ type: "text", text: `Latest log (${latestLog}):\n${content}` }] };
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error fetching logs: ${e.message}` }] };
    }
  } else if (name === "deploy_app") {
    return { content: [{ type: "text", text: `Deployment command received. Simulated deployment triggered for ${args.appName}.` }] };
  }
  
  throw new Error(`Unknown tool: ${name}`);
}
