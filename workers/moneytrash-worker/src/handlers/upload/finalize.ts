/**
 * Finalize an R2 multipart upload and create its gallery/order record.
 * PATCH /api/upload/chunk/finalize
 */

import { logger } from "@clickflash/logger";
import type { Env } from "../../index";
import type { UploadSession } from "./init";
import { getExpectedChunkSize } from "./validation";

interface UploadPartRow {
  chunk_index: number;
  part_number: number;
  etag: string;
  size: number;
}

class FinalizeError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "FinalizeError";
  }
}

export async function handleUploadFinalize(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = (await request.json()) as { sessionId?: unknown };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) {
      return Response.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const sessionData = await env.UPLOAD_SESSIONS.get(`session:${sessionId}`);
    if (!sessionData) {
      return Response.json(
        { error: "Session not found or expired" },
        { status: 404 },
      );
    }

    const session: UploadSession = JSON.parse(sessionData);
    const officeId = request.headers.get("X-Office-Id");
    if (!officeId || officeId !== session.officeId) {
      return Response.json(
        { error: "Upload session does not belong to this office" },
        { status: 403 },
      );
    }

    if (session.status === "completed" && session.galleryUrl) {
      return Response.json({
        success: true,
        sessionId,
        galleryUrl: session.galleryUrl,
        assetId: session.assetId,
        accessCode: session.metadata.access_code,
        alreadyFinalized: true,
      });
    }

    const query = await env.DB.prepare(
      `SELECT chunk_index, part_number, etag, size
       FROM upload_parts
       WHERE session_id = ? AND office_id = ?
       ORDER BY chunk_index ASC`,
    ).bind(sessionId, officeId).all<UploadPartRow>();
    const parts = query.results || [];
    const missing = getMissingChunks(session, parts);
    if (missing.length > 0) {
      return Response.json(
        {
          error: "Upload incomplete",
          uploaded: parts.length,
          total: session.totalChunks,
          missing,
        },
        { status: 400 },
      );
    }

    const uploadedSize = parts.reduce((total, part) => total + Number(part.size), 0);
    if (uploadedSize !== session.fileSize) {
      throw new FinalizeError("Uploaded parts do not match the declared file size");
    }

    let object = await env.UPLOADS_BUCKET.head(session.r2Key);
    if (!object) {
      const upload = env.UPLOADS_BUCKET.resumeMultipartUpload(
        session.r2Key,
        session.r2UploadId,
      );
      object = await upload.complete(
        parts.map((part) => ({
          partNumber: Number(part.part_number),
          etag: String(part.etag),
        })),
      );
    }
    if (object.size !== session.fileSize) {
      await env.UPLOADS_BUCKET.delete(session.r2Key);
      throw new FinalizeError("Final object failed file-size validation", 500);
    }

    session.status = "assembled";
    await saveSession(env, session, 3600);

    const result = session.metadata.mode === "moneytrash"
      ? await createGalleryRecord(env.DB, session, env)
      : await createOrderBackupRecord(env.DB, session, env);

    session.status = "completed";
    session.galleryUrl = result.galleryUrl;
    await saveSession(env, session, 3600);
    await env.DB.prepare(
      "DELETE FROM upload_parts WHERE session_id = ? AND office_id = ?",
    ).bind(sessionId, officeId).run();

    return Response.json({
      success: true,
      sessionId,
      galleryUrl: result.galleryUrl,
      assetId: session.assetId,
      accessCode: session.metadata.access_code,
    });
  } catch (error) {
    if (error instanceof FinalizeError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    logger.error("Finalize error:", { args: [error] });
    return Response.json(
      { error: "Failed to finalize upload" },
      { status: 500 },
    );
  }
}

function getMissingChunks(
  session: UploadSession,
  parts: UploadPartRow[],
): number[] {
  const byIndex = new Map(parts.map((part) => [Number(part.chunk_index), part]));
  const missing: number[] = [];
  for (let index = 0; index < session.totalChunks; index += 1) {
    const part = byIndex.get(index);
    const expectedSize = getExpectedChunkSize(
      session.fileSize,
      session.chunkSize,
      index,
    );
    if (
      !part ||
      Number(part.part_number) !== index + 1 ||
      Number(part.size) !== expectedSize
    ) {
      missing.push(index);
    }
  }
  return missing;
}

async function saveSession(
  env: Env,
  session: UploadSession,
  expirationTtl: number,
): Promise<void> {
  await env.UPLOAD_SESSIONS.put(
    `session:${session.id}`,
    JSON.stringify(session),
    { expirationTtl },
  );
}

async function createGalleryRecord(
  db: D1Database,
  session: UploadSession,
  env: Env,
): Promise<{ galleryUrl: string }> {
  const accessCode = session.metadata.access_code;
  let gallery = await db.prepare(
    "SELECT id, office_id FROM galleries WHERE access_code = ? LIMIT 1",
  ).bind(accessCode).first<{ id: string; office_id: string }>();

  if (!gallery) {
    const candidateId = crypto.randomUUID();
    await db.prepare(
      `INSERT OR IGNORE INTO galleries (
        id, office_id, access_code, name, status, created_at, updated_at,
        expires_at
      ) VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'), datetime('now', '+30 days'))`,
    ).bind(
      candidateId,
      session.officeId,
      accessCode,
      session.metadata.event_name,
    ).run();
    gallery = await db.prepare(
      "SELECT id, office_id FROM galleries WHERE access_code = ? LIMIT 1",
    ).bind(accessCode).first<{ id: string; office_id: string }>();
  }

  if (!gallery || gallery.office_id !== session.officeId) {
    throw new FinalizeError("Access code belongs to another office", 409);
  }

  await db.prepare(
    `INSERT INTO gallery_settings (
      gallery_id, single_photo_price, full_gallery_price,
      watermark_enabled, allow_downloads, updated_at
    ) VALUES (?, ?, ?, 0, 0, datetime('now'))
    ON CONFLICT(gallery_id) DO UPDATE SET
      single_photo_price = COALESCE(excluded.single_photo_price, gallery_settings.single_photo_price),
      full_gallery_price = COALESCE(excluded.full_gallery_price, gallery_settings.full_gallery_price),
      updated_at = datetime('now')`,
  ).bind(
    gallery.id,
    session.metadata.single_photo_price || null,
    session.metadata.full_gallery_price || null,
  ).run();

  await db.prepare(
    `INSERT OR IGNORE INTO assets (
      id, gallery_id, office_id, filename, original_name, mime_type,
      size, r2_key, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ready', datetime('now'))`,
  ).bind(
    session.assetId,
    gallery.id,
    session.officeId,
    session.fileName,
    session.fileName,
    session.metadata.mime_type,
    session.fileSize,
    session.r2Key,
  ).run();

  return { galleryUrl: buildGalleryUrl(env, accessCode) };
}

async function createOrderBackupRecord(
  db: D1Database,
  session: UploadSession,
  env: Env,
): Promise<{ galleryUrl: string }> {
  let order = await db.prepare(
    `SELECT id FROM orders
     WHERE office_id = ? AND access_code = ? AND status = 'backup'
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(session.officeId, session.metadata.access_code).first<{ id: string }>();

  if (!order) {
    const orderId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO orders (
        id, office_id, access_code, customer_email, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'backup', datetime('now'), datetime('now'))`,
    ).bind(
      orderId,
      session.officeId,
      session.metadata.access_code,
      session.metadata.customer_email || null,
    ).run();
    order = { id: orderId };
  }

  await db.prepare(
    `INSERT OR IGNORE INTO assets (
      id, order_id, office_id, filename, original_name, mime_type,
      size, r2_key, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ready', datetime('now'))`,
  ).bind(
    session.assetId,
    order.id,
    session.officeId,
    session.fileName,
    session.fileName,
    session.metadata.mime_type,
    session.fileSize,
    session.r2Key,
  ).run();

  return { galleryUrl: buildGalleryUrl(env, session.metadata.access_code) };
}

function buildGalleryUrl(env: Env, accessCode: string): string {
  const root = (env.GALLERY_APP_URL || "https://gallery.clickflash.com/gallery/")
    .replace(/\/+$/, "/");
  return `${root}?access_code=${encodeURIComponent(accessCode)}`;
}
