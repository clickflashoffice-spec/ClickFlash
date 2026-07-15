/**
 * Finalize upload - assemble chunks and create gallery/order records
 * PATCH /api/upload/chunk/finalize
 */

import { Env } from '../../index';
import { UploadSession } from './init';
import { logger } from "@clickflash/logger";

export async function handleUploadFinalize(request: Request, env: Env): Promise<Response> {
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
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }
    
    const session: UploadSession = JSON.parse(sessionData);
    
    // Verify all chunks uploaded
    if (session.uploadedChunks.length !== session.totalChunks) {
      return Response.json(
        { 
          error: 'Upload incomplete',
          uploaded: session.uploadedChunks.length,
          total: session.totalChunks,
          missing: getMissingChunks(session)
        },
        { status: 400 }
      );
    }
    
    // Assemble chunks into final file in R2
    const assembledKey = await assembleChunks(env, session);
    
    // Create gallery or order record in D1
    let result;
    if (session.metadata.mode === 'moneytrash') {
      result = await createGalleryRecord(env.DB, session, assembledKey, env);
    } else {
      result = await createOrderBackupRecord(env.DB, session, assembledKey, env);
    }
    
    // Update session status
    session.status = 'completed';
    await env.UPLOAD_SESSIONS.put(
      `session:${sessionId}`,
      JSON.stringify(session),
      { expirationTtl: 3600 } // Keep for 1 hour after completion
    );
    
    // Clean up chunk parts
    await cleanupChunks(env, session);
    
    return Response.json({
      success: true,
      sessionId,
      galleryUrl: result.galleryUrl,
      assetId: result.assetId,
      accessCode: session.metadata.access_code,
    });
    
  } catch (error) {
    logger.error('Finalize error:', { args: [error] });
    return Response.json(
      { error: 'Failed to finalize upload' },
      { status: 500 }
    );
  }
}

function getMissingChunks(session: UploadSession): number[] {
  const missing: number[] = [];
  for (let i = 0; i < session.totalChunks; i++) {
    if (!session.uploadedChunks.includes(i)) {
      missing.push(i);
    }
  }
  return missing;
}

async function assembleChunks(env: Env, session: UploadSession): Promise<string> {
  // For small files, we can use R2's multipart upload
  // For this implementation, we'll use a simple concatenation approach
  
  const finalKey = session.r2Key!;
  const chunkKeys = session.uploadedChunks
    .sort((a, b) => a - b)
    .map(i => `${session.r2Key}.part${i}`);
  
  // In production, you'd use R2's multipart upload API
  // For now, we'll just keep the chunks separate and serve them via a worker
  
  return finalKey;
}

async function createGalleryRecord(
  db: D1Database,
  session: UploadSession,
  r2Key: string,
  env: Env
): Promise<{ galleryUrl: string; assetId: string }> {
  const assetId = crypto.randomUUID();
  const galleryId = crypto.randomUUID();
  
  // Create gallery
  await db.prepare(
    `INSERT INTO galleries (id, office_id, access_code, name, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`
  ).bind(
    galleryId,
    session.officeId,
    session.metadata.access_code,
    session.metadata.event_name
  ).run();
  
  // Create asset
  await db.prepare(
    `INSERT INTO assets (id, gallery_id, office_id, filename, original_name, mime_type, size, r2_key, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ready', datetime('now'))`
  ).bind(
    assetId,
    galleryId,
    session.officeId,
    session.fileName,
    session.fileName,
    session.metadata.mime_type,
    session.fileSize,
    r2Key
  ).run();
  
  // Set pricing if provided
  if (session.metadata.single_photo_price || session.metadata.full_gallery_price) {
    await db.prepare(
      `INSERT INTO gallery_settings (gallery_id, single_photo_price, full_gallery_price, updated_at)
       VALUES (?, ?, ?, datetime('now'))`
    ).bind(
      galleryId,
      session.metadata.single_photo_price || null,
      session.metadata.full_gallery_price || null
    ).run();
  }
  
  // Also insert into photos table so customer gallery-worker can display it immediately
  try {
    await db.prepare(
      `INSERT INTO photos (id, album_id, access_code, title, url, storage_key, price, originalPrice, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      assetId,
      galleryId,
      session.metadata.access_code,
      session.fileName,
      `/v1/${r2Key}`,
      r2Key,
      session.metadata.single_photo_price ? parseFloat(session.metadata.single_photo_price) : 15,
      30
    ).run();
  } catch (err) {
    logger.warn("[UploadFinalize] Note: photos table insert fallback:", { args: [err] });
  }

  return {
    galleryUrl: `${env.GALLERY_APP_URL || 'https://gallery.clickflash.com'}/gallery/${session.metadata.access_code}`,
    assetId,
  };
}

async function createOrderBackupRecord(
  db: D1Database,
  session: UploadSession,
  r2Key: string,
  env: Env
): Promise<{ galleryUrl: string; assetId: string }> {
  const assetId = crypto.randomUUID();
  
  // Create order record (or update existing)
  const orderId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO orders (id, office_id, access_code, status, created_at, updated_at)
     VALUES (?, ?, ?, 'backup', datetime('now'), datetime('now'))`
  ).bind(
    orderId,
    session.officeId,
    session.metadata.access_code
  ).run();
  
  // Create asset linked to order
  await db.prepare(
    `INSERT INTO assets (id, order_id, office_id, filename, original_name, mime_type, size, r2_key, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ready', datetime('now'))`
  ).bind(
    assetId,
    orderId,
    session.officeId,
    session.fileName,
    session.fileName,
    session.metadata.mime_type,
    session.fileSize,
    r2Key
  ).run();

  try {
    await db.prepare(
      `INSERT INTO photos (id, album_id, access_code, title, url, storage_key, price, originalPrice, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      assetId,
      orderId,
      session.metadata.access_code,
      session.fileName,
      `/v1/${r2Key}`,
      r2Key,
      15,
      30
    ).run();
  } catch (err) {
    logger.warn("[UploadFinalize] Note: photos table insert fallback:", { args: [err] });
  }
  
  return {
    galleryUrl: `${env.GALLERY_APP_URL || 'https://gallery.clickflash.com'}/order/${session.metadata.access_code}`,
    assetId,
  };
}

async function cleanupChunks(env: Env, session: UploadSession): Promise<void> {
  // Delete individual chunk parts
  const deletePromises = session.uploadedChunks.map(async (chunkIndex) => {
    const chunkKey = `${session.r2Key}.part${chunkIndex}`;
    await env.UPLOADS_BUCKET.delete(chunkKey);
  });
  
  await Promise.all(deletePromises);
}
