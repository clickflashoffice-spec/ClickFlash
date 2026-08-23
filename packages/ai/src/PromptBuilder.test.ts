import { describe, it, expect } from 'vitest';
import { PromptBuilder } from './PromptBuilder.js';
import { AgentTools } from './AgentTools.js';

describe('PromptBuilder', () => {
  it('should correctly inject variables into the subagent handoff template', async () => {
    const builder = new PromptBuilder();
    
    const result = await builder.loadTemplate('subagents/tasks', 'subagent_task_short.tmpl', {
       TASK_CONTEXT: "Fix the offline sync on React Native"
    });
    
    expect(result).toContain("Fix the offline sync on React Native");
    expect(result).toContain("npm run typecheck:all");
  });

  it('should build the Master System Prompt without throwing', async () => {
    const builder = new PromptBuilder();
    const systemPrompt = await builder.buildMasterSystemPrompt();
    
    expect(systemPrompt).toBeDefined();
    expect(systemPrompt.length).toBeGreaterThan(100);
    expect(systemPrompt).toContain("ClickFlash Ecosystem (V6.0)");
  });

  it('should list all curated templates with variable extraction', async () => {
    const builder = new PromptBuilder();
    const templates = await builder.listAllTemplates();
    
    expect(templates.length).toBeGreaterThan(10);
    const hasCoreIdentity = templates.some(t => t.filename === 'identity.tmpl');
    expect(hasCoreIdentity).toBe(true);
  });

  it('should validate the curated template registry integrity', async () => {
    const builder = new PromptBuilder();
    const validation = await builder.validateRegistry();
    
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
    expect(validation.totalTemplates).toBeGreaterThanOrEqual(4);
  });
});

describe('AgentTools', () => {
  it('should safely enforce read-only checks on SQLite queries', async () => {
    const result = await AgentTools.querySQLiteQueue("DELETE FROM pending_writes");
    expect(result).toContain("ERROR: Only read-only queries");
  });
});

