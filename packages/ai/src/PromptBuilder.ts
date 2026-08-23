import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * ClickFlash Prompt Builder
 * Assembles the V6.0 AI Agent System Prompts from the curated/ templates.
 */
export class PromptBuilder {
  private baseDir: string;

  constructor(baseDir?: string) {
    if (baseDir) {
      this.baseDir = path.resolve(__dirname, baseDir);
    } else {
      const candidates = [
        path.resolve(process.cwd(), 'curated'),
        path.resolve(__dirname, '../../curated'),
        path.resolve(__dirname, '../../../curated'),
        path.resolve(__dirname, '../../../../curated'),
      ];
      this.baseDir = candidates.find(c => existsSync(c)) || path.resolve(process.cwd(), 'curated');
    }
  }

  /**
   * Loads a template and injects dynamic variables (e.g., {{TASK_CONTEXT}})
   */
  async loadTemplate(category: string, filename: string, vars: Record<string, string> = {}): Promise<string> {
    const filePath = path.join(this.baseDir, category, filename);
    let content = await fs.readFile(filePath, 'utf-8');
    
    for (const [key, value] of Object.entries(vars)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    
    return content;
  }

  /**
   * Assembles the main Master Agent system prompt
   */
  async buildMasterSystemPrompt(): Promise<string> {
    try {
      const parts = [
        await this.loadTemplate('system_prompts/core', 'identity.tmpl'),
        await this.loadTemplate('system_prompts/core', 'identity_agent.tmpl'),
        await this.loadTemplate('system_prompts/core', 'guidelines.tmpl'),
        await this.loadTemplate('system_prompts/core', 'planning_mode.tmpl')
      ];
      
      return parts.join('\n\n---\n\n');
    } catch (error) {
      console.error("Failed to compile Master System Prompt. Ensure the curated/ directory is populated.", error);
      throw error;
    }
  }
}
