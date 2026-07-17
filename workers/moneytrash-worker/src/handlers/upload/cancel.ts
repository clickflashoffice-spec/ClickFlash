/**
 * Cancel upload and clean up resources
 * POST /api/upload/chunk/cancel
 */

import { Env } from '../../index';
import { UploadSession } from './init';
import { logger } from "@clickflash/logger";

export async function handleUploadCancel(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { sessionId?: unknown };
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    
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

    const officeId = request.headers.get('X-Office-Id');
    if (!officeId || officeId !== session.officeId) {
      return Response.json(
        { error: 'Upload session does not belong to this office' },
        { status: 403 }
      );
    }
    
    if (session.status !== 'completed') {
      const upload = env.UPLOADS_BUCKET.resumeMultipartUpload(
        session.r2Key,
        session.r2UploadId,
      );
      await upload.abort().catch((error) => {
        logger.warn('Multipart upload was already unavailable during cancel', {
          args: [error],
        });
      });
    }

    await env.DB.prepare(
      'DELETE FROM upload_parts WHERE session_id = ? AND office_id = ?',
    ).bind(session.id, officeId).run();
    
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
