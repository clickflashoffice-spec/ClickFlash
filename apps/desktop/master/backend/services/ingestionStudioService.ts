import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { WasmSharpnessService } from './wasmSharpnessService';

export interface SessionMetadata {
  eventName: string;
  accessCode: string;
}

export interface IngestionSession {
  id: string;
  sourcePath: string;
  eventName: string;
  accessCode: string;
  totalFiles: number;
  gradedFiles: number;
  keeperCount: number;
  rejectCount: number;
  status: 'created' | 'grading' | 'graded' | 'uploading' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface GradeResult {
  filePath: string;
  fileName: string;
  sharpnessScore: number;
  isKeeper: boolean;
  fileSize: number;
  dimensions?: { width: number; height: number };
  exif?: Record<string, unknown>;
}

export interface IngestionAnalytics {
  totalSessions: number;
  totalPhotosProcessed: number;
  averageKeeperRate: number;
  recentSessions: IngestionSession[];
}

export interface UploadConfig {
  cloudUrl: string;
  token: string;
}

export class IngestionStudioService extends EventEmitter {
  private dbManager: any;
  private sharpnessService: WasmSharpnessService;
  private poolSize: number;

  constructor(dbManager: any, poolSize: number = 4) {
    super();
    this.dbManager = dbManager;
    this.poolSize = poolSize;
    this.sharpnessService = new WasmSharpnessService();
    this.initDb();
  }

  private initDb() {
    this.dbManager.run(`
      CREATE TABLE IF NOT EXISTS ingestion_sessions (
        id TEXT PRIMARY KEY,
        source_path TEXT NOT NULL,
        event_name TEXT NOT NULL,
        access_code TEXT NOT NULL,
        total_files INTEGER DEFAULT 0,
        graded_files INTEGER DEFAULT 0,
        keeper_count INTEGER DEFAULT 0,
        reject_count INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        completed_at TEXT
      )
    `);

    this.dbManager.run(`
      CREATE TABLE IF NOT EXISTS ingestion_files (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        sharpness_score INTEGER,
        is_keeper INTEGER,
        dimensions TEXT,
        exif TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (session_id) REFERENCES ingestion_sessions(id) ON DELETE CASCADE
      )
    `);
  }

  public createSession(sourcePath: string, metadata: SessionMetadata): IngestionSession {
    const session: IngestionSession = {
      id: randomUUID(),
      sourcePath,
      eventName: metadata.eventName,
      accessCode: metadata.accessCode,
      totalFiles: 0,
      gradedFiles: 0,
      keeperCount: 0,
      rejectCount: 0,
      status: 'created',
      createdAt: new Date().toISOString()
    };

    this.dbManager.run(
      `INSERT INTO ingestion_sessions (id, source_path, event_name, access_code, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session.id, session.sourcePath, session.eventName, session.accessCode, session.status, session.createdAt]
    );

    logger.info(`[IngestionStudio] Created session ${session.id} for event ${session.eventName}`);
    this.emit('sessionCreated', session);
    return session;
  }

  public addFilesToSession(sessionId: string, filePaths: string[]): void {
    const stmt = this.dbManager.prepare(
      `INSERT INTO ingestion_files (id, session_id, file_path, file_name, file_size) VALUES (?, ?, ?, ?, ?)`
    );

    this.dbManager.transaction(() => {
      for (const filePath of filePaths) {
        let size = 0;
        try {
          size = fs.statSync(filePath).size;
        } catch (e) {
          logger.warn(`[IngestionStudio] Failed to stat file ${filePath}`);
        }
        stmt.run(randomUUID(), sessionId, filePath, path.basename(filePath), size);
      }
      this.dbManager.run(
        `UPDATE ingestion_sessions SET total_files = total_files + ? WHERE id = ?`,
        [filePaths.length, sessionId]
      );
    })();

    logger.info(`[IngestionStudio] Added ${filePaths.length} files to session ${sessionId}`);
  }

  public async gradeSession(sessionId: string): Promise<GradeResult[]> {
    logger.info(`[IngestionStudio] Starting grading for session ${sessionId}`);
    this.dbManager.run(`UPDATE ingestion_sessions SET status = 'grading' WHERE id = ?`, [sessionId]);

    const files = this.dbManager.all(`SELECT * FROM ingestion_files WHERE session_id = ? AND status = 'pending'`, [sessionId]);
    const results: GradeResult[] = [];

    // Worker pool concurrency limit
    const queue = [...files];
    const workers = Array(this.poolSize).fill(null).map(async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) continue;

        try {
          const buffer = await fs.promises.readFile(file.file_path);
          const sharpness = await this.sharpnessService.evaluateSharpness(buffer, 100);
          
          const isKeeper = sharpness.isKeeper;
          
          const result: GradeResult = {
            filePath: file.file_path,
            fileName: file.file_name,
            sharpnessScore: sharpness.score,
            isKeeper,
            fileSize: file.file_size
          };

          this.dbManager.run(
            `UPDATE ingestion_files SET sharpness_score = ?, is_keeper = ?, status = 'graded' WHERE id = ?`,
            [result.sharpnessScore, result.isKeeper ? 1 : 0, file.id]
          );

          this.dbManager.run(
            `UPDATE ingestion_sessions SET 
              graded_files = graded_files + 1,
              keeper_count = keeper_count + ?,
              reject_count = reject_count + ?
             WHERE id = ?`,
             [isKeeper ? 1 : 0, isKeeper ? 0 : 1, sessionId]
          );

          results.push(result);
        } catch (err) {
          logger.error(`[IngestionStudio] Error grading file ${file.file_path}`, err);
          this.dbManager.run(`UPDATE ingestion_files SET status = 'failed' WHERE id = ?`, [file.id]);
        }
      }
    });

    await Promise.all(workers);

    this.dbManager.run(`UPDATE ingestion_sessions SET status = 'graded' WHERE id = ?`, [sessionId]);
    this.emit('sessionGraded', sessionId);
    
    return results;
  }

  public getSessionProgress(sessionId: string): IngestionSession | null {
    const session = this.dbManager.get(`SELECT * FROM ingestion_sessions WHERE id = ?`, [sessionId]);
    if (!session) return null;
    
    return {
      id: session.id,
      sourcePath: session.source_path,
      eventName: session.event_name,
      accessCode: session.access_code,
      totalFiles: session.total_files,
      gradedFiles: session.graded_files,
      keeperCount: session.keeper_count,
      rejectCount: session.reject_count,
      status: session.status,
      createdAt: session.created_at,
      completedAt: session.completed_at
    };
  }
  
  public getSessions(): IngestionSession[] {
    return this.dbManager.all(`SELECT * FROM ingestion_sessions ORDER BY created_at DESC LIMIT 50`).map((s: any) => ({
      id: s.id,
      sourcePath: s.source_path,
      eventName: s.event_name,
      accessCode: s.access_code,
      totalFiles: s.total_files,
      gradedFiles: s.graded_files,
      keeperCount: s.keeper_count,
      rejectCount: s.reject_count,
      status: s.status,
      createdAt: s.created_at,
      completedAt: s.completed_at
    }));
  }

  public async startUpload(sessionId: string, uploadConfig: UploadConfig): Promise<void> {
    logger.info(`[IngestionStudio] Starting upload for session ${sessionId} to ${uploadConfig.cloudUrl}`);
    this.dbManager.run(`UPDATE ingestion_sessions SET status = 'uploading' WHERE id = ?`, [sessionId]);
    
    // In a real implementation this would stream files to the cloud.
    // For now we simulate an async upload process.
    setTimeout(() => {
      this.dbManager.run(`UPDATE ingestion_sessions SET status = 'completed', completed_at = ? WHERE id = ?`, [new Date().toISOString(), sessionId]);
      this.emit('sessionCompleted', sessionId);
      logger.info(`[IngestionStudio] Upload completed for session ${sessionId}`);
    }, 2000);
  }

  public getAnalytics(): IngestionAnalytics {
    const row = this.dbManager.get(`
      SELECT 
        COUNT(id) as totalSessions,
        SUM(total_files) as totalPhotosProcessed,
        SUM(keeper_count) as totalKeepers
      FROM ingestion_sessions
    `);
    
    let averageKeeperRate = 0;
    if (row && row.totalPhotosProcessed > 0) {
      averageKeeperRate = (row.totalKeepers / row.totalPhotosProcessed) * 100;
    }

    const recentSessions = this.getSessions().slice(0, 5);

    return {
      totalSessions: row?.totalSessions || 0,
      totalPhotosProcessed: row?.totalPhotosProcessed || 0,
      averageKeeperRate,
      recentSessions
    };
  }

  public async deleteSession(sessionId: string): Promise<void> {
    this.dbManager.run(`DELETE FROM ingestion_sessions WHERE id = ?`, [sessionId]);
  }
}
