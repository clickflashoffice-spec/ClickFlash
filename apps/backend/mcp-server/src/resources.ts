import { Resource } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerResources(): Resource[] {
  return [
    {
      uri: "clickflash://architecture",
      name: "ClickFlash Architecture",
      description: "Architecture guidelines and infrastructure overview for ClickFlash apps."
    },
    {
      uri: "clickflash://logs/master",
      name: "Master Logs",
      description: "Recent logs from the Master Portal."
    },
    {
      uri: "clickflash://logs/touch",
      name: "Touch Logs",
      description: "Recent logs from the Touch Kiosk."
    },
    {
      uri: "clickflash://plans/implementation",
      name: "Current Implementation Plan",
      description: "The active implementation plan for the current objective."
    },
    {
      uri: "clickflash://plans/tasks",
      name: "Current Task List",
      description: "The active task checklist for the current objective."
    }
  ];
}

export async function handleReadResource(uri: string) {
  const rootDir = path.resolve(__dirname, "../../..");
  
  if (uri === "clickflash://architecture") {
    const archPath = path.join(rootDir, "ARCHITECTURE.md");
    const fallbackPath = path.join(rootDir, "README.md");
    
    let content = "Architecture documentation not found.";
    if (fs.existsSync(archPath)) {
      content = fs.readFileSync(archPath, "utf-8");
    } else if (fs.existsSync(fallbackPath)) {
      content = fs.readFileSync(fallbackPath, "utf-8");
    }
    
    return {
      contents: [{
        uri,
        mimeType: "text/markdown",
        text: content
      }]
    };
  }
  
  if (uri.startsWith("clickflash://logs/")) {
    const appName = uri.split("/").pop();
    const logPath1 = path.join(rootDir, "apps", appName || "", "logs", "app.log");
    const logPath2 = path.join(rootDir, "tests.log");
    
    let content = `No recent logs found for ${appName}.`;
    if (fs.existsSync(logPath1)) {
      const stats = fs.statSync(logPath1);
      const stream = fs.createReadStream(logPath1, { start: Math.max(0, stats.size - 10000) });
      const buffers = [];
      for await (const chunk of stream) buffers.push(chunk);
      content = Buffer.concat(buffers).toString("utf-8");
    } else if (fs.existsSync(logPath2)) {
      const stats = fs.statSync(logPath2);
      const stream = fs.createReadStream(logPath2, { start: Math.max(0, stats.size - 10000) });
      const buffers = [];
      for await (const chunk of stream) buffers.push(chunk);
      content = Buffer.concat(buffers).toString("utf-8");
    }
    
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: content
      }]
    };
  }
  
  if (uri === "clickflash://plans/implementation" || uri === "clickflash://plans/tasks") {
    const fileName = uri.includes("implementation") ? "implementation_plan.md" : "task.md";
    const filePath = path.join(rootDir, ".clickflash-plans", fileName);
    
    let content = "No active plan found. Use the create_plan tool to start one.";
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, "utf-8");
    }
    
    return {
      contents: [{
        uri,
        mimeType: "text/markdown",
        text: content
      }]
    };
  }
  
  throw new Error(`Resource not found: ${uri}`);
}
