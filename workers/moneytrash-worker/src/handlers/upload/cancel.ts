/**
 * Cancel upload and clean up resources
 * POST /api/upload/chunk/cancel
 */

import { Env } from '../../index';
import { UploadSession } from './init';
import { logger } from "@clickflash/logger";

export async function handleUploadCancel(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const { sessionId } = body;
    
    if (!sessionId) {
      return Response.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }
    
    // Retrieve session
    const sessionData = await env.UPLOAD_SESSIONS.get(`session:${sessionId}`);
    if (!sessionData) {
      return Response.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    const session: UploadSession = JSON.parse(sessionData);
    
    // Clean up uploaded chunks
    await cleanupChunks(env, session);
    
    // Delete session from KV
    await env.UPLOAD_SESSIONS.delete(`session:${sessionId}`);
    
    // Log cancellation
    await logCancellation(env.DB, session);
    
    return Response.json({
      success: true,
      message: 'Upload cancelled and resources cleaned up',
    });
    
  } catch (error) {
    logger.error('Cancel upload error:', { args: [error] });
    return Response.json(
      { error: 'Failed to cancel upload' },
      { status: 500 }
    );
  }
}

async function cleanupChunks(env: Env, session: UploadSession): Promise<void> {
  const deletePromises = session.uploadedChunks.map(async (chunkIndex) => {
    const chunkKey = `${session.r2Key}.part${chunkIndex}`;
    try {
      await env.UPLOADS_BUCKET.delete(chunkKey);
    } catch (e) {
      logger.error(String(`Failed to delete chunk ${chunkIndex}:`) + ' ' + String(e));
    }
  });
  
  await Promise.all(deletePromises);
}

async function logCancellation(
  db: D1Database,
  session: UploadSession
): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO upload_logs (type, session_id, office_id, desk_id, file_name, file_size, mode, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      'upload_cancel',
      session.id,
      session.officeId,
      session.deskId,
      session.fileName,
      session.fileSize,
      session.metadata.mode
    ).run();
  } catch (e) {
    logger.error('Failed to log cancellation:', { args: [e] });
  }
}
