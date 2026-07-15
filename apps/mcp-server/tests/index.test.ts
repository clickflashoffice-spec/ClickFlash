import assert from "assert";
import { registerTools } from "../src/tools.js";
import { registerResources } from "../src/resources.js";
import { registerPrompts } from "../src/prompts.js";

async function runTests() {
  console.log("Running tests for clickflash-mcp...");

  // Test tools registration
  const tools = registerTools();
  assert(tools.length === 10, "Should register 10 tools");
  assert(tools.find((t) => t.name === "start_app"), "Should have start_app tool");
  assert(tools.find((t) => t.name === "query_local_db"), "Should have query_local_db tool");
  assert(tools.find((t) => t.name === "audit_architecture"), "Should have audit_architecture tool");
  assert(tools.find((t) => t.name === "scan_security"), "Should have scan_security tool");
  assert(tools.find((t) => t.name === "suggest_refactor"), "Should have suggest_refactor tool");
  assert(tools.find((t) => t.name === "discover_shared_assets"), "Should have discover_shared_assets tool");

  // Test resources registration
  const resources = registerResources();
  assert(resources.length === 5, "Should register 5 resources");
  assert(resources.find((r) => r.uri === "clickflash://architecture"), "Should have architecture resource");

  // Test prompts registration
  const prompts = registerPrompts();
  assert(prompts.length === 1, "Should register 1 prompt");
  assert(prompts[0].name === "debug_issue", "Should have debug_issue prompt");

  console.log("All MCP unit tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Tests failed:", err);
  process.exit(1);
});
