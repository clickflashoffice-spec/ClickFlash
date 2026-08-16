import { describe, it, expect } from "vitest";
import { handleToolCall, registerTools } from "../src/tools.js";
import { registerResources } from "../src/resources.js";
import { registerPrompts } from "../src/prompts.js";

describe("clickflash-mcp", () => {
  it("should register tools correctly", () => {
    const tools = registerTools();
    expect(tools.length).toBe(11);
    
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("start_app");
    expect(toolNames).toContain("query_local_db");
    expect(toolNames).toContain("audit_architecture");
    expect(toolNames).toContain("scan_security");
    expect(toolNames).toContain("suggest_refactor");
    expect(toolNames).toContain("discover_shared_assets");
    
    // Ensure dangerous tools are NOT exposed
    expect(toolNames).not.toContain("generate_license");
    expect(toolNames).not.toContain("run_migrations");
    expect(toolNames).not.toContain("deploy_app");
  });

  it("should handle suggest_refactor outside workspace", async () => {
    const traversal = await handleToolCall("suggest_refactor", { filePath: "../outside.txt" });
    const contentText = (traversal.content[0] as any).text;
    expect(contentText).toMatch(/outside the workspace/);
  });

  it("should handle start_app with unknown application", async () => {
    const unknownApp = await handleToolCall("start_app", { appName: "master && whoami" });
    const contentText = (unknownApp.content[0] as any).text;
    expect(contentText).toMatch(/Unknown application/);
  });

  it("should register resources correctly", () => {
    const resources = registerResources();
    expect(resources.length).toBe(5);
    const resourceUris = resources.map((r) => r.uri);
    expect(resourceUris).toContain("clickflash://architecture");
  });

  it("should register prompts correctly", () => {
    const prompts = registerPrompts();
    expect(prompts.length).toBe(2);
    expect(prompts[0].name).toBe("debug_issue");
  });
});
