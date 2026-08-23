#!/usr/bin/env node
import { AgentOrchestrator } from './AgentOrchestrator.js';

/**
 * ClickFlash AI CLI Entrypoint
 * Usage: pnpm run ai:agent "description of task"
 */
async function main() {
  const prompt = process.argv.slice(2).join(' ');
  
  if (!prompt) {
    console.error("❌ Usage: pnpm run ai:agent <task-description>");
    console.error('Example: pnpm run ai:agent "Fix the biometric sync bug in Touch Kiosk"');
    process.exit(1);
  }

  // Fallback to env var or mock key for testing
  const apiKey = process.env.GEMINI_API_KEY || "mock-dev-key";
  const orchestrator = new AgentOrchestrator(apiKey);
  
  try {
    const result = await orchestrator.runTask(prompt);
    console.log("\n🎉 [Result]:\n", result);
  } catch (err) {
    console.error("Agent crashed:", err);
  }
}

main().catch(console.error);
