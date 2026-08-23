export interface TemplateMetadata {
  category: string;
  filename: string;
  fullPath: string;
  sizeBytes: number;
  variables: string[];
}

export interface RegistryValidationResult {
  valid: boolean;
  totalTemplates: number;
  errors: string[];
  templates: TemplateMetadata[];
}

/**
 * ClickFlash Prompt Builder
 * Assembles the V6.0 AI Agent System Prompts from the curated/ templates with hot-reloading support.
 */
export class PromptBuilder {
  private baseDir: string = '';
  private cache = new Map<string, string>();
  private watcher: any = null;

  constructor(baseDir?: string) {
    if (typeof window !== 'undefined' || typeof process === 'undefined' || !process?.versions?.node) {
      this.baseDir = baseDir || '/curated';
      return;
    }
    try {
      const path = require('path');
      const fs = require('fs');
      if (baseDir) {
        this.baseDir = path.resolve(process.cwd(), baseDir);
      } else {
        const candidates = [
          path.resolve(process.cwd(), 'curated'),
          path.resolve(process.cwd(), '../../curated'),
          path.resolve(process.cwd(), '../../../curated'),
        ];
        this.baseDir = candidates.find((c: string) => fs.existsSync(c)) || path.resolve(process.cwd(), 'curated');
      }
    } catch {
      this.baseDir = baseDir || '/curated';
    }
  }

  /**
   * Clears the in-memory template cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Enables live file-system watching for hot-reloading templates on change.
   */
  async enableHotReload(onReload?: (filePath: string) => void): Promise<void> {
    if (typeof window !== 'undefined' || typeof process === 'undefined' || !process?.versions?.node) return;
    try {
      const { watch, existsSync } = await import('fs');
      if (this.watcher || !existsSync(this.baseDir)) return;
      this.watcher = watch(this.baseDir, { recursive: true }, (_eventType, filename) => {
        if (filename) {
          this.cache.clear();
          if (onReload) onReload(filename.toString());
        }
      });
    } catch {
      // Hot reload not supported in this runtime
    }
  }

  /**
   * Disables live file-system watching.
   */
  disableHotReload(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Loads a template and injects dynamic variables (e.g., {{TASK_CONTEXT}})
   */
  async loadTemplate(category: string, filename: string, vars: Record<string, string> = {}): Promise<string> {
    const cacheKey = `${category}/${filename}`;
    let content = this.cache.get(cacheKey);

    if (!content) {
      if (typeof window !== 'undefined' || typeof process === 'undefined' || !process?.versions?.node) {
        return `[Browser Mode] Template: ${category}/${filename}`;
      }
      const path = await import('path');
      const fs = await import('fs/promises');
      const filePath = path.join(this.baseDir, category, filename);
      content = await fs.readFile(filePath, 'utf-8');
      this.cache.set(cacheKey, content);
    }

    let interpolated = content;
    for (const [key, value] of Object.entries(vars)) {
      interpolated = interpolated.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return interpolated;
  }

  /**
   * Assembles the main Master Agent system prompt
   */
  async buildMasterSystemPrompt(vars: Record<string, string> = {}): Promise<string> {
    try {
      const parts = [
        await this.loadTemplate('system_prompts/core', 'identity.tmpl', vars),
        await this.loadTemplate('system_prompts/core', 'identity_agent.tmpl', vars),
        await this.loadTemplate('system_prompts/core', 'guidelines.tmpl', vars),
        await this.loadTemplate('system_prompts/core', 'planning_mode.tmpl', vars)
      ];

      return parts.join('\n\n---\n\n');
    } catch (error) {
      console.error("Failed to compile Master System Prompt. Ensure the curated/ directory is populated.", error);
      throw error;
    }
  }

  /**
   * Lists all available templates in the curated registry with metadata.
   */
  async listAllTemplates(): Promise<TemplateMetadata[]> {
    const results: TemplateMetadata[] = [];
    if (typeof window !== 'undefined' || typeof process === 'undefined' || !process?.versions?.node) return results;

    try {
      const fs = await import('fs/promises');
      const { existsSync } = await import('fs');
      const path = await import('path');

      if (!existsSync(this.baseDir)) return results;

      const scanDir = async (currentDir: string, categoryPrefix: string) => {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            const nextPrefix = categoryPrefix ? `${categoryPrefix}/${entry.name}` : entry.name;
            await scanDir(fullPath, nextPrefix);
          } else if (entry.isFile() && (entry.name.endsWith('.tmpl') || entry.name.endsWith('.md'))) {
            const content = await fs.readFile(fullPath, 'utf-8');
            const stat = await fs.stat(fullPath);
            const varMatches = content.match(/\{\{([A-Z0-9_]+)\}\}/g) || [];
            const variables = Array.from(new Set(varMatches.map(m => m.replace(/[{}]/g, ''))));

            results.push({
              category: categoryPrefix,
              filename: entry.name,
              fullPath,
              sizeBytes: stat.size,
              variables
            });
          }
        }
      };

      await scanDir(this.baseDir, '');
    } catch {
      // Fallback
    }

    return results;
  }

  /**
   * Validates the integrity of the template registry.
   */
  async validateRegistry(): Promise<RegistryValidationResult> {
    const templates = await this.listAllTemplates();
    const errors: string[] = [];

    const requiredCore = [
      'system_prompts/core/identity.tmpl',
      'system_prompts/core/identity_agent.tmpl',
      'system_prompts/core/guidelines.tmpl',
      'system_prompts/core/planning_mode.tmpl'
    ];

    for (const req of requiredCore) {
      const exists = templates.some(t => `${t.category}/${t.filename}` === req);
      if (!exists) {
        errors.push(`Missing required core template: ${req}`);
      }
    }

    return {
      valid: errors.length === 0,
      totalTemplates: templates.length,
      errors,
      templates
    };
  }
}


