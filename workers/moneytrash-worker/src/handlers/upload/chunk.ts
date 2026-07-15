/**
 * Upload chunk handler
 * PUT /api/upload/chunk
 */

import { Env } from '../../index';
import { UploadSession } from './init';
import { logger } from "@clickflash/logger";

export async function handleUploadChunk(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData();
    
    const sessionId = formData.get('sessionId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const chunk = formData.get('chunk') as File;
    
    if (!sessionId || isNaN(chunkIndex) || !chunk) {
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
    
    // Validate chunk index
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      return Response.json(
        { error: 'Invalid chunk index' },
        { status: 400 }
      );
    }
    
    // Check if chunk already uploaded
    if (session.uploadedChunks.includes(chunkIndex)) {
      return Response.json({ received: true, alreadyUploaded: true });
    }
    
    // Upload chunk to R2
    const chunkKey = `${session.r2Key}.part${chunkIndex}`;
    const chunkBuffer = await chunk.arrayBuffer();
    
    await env.UPLOADS_BUCKET.put(chunkKey, chunkBuffer, {
      httpMetadata: {
        contentType: 'application/octet-stream',
      },
      customMetadata: {
        sessionId,
        chunkIndex: chunkIndex.toString(),
        originalFileName: session.fileName,
      },
    });
    
    // Update session
    session.uploadedChunks.push(chunkIndex);
    session.status = 'uploading';
    
    await env.UPLOAD_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify(session),
      { expirationTtl: 86400 }
    );
    
    return Response.json({
      received: true,
      chunkIndex,
      uploadedChunks: session.uploadedChunks.length,
      totalChunks: session.totalChunks,
      progress: Math.round((session.uploadedChunks.length / session.totalChunks) * 100),
    });
    
  } catch (error) {
    logger.error('Chunk upload error:', { args: [error] });
    return Response.json(
      { error: 'Failed to upload chunk' },
      { status: 500 }
    );
  }
}
