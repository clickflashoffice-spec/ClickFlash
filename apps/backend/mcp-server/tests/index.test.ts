import { describe, it, expect } from "vitest";
import { handleToolCall, registerTools } from "../src/tools.js";
import { registerResources } from "../src/resources.js";
import { registerPrompts } from "../src/prompts.js";

describe("clickflash-mcp", () => {
  it("should register tools correctly", () => {
    const tools = registerTools();
    expect(tools.length).toBeGreaterThanOrEqual(80);
    
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("start_app");
    expect(toolNames).toContain("query_local_db");
    expect(toolNames).toContain("audit_architecture");
    expect(toolNames).toContain("scan_security");
    expect(toolNames).toContain("suggest_refactor");
    expect(toolNames).toContain("discover_shared_assets");
    
    expect(toolNames).toContain("deep_think_analyze");
    expect(toolNames).toContain("deep_scan_ast");
    expect(toolNames).toContain("deep_search_symbols");
    expect(toolNames).toContain("deep_plan_synthesizer");
    
    // Ensure dangerous tools are NOT exposed
    expect(toolNames).not.toContain("generate_license");
    expect(toolNames).not.toContain("run_migrations");
    expect(toolNames).not.toContain("deploy_app");
  });

  it("should handle deep_think_analyze correctly", async () => {
    const res = await handleToolCall("deep_think_analyze", { topic: "Event-Driven Ingestion" });
    const text = (res.content[0] as any).text;
    expect(text).toContain("DEEP THINK ARCHITECTURAL REASONING");
    expect(text).toContain("Security & Compliance");
  });

  it("should handle deep_scan_ast correctly", async () => {
    const res = await handleToolCall("deep_scan_ast", { targetPath: "apps/master", scanType: "concurrency" });
    const text = (res.content[0] as any).text;
    expect(text).toContain("DEEP AST & STATIC CODE INSPECTION");
    expect(text).toContain("AST Integrity Score");
  });

  it("should handle deep_search_symbols correctly", async () => {
    const res = await handleToolCall("deep_search_symbols", { symbolName: "PricingContract" });
    const text = (res.content[0] as any).text;
    expect(text).toContain("DEEP SYMBOL & CALL-GRAPH DISCOVERY");
  });

  it("should handle deep_plan_synthesizer correctly", async () => {
    const res = await handleToolCall("deep_plan_synthesizer", { goalTitle: "Ecosystem Goal", targetApps: ["apps/master"] });
    const text = (res.content[0] as any).text;
    expect(text).toContain("SPEC-DRIVEN DEVELOPMENT (SDD) PLAN");
  });

  it("should handle chaos and storage pressure tools", async () => {
    const chaosRes = await handleToolCall("chaos_edge_fault_injector", { faultType: "network_partition" });
    expect((chaosRes.content[0] as any).text).toContain("CHAOS FAULT INJECTION REPORT");

    const storageRes = await handleToolCall("offline_storage_pressure_tester", { simulatedDiskUsagePercent: 95 });
    expect((storageRes.content[0] as any).text).toContain("OFFLINE STORAGE PRESSURE TEST");
  });

  it("should handle vision and action shot tools", async () => {
    const visionRes = await handleToolCall("arcface_vector_benchmarker", { testDatasetSize: 50000 });
    expect((visionRes.content[0] as any).text).toContain("ARCFACE VECTOR & VP-TREE BENCHMARK");

    const burstRes = await handleToolCall("burst_action_shot_scorer", { rideName: "Coaster Apex", burstFrameCount: 12 });
    expect((burstRes.content[0] as any).text).toContain("BURST ACTION SHOT SCORER");
  });

  it("should handle yield arbitrage and whale negotiator tools", async () => {
    const yieldRes = await handleToolCall("dynamic_yield_arbitrage_engine", { venueType: "theme_park", hourlyAttendance: 2500, weatherCondition: "clear_sunny" });
    expect((yieldRes.content[0] as any).text).toContain("DYNAMIC YIELD ARBITRAGE MATRIX");

    const whaleRes = await handleToolCall("whale_lead_negotiator", { guestTier: "whale", cartValue: 250, photosInGallery: 18 });
    expect((whaleRes.content[0] as any).text).toContain("VIP WHALE CLOSER");
  });

  it("should handle crypto and DRM watermark tools", async () => {
    const drmRes = await handleToolCall("drm_ephemeral_watermark_verifier", { assetId: "photo_0192" });
    expect((drmRes.content[0] as any).text).toContain("ZERO-TRUST DRM WATERMARK VERIFIER");

    const licenseRes = await handleToolCall("hardware_license_enclave_validator", { nodeId: "node_master_001" });
    expect((licenseRes.content[0] as any).text).toContain("HARDWARE LICENSE ENCLAVE VALIDATION");
  });

  it("should handle synthetic simulation and stress benchmark tools", async () => {
    const simRes = await handleToolCall("synthetic_park_simulator", { guestCount: 1000 });
    expect((simRes.content[0] as any).text).toContain("SYNTHETIC RESORT ECOSYSTEM SIMULATION");

    const loadRes = await handleToolCall("load_stress_benchmark", { requestsPerSecond: 5000 });
    expect((loadRes.content[0] as any).text).toContain("HIGH-THROUGHPUT STRESS BENCHMARK");
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
    expect(prompts.length).toBeGreaterThanOrEqual(2);
    expect(prompts[0].name).toBe("debug_issue");
  });
});
