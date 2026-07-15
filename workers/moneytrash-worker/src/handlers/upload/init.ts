/**
 * Initialize chunked upload session
 * POST /api/upload/chunk/init
 */

import { Env } from '../../index';
import { logger } from "@clickflash/logger";

export interface UploadInitRequest {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  metadata: {
    event_name: string;
    access_code: string;
    mode: 'moneytrash' | 'sold';
    mime_type: string;
    customer_email?: string;
    single_photo_price?: string;
    full_gallery_price?: string;
  };
}

export interface UploadSession {
  id: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  metadata: UploadInitRequest['metadata'];
  officeId: string;
  deskId: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  createdAt: string;
  expiresAt: string;
  r2Key?: string;
}

export async function handleUploadInit(request: Request, env: Env): Promise<Response> {
  try {
    const body: UploadInitRequest = await request.json();
    
    // Validate request
    const maxSize = parseInt(env.MAX_UPLOAD_SIZE);
    if (body.fileSize > maxSize) {
      return Response.json(
        { error: 'File too large', maxSize },
        { status: 413 }
      );
    }
    
    // Get office info from request context (set by auth middleware)
    const officeId = request.headers.get('X-Office-Id');
    const deskId = request.headers.get('X-Desk-Id') || 'unknown';
    
    if (!officeId) {
      return Response.json(
        { error: 'Office not authenticated' },
        { status: 401 }
      );
    }
    
    // Generate session ID
    const sessionId = crypto.randomUUID();
    
    // Create R2 key for this upload
    const timestamp = Date.now();
    const sanitizedFileName = body.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const r2Key = `uploads/${officeId}/${body.metadata.mode}/${timestamp}-${sanitizedFileName}`;
    
    // Create upload session
    const session: UploadSession = {
      id: sessionId,
      fileName: body.fileName,
      fileSize: body.fileSize,
      totalChunks: body.totalChunks,
      uploadedChunks: [],
      metadata: body.metadata,
      officeId,
      deskId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      r2Key,
    };
    
    // Store session in KV with expiration
    await env.UPLOAD_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify(session),
      { expirationTtl: 86400 } // 24 hours
    );
    
    // Log upload initiation
    await logUploadEvent(env.DB, {
      type: 'upload_init',
      sessionId,
      officeId,
      deskId,
      fileName: body.fileName,
      fileSize: body.fileSize,
      mode: body.metadata.mode,
    });
    
    return Response.json({
      sessionId,
      expiresAt: session.expiresAt,
      chunkSize: parseInt(env.CHUNK_SIZE),
    });
    
  } catch (error) {
    logger.error('Upload init error:', { args: [error] });
    return Response.json(
      { error: 'Failed to initialize upload' },
      { status: 500 }
    );
  }
}

async function logUploadEvent(
  db: D1Database,
  event: {
    type: string;
    sessionId: string;
    officeId: string;
    deskId: string;
    fileName: string;
    fileSize: number;
    mode: string;
  }
): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO upload_logs (type, session_id, office_id, desk_id, file_name, file_size, mode, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      event.type,
      event.sessionId,
      event.officeId,
      event.deskId,
      event.fileName,
      event.fileSize,
      event.mode
    ).run();
  } catch (e) {
    logger.error('Failed to log upload event:', { args: [e] });
  }
}
