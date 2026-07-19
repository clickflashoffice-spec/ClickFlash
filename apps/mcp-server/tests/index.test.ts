import assert from "assert";
import { handleToolCall, registerTools } from "../src/tools.js";
import { registerResources } from "../src/resources.js";
import { registerPrompts } from "../src/prompts.js";

async function runTests() {
  console.log("Running tests for clickflash-mcp...");

  // Test tools registration
  const tools = registerTools();
  assert(tools.length === 11, "Should register 11 tools");
  assert(tools.find((t) => t.name === "start_app"), "Should have start_app tool");
  assert(tools.find((t) => t.name === "query_local_db"), "Should have query_local_db tool");
  assert(tools.find((t) => t.name === "audit_architecture"), "Should have audit_architecture tool");
  assert(tools.find((t) => t.name === "scan_security"), "Should have scan_security tool");
  assert(tools.find((t) => t.name === "suggest_refactor"), "Should have suggest_refactor tool");
  assert(tools.find((t) => t.name === "discover_shared_assets"), "Should have discover_shared_assets tool");
  assert(!tools.find((t) => t.name === "generate_license"), "Must not expose signing-key generation");
  assert(!tools.find((t) => t.name === "run_migrations"), "Must not expose an unscoped migration shell");
  assert(!tools.find((t) => t.name === "deploy_app"), "Must not advertise simulated deployment");

  const traversal = await handleToolCall("suggest_refactor", { filePath: "../outside.txt" });
  assert.match((traversal.content[0] as any).text, /outside the workspace/);
  const unknownApp = await handleToolCall("start_app", { appName: "master && whoami" });
  assert.match((unknownApp.content[0] as any).text, /Unknown application/);

  // Test resources registration
  const resources = registerResources();
  assert(resources.length === 5, "Should register 5 resources");
  assert(resources.find((r) => r.uri === "clickflash://architecture"), "Should have architecture resource");

  // Test prompts registration
  const prompts = registerPrompts();
  assert(prompts.length === 2, "Should register 2 prompts");
  assert(prompts[0].name === "debug_issue", "Should have debug_issue prompt");

  console.log("All MCP unit tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Tests failed:", err);
  process.exit(1);
});
