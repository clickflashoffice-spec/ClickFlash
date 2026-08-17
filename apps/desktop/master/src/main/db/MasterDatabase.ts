import Database from 'better-sqlite3';
import path from 'path';
import { env } from 'process';
import { logger } from '@/utils/logger';

/**
 * ClickFlash Master Database (Pillar 2)
 * 
 * This SQLite database handles core local state for the Master Node,
 * including logging all autonomous agent actions, queueing offline payments,
 * and maintaining kiosk health statuses.
 */
export class MasterDatabase {
  private db: Database.Database | null = null;
  private isInitialized = false;

  constructor() {}

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const dbPath = env.NODE_ENV === 'production'
        ? path.join((process as any).resourcesPath, 'db', 'master.sqlite')
        : path.join(__dirname, '../../../../pb_data', 'master.sqlite');

      logger.info(`[MasterDatabase] Connecting to primary local store at ${dbPath}`);
      this.db = new Database(dbPath);
      
      // Enforce foreign keys and WAL mode for performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('busy_timeout = 5000');
      this.db.pragma('temp_store = MEMORY');
      this.db.pragma('mmap_size = 268435456');

      // Create core schema
      this.db.exec(`
        -- Tracks actions taken by the Autonomous Agent Swarm (Pillar 2)
        CREATE TABLE IF NOT EXISTS agent_action_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agent_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          action_payload TEXT NOT NULL, -- JSON string of the decision
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Offline Payment Queue (Pillar 2 - Resilient Transactions)
        CREATE TABLE IF NOT EXISTS offline_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guest_id TEXT NOT NULL,
          amount_cents INTEGER NOT NULL,
          currency TEXT DEFAULT 'USD',
          stripe_intent_id TEXT,
          status TEXT CHECK( status IN ('queued', 'synced', 'failed') ) DEFAULT 'queued',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Kiosk Health Tracking for Maintenance Agent
        CREATE TABLE IF NOT EXISTS kiosk_health (
          kiosk_id TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          paper_level_percent INTEGER,
          cpu_temp_celsius INTEGER,
          last_ping DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      this.isInitialized = true;
      logger.info(`[MasterDatabase] Core schema initialized.`);
    } catch (error) {
      logger.error(`[MasterDatabase] Failed to initialize schema:`, error);
      throw error;
    }
  }

  /**
   * Logs a decision made by an autonomous agent.
   */
  public logAgentAction(agentId: string, actionType: string, payload: object) {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT INTO agent_action_logs (agent_id, action_type, action_payload)
      VALUES (?, ?, ?)
    `);
    stmt.run(agentId, actionType, JSON.stringify(payload));
  }

  /**
   * Retrieves all logged agent actions.
   */
  public getAgentLogs(): Array<{ id: number; agent_id: string; action_type: string; action_payload: string; created_at: string }> {
    if (!this.db) return [];
    return this.db.prepare('SELECT * FROM agent_action_logs ORDER BY created_at DESC').all() as any;
  }

  /**
   * Updates or inserts local kiosk telemetry status.
   */
  public updateKioskHealth(kioskId: string, status: string, paperLevel: number, cpuTemp: number) {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT INTO kiosk_health (kiosk_id, status, paper_level_percent, cpu_temp_celsius, last_ping)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(kiosk_id) DO UPDATE SET
        status = excluded.status,
        paper_level_percent = excluded.paper_level_percent,
        cpu_temp_celsius = excluded.cpu_temp_celsius,
        last_ping = CURRENT_TIMESTAMP
    `);
    stmt.run(kioskId, status, paperLevel, cpuTemp);
  }

  /**
   * Retrieves status for all kiosks.
   */
  public getAllKioskHealth(): Array<{ kiosk_id: string; status: string; paper_level_percent: number; cpu_temp_celsius: number; last_ping: string }> {
    if (!this.db) return [];
    return this.db.prepare('SELECT * FROM kiosk_health ORDER BY kiosk_id ASC').all() as any;
  }
}

export const masterDb = new MasterDatabase();
