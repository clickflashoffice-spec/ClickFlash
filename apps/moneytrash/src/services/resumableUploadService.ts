import { logger } from '@clickflash/logger';
/**
 * Resumable Upload Service with Chunked Uploads and Resume Support
 * Handles network interruptions and app crashes gracefully
 */

import { invoke } from '@tauri-apps/api/core';
import { env } from '@/utils/env';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for high-volume uploads
const STORAGE_KEY = 'moneytrash_upload_sessions';

interface UploadSession {
  id: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  uploadedChunks: number[];
  totalChunks: number;
  metadata: {
    eventName: string;
    accessCode: string;
    mode: 'moneytrash' | 'sold';
    mimeType: string;
  };
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
  serverSessionId?: string;
}

interface UploadProgress {
  sessionId: string;
  fileName: string;
  progress: number; // 0-100
  uploadedBytes: number;
  totalBytes: number;
  status: UploadSession['status'];
  speed?: number; // bytes per second
  eta?: number; // seconds remaining
}

class ResumableUploadService {
  private sessions: Map<string, UploadSession> = new Map();
  private activeUploads: Map<string, AbortController> = new Map();
  private subscribers: Array<(progress: UploadProgress) => void> = [];
  private maxConcurrentUploads: number = 3;

  constructor() {
    this.loadSessions();
    this.recoverInterruptedUploads();
  }

  /**
   * Load saved sessions from localStorage
   */
  private loadSessions(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const sessions: UploadSession[] = JSON.parse(saved);
        sessions.forEach(session => {
          if (session.status !== 'completed') {
            this.sessions.set(session.id, session);
          }
        });
      }
    } catch (error) {
      logger.error('Failed to load upload sessions:', error);
    }
  }

  /**
   * Save sessions to localStorage
   */
  private saveSessions(): void {
    try {
      const sessions = Array.from(this.sessions.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      logger.error('Failed to save upload sessions:', error);
    }
  }

  /**
   * Recover interrupted uploads after app restart
   */
  private async recoverInterruptedUploads(): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.status === 'uploading') {
        // Mark as paused - user can manually resume
        session.status = 'paused';
        session.error = 'Upload interrupted';
        session.updatedAt = Date.now();
        this.saveSessions();
        logger.info(`Recovered interrupted upload: ${session.fileName}`);
      }
    }
  }

  /**
   * Create a new upload session
   */
  async createSession(
    filePath: string,
    fileName: string,
    fileSize: number,
    metadata: UploadSession['metadata']
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    const session: UploadSession = {
      id: sessionId,
      fileName,
      fileSize,
      filePath,
      uploadedChunks: [],
      totalChunks,
      metadata,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.sessions.set(sessionId, session);
    this.saveSessions();

    return sessionId;
  }

  /**
   * Start or resume an upload
   */
  async startUpload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    if (session.status === 'uploading' || session.status === 'completed') {
      return;
    }

    // Check if we have too many concurrent uploads
    if (this.activeUploads.size >= this.maxConcurrentUploads) {
      session.status = 'paused';
      this.saveSessions();
      throw new Error('Maximum concurrent uploads reached');
    }

    const abortController = new AbortController();
    this.activeUploads.set(sessionId, abortController);

    session.status = 'uploading';
    session.error = undefined;
    session.updatedAt = Date.now();
    this.saveSessions();

    try {
      // Initialize server session if needed
      if (!session.serverSessionId) {
        session.serverSessionId = await this.initializeServerSession(session);
      }

      // Upload missing chunks
      const missingChunks = this.getMissingChunks(session);
      const startTime = Date.now();
      let uploadedBytes = session.uploadedChunks.length * CHUNK_SIZE;

      for (const chunkIndex of missingChunks) {
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const chunkStart = chunkIndex * CHUNK_SIZE;
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, session.fileSize);
        const chunkSize = chunkEnd - chunkStart;

        // Read chunk from file
        const chunkData = await invoke<number[]>('read_file_chunk', {
          path: session.filePath,
          offset: chunkStart,
          length: chunkSize
        });

        // Upload chunk with retry logic
        await this.uploadChunkWithRetry(
          session.serverSessionId,
          chunkIndex,
          session.totalChunks,
          chunkData,
          abortController.signal
        );

        // Mark chunk as uploaded
        session.uploadedChunks.push(chunkIndex);
        uploadedBytes += chunkSize;
        session.progress = Math.round((session.uploadedChunks.length / session.totalChunks) * 100);
        session.updatedAt = Date.now();
        this.saveSessions();

        // Calculate speed and ETA
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = uploadedBytes / elapsed;
        const remainingBytes = session.fileSize - uploadedBytes;
        const eta = speed > 0 ? remainingBytes / speed : undefined;

        this.notifySubscribers({
          sessionId,
          fileName: session.fileName,
          progress: session.progress,
          uploadedBytes,
          totalBytes: session.fileSize,
          status: session.status,
          speed,
          eta
        });
      }

      // Finalize upload
      await this.finalizeUpload(session);

      session.status = 'completed';
      session.progress = 100;
      session.updatedAt = Date.now();
      this.saveSessions();

      this.notifySubscribers({
        sessionId,
        fileName: session.fileName,
        progress: 100,
        uploadedBytes: session.fileSize,
        totalBytes: session.fileSize,
        status: 'completed'
      });

    } catch (error) {
      session.status = 'failed';
      session.error = error instanceof Error ? error.message : 'Upload failed';
      session.updatedAt = Date.now();
      this.saveSessions();

      this.notifySubscribers({
        sessionId,
        fileName: session.fileName,
        progress: session.progress,
        uploadedBytes: session.uploadedChunks.length * CHUNK_SIZE,
        totalBytes: session.fileSize,
        status: 'failed'
      });

      throw error;
    } finally {
      this.activeUploads.delete(sessionId);
    }
  }

  /**
   * Initialize server session
   */
  private async initializeServerSession(session: UploadSession): Promise<string> {
    // Call backend to initialize chunked upload
    const response = await fetch(`${env.API_BASE_URL}/api/upload/chunk/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: session.fileName,
        fileSize: session.fileSize,
        totalChunks: session.totalChunks,
        metadata: {
          event_name: session.metadata.eventName,
          access_code: session.metadata.accessCode,
          mode: session.metadata.mode,
          mime_type: session.metadata.mimeType
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize upload: ${response.statusText}`);
    }

    const data = await response.json();
    return data.sessionId;
  }

  /**
   * Upload a single chunk with retry logic
   */
  private async uploadChunkWithRetry(
    serverSessionId: string,
    chunkIndex: number,
    totalChunks: number,
    chunkData: number[],
    signal: AbortSignal,
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }

      try {
        await invoke('upload_file_chunk', {
          sessionId: serverSessionId,
          chunkIndex,
          totalChunks,
          chunkData,
          attempt
        });
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Chunk upload failed');
        
        if (attempt < maxRetries - 1) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Chunk upload failed after retries');
  }

  /**
   * Finalize the upload
   */
  private async finalizeUpload(session: UploadSession): Promise<void> {
    const response = await fetch(`${env.API_BASE_URL}/api/upload/chunk/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.serverSessionId,
        metadata: {
          event_name: session.metadata.eventName,
          access_code: session.metadata.accessCode,
          mode: session.metadata.mode
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to finalize upload: ${response.statusText}`);
    }
  }

  /**
   * Get missing chunk indices
   */
  private getMissingChunks(session: UploadSession): number[] {
    const missing: number[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      if (!session.uploadedChunks.includes(i)) {
        missing.push(i);
      }
    }
    return missing;
  }

  /**
   * Pause an upload
   */
  pauseUpload(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'uploading') {
      return false;
    }

    // Abort the active upload
    const controller = this.activeUploads.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(sessionId);
    }

    session.status = 'paused';
    session.updatedAt = Date.now();
    this.saveSessions();

    this.notifySubscribers({
      sessionId,
      fileName: session.fileName,
      progress: session.progress,
      uploadedBytes: session.uploadedChunks.length * CHUNK_SIZE,
      totalBytes: session.fileSize,
      status: 'paused'
    });

    return true;
  }

  /**
   * Resume a paused or failed upload
   */
  async resumeUpload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    if (session.status === 'completed') {
      return;
    }

    // Reset error state
    session.error = undefined;
    await this.startUpload(sessionId);
  }

  /**
   * Cancel and remove an upload
   */
  cancelUpload(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Abort if active
    const controller = this.activeUploads.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(sessionId);
    }

    // Delete server session if exists
    if (session.serverSessionId) {
      fetch(`${env.API_BASE_URL}/api/upload/chunk/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.serverSessionId })
      }).catch(console.error);
    }

    this.sessions.delete(sessionId);
    this.saveSessions();

    return true;
  }

  /**
   * Get all upload sessions
   */
  getSessions(): UploadSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): UploadSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(callback: (progress: UploadProgress) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(progress: UploadProgress): void {
    this.subscribers.forEach(callback => callback(progress));
  }

  /**
   * Clear completed sessions older than specified days
   */
  clearOldSessions(maxAgeDays: number = 7): number {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let cleared = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.status === 'completed' && session.updatedAt < cutoff) {
        this.sessions.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.saveSessions();
    }

    return cleared;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const resumableUploadService = new ResumableUploadService();
export type { UploadSession, UploadProgress };
