/**
 * Upload chunk handler
 * PUT /api/upload/chunk
 */

import { Env } from '../../index';
import { UploadSession } from './init';
import { logger } from "@clickflash/logger";
import { getExpectedChunkSize } from "./validation";

export async function handleUploadChunk(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData();
    
    const sessionId = formData.get('sessionId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const chunk = formData.get('chunk');
    
    if (!sessionId || isNaN(chunkIndex) || !(chunk instanceof File)) {
      return Response.json(
        { error: 'Missing required fields: sessionId, chunkIndex, chunk' },
        { status: 400 }
      );
    }
    
    // Retrieve session
    const sessionData = await env.UPLOAD_SESSIONS.get(`session:${sessionId}`);
    if (!sessionData) {
      return Response.json(
        { error: 'Session not found or expired' },
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

    if (session.status === 'completed' || session.status === 'assembled') {
      return Response.json(
        { error: 'Upload session is already finalized' },
        { status: 409 }
      );
    }
    
    // Validate chunk index
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      return Response.json(
        { error: 'Invalid chunk index' },
        { status: 400 }
      );
    }
    
    const expectedSize = getExpectedChunkSize(
      session.fileSize,
      session.chunkSize,
      chunkIndex,
    );
    if (chunk.size !== expectedSize) {
      return Response.json(
        { error: `Chunk ${chunkIndex} must be exactly ${expectedSize} bytes` },
        { status: 400 },
      );
    }

    const existingPart = await env.DB.prepare(
      `SELECT part_number, etag, size
       FROM upload_parts
       WHERE session_id = ? AND chunk_index = ? AND office_id = ?`,
    ).bind(sessionId, chunkIndex, officeId).first<{
      part_number: number;
      etag: string;
      size: number;
    }>();
    if (existingPart && existingPart.size === chunk.size) {
      const count = await getUploadedPartCount(env.DB, sessionId);
      return Response.json({
        received: true,
        alreadyUploaded: true,
        chunkIndex,
        uploadedChunks: count,
        totalChunks: session.totalChunks,
        progress: Math.round((count / session.totalChunks) * 100),
      });
    }

    const upload = env.UPLOADS_BUCKET.resumeMultipartUpload(
      session.r2Key,
      session.r2UploadId,
    );
    const uploadedPart = await upload.uploadPart(
      chunkIndex + 1,
      await chunk.arrayBuffer(),
    );

    await env.DB.prepare(
      `INSERT INTO upload_parts (
        session_id, chunk_index, part_number, etag, size, office_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(session_id, chunk_index) DO UPDATE SET
        part_number = excluded.part_number,
        etag = excluded.etag,
        size = excluded.size,
        office_id = excluded.office_id,
        created_at = excluded.created_at`,
    ).bind(
      sessionId,
      chunkIndex,
      uploadedPart.partNumber,
      uploadedPart.etag,
      chunk.size,
      officeId,
    ).run();

    session.status = 'uploading';
    
    await env.UPLOAD_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify(session),
      { expirationTtl: 86400 }
    );
    
    const uploadedChunks = await getUploadedPartCount(env.DB, sessionId);
    return Response.json({
      received: true,
      chunkIndex,
      uploadedChunks,
      totalChunks: session.totalChunks,
      progress: Math.round((uploadedChunks / session.totalChunks) * 100),
    });
    
  } catch (error) {
    logger.error('Chunk upload error:', { args: [error] });
    return Response.json(
      { error: 'Failed to upload chunk' },
      { status: 500 }
    );
  }
}

async function getUploadedPartCount(db: D1Database, sessionId: string): Promise<number> {
  const row = await db.prepare(
    'SELECT COUNT(*) AS count FROM upload_parts WHERE session_id = ?',
  ).bind(sessionId).first<{ count: number }>();
  return Number(row?.count || 0);
}
