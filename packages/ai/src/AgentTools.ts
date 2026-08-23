/**
 * ClickFlash Agent Tools
 * Exposes safe, strict MCP-style tools to the LLM with browser & Vite compatibility.
 */
export const AgentTools = {
  /**
   * Executes shell commands. Monorepo boundary tests (typecheck:all) must be run through this.
   */
  executeCommand: async (command: string, cwd?: string) => {
    if (typeof window !== 'undefined' || typeof process === 'undefined' || !process?.versions?.node) {
      return `[BROWSER MODE] Command execution simulated: ${command}`;
    }
    try {
      const childProcess = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(childProcess.exec);
      const { stdout, stderr } = await execAsync(command, { cwd: cwd || process.cwd() });
      return "STDOUT:\n" + stdout + "\nSTDERR:\n" + stderr;
    } catch (error: any) {
      return "ERROR:\n" + error.message + "\nSTDOUT:\n" + error.stdout + "\nSTDERR:\n" + error.stderr;
    }
  },

  /**
   * Reads files within the Turborepo securely.
   */
  readTurborepoFile: async (filePath: string) => {
    if (typeof window !== 'undefined' || typeof process === 'undefined' || !process?.versions?.node) {
      return `[BROWSER MODE] File read simulated: ${filePath}`;
    }
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      return await fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8');
    } catch (e: any) {
      return "Error reading file: " + e.message;
    }
  },

  /**
   * Locates the active SQLite database for Master OS or Touch Kiosk.
   */
  resolveDatabasePath: async (dbName?: string): Promise<string | null> => {
    if (typeof window !== 'undefined' || typeof process === 'undefined' || !process?.versions?.node) {
      return null;
    }
    try {
      const { existsSync } = await import('fs');
      const path = await import('path');
      const candidates = [
        path.resolve(process.cwd(), 'apps/desktop/master/star_master.db'),
        path.resolve(process.cwd(), 'apps/desktop/master/database.sqlite'),
        path.resolve(process.cwd(), 'apps/desktop/touch/pb_data/touch.db'),
        path.resolve(process.cwd(), 'star_master.db'),
        path.resolve(process.cwd(), 'database.sqlite'),
      ];
      if (dbName) {
        candidates.unshift(path.resolve(process.cwd(), dbName));
      }
      return candidates.find((p: string) => existsSync(p)) || null;
    } catch {
      return null;
    }
  },

  /**
   * Queries the local Edge SQLite Queue (DbWriteQueue.ts backend) in safe read-only mode.
   */
  querySQLiteQueue: async (query: string, dbPathOverride?: string) => {
    try {
      const sanitized = (query || '').trim();
      const upper = sanitized.toUpperCase();

      // Guard: strictly enforce read-only execution before any I/O
      if (!upper.startsWith('SELECT') && !upper.startsWith('PRAGMA') && !upper.startsWith('EXPLAIN')) {
        return "ERROR: Only read-only queries (SELECT, PRAGMA, EXPLAIN) are permitted through AgentTools.";
      }

      if (typeof window !== 'undefined' || typeof process === 'undefined' || !process?.versions?.node) {
        return JSON.stringify({
          status: "BROWSER_SIMULATION",
          message: "SQLite queries are simulated in browser client environment.",
          query: sanitized
        }, null, 2);
      }

      const dbPath = await AgentTools.resolveDatabasePath(dbPathOverride);
      if (!dbPath) {
        return JSON.stringify({
          status: "NOT_FOUND",
          message: "No SQLite database file found in standard locations (e.g. apps/desktop/master/star_master.db).",
          candidatesChecked: [
            "apps/desktop/master/star_master.db",
            "apps/desktop/master/database.sqlite"
          ]
        }, null, 2);
      }

      const dbModule = await import('better-sqlite3');
      const DatabaseConstructor: any = (dbModule as any).default || dbModule;
      const db = new (DatabaseConstructor as any)(dbPath, { readonly: true });
      const rows = db.prepare(sanitized).all();
      db.close();

      return JSON.stringify({
        dbPath,
        rowCount: rows.length,
        data: rows
      }, null, 2);
    } catch (error: any) {
      return "SQLite Query Error: " + error.message;
    }
  },

  /**
   * Inspects the health of the persistent DbWriteQueue (pending_writes table)
   */
  getQueueHealth: async () => {
    return await AgentTools.querySQLiteQueue(`
      SELECT 
        status, 
        priority, 
        COUNT(*) as count, 
        AVG(retry_count) as avg_retries,
        MIN(created_at) as oldest_pending
      FROM pending_writes 
      GROUP BY status, priority
    `);
  }
};
