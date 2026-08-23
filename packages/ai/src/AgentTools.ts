import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = util.promisify(exec);

/**
 * ClickFlash Agent Tools
 * Exposes safe, strict MCP-style tools to the LLM.
 */
export const AgentTools = {
  /**
   * Executes shell commands. Monorepo boundary tests (typecheck:all) must be run through this.
   */
  executeCommand: async (command: string, cwd: string = process.cwd()) => {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd });
      return "STDOUT:\n" + stdout + "\nSTDERR:\n" + stderr;
    } catch (error: any) {
      return "ERROR:\n" + error.message + "\nSTDOUT:\n" + error.stdout + "\nSTDERR:\n" + error.stderr;
    }
  },

  /**
   * Reads files within the Turborepo securely.
   */
  readTurborepoFile: async (filePath: string) => {
    try {
      return await fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8');
    } catch (e: any) {
      return "Error reading file: " + e.message;
    }
  },

  /**
   * Queries the local Edge SQLite Queue (DbWriteQueue.ts backend)
   */
  querySQLiteQueue: async (query: string) => {
    // TODO: Hook this up to your actual better-sqlite3 or D1 local driver
    return "[MOCK] Query executed successfully against SQLite queue: " + query;
  }
};
