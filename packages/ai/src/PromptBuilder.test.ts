import { describe, it, expect } from 'vitest';
import { PromptBuilder } from './PromptBuilder';

describe('PromptBuilder', () => {
  it('should correctly inject variables into the subagent handoff template', async () => {
    const builder = new PromptBuilder();
    
    // Test that the variables are correctly replaced
    const result = await builder.loadTemplate('subagents/tasks', 'subagent_task_short.tmpl', {
       TASK_CONTEXT: "Fix the offline sync on React Native"
    });
    
    expect(result).toContain("Fix the offline sync on React Native");
    expect(result).toContain("npm run typecheck:all"); // From the base template
  });

  it('should build the Master System Prompt without throwing', async () => {
    const builder = new PromptBuilder();
    const systemPrompt = await builder.buildMasterSystemPrompt();
    
    expect(systemPrompt).toBeDefined();
    expect(systemPrompt.length).toBeGreaterThan(100);
    expect(systemPrompt).toContain("ClickFlash Ecosystem (V6.0)"); // From identity.tmpl
  });
});
