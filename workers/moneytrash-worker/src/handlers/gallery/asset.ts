import { logger } from "@clickflash/logger";
import type { Env } from "../../index";
import { verifyGalleryAssetSignature } from "../../utils/galleryAssetSignature";

interface PublicAssetRow {
  id: string;
  original_name: string;
  mime_type: string;
  r2_key: string;
  preview_key: string | null;
  thumbnail_key: string | null;
  watermark_enabled: number | null;
}

export async function handleGalleryAssetGet(
  request: Request,
  env: Env,
  params: Record<string, string>,
): Promise<Response> {
  try {
    const assetId = params.id || "";
    const url = new URL(request.url);
    const expires = Number(url.searchParams.get("expires"));
    const signature = url.searchParams.get("signature") || "";

    if (
      !assetId ||
      !signature ||
      !env.JWT_SECRET ||
      !await verifyGalleryAssetSignature(assetId, expires, signature, env.JWT_SECRET)
    ) {
      return Response.json(
        { error: "Invalid or expired asset link" },
        { status: 403 },
      );
    }

    const asset = await env.DB.prepare(
      `SELECT a.id, a.original_name, a.mime_type, a.r2_key,
              a.preview_key, a.thumbnail_key, gs.watermark_enabled
       FROM assets a
       JOIN galleries g ON g.id = a.gallery_id
       LEFT JOIN gallery_settings gs ON gs.gallery_id = g.id
       WHERE a.id = ? AND a.status = 'ready' AND g.status = 'active'
         AND (g.expires_at IS NULL OR g.expires_at > datetime('now'))
       LIMIT 1`,
    ).bind(assetId).first<PublicAssetRow>();
    if (!asset) {
      return Response.json({ error: "Asset not found" }, { status: 404 });
    }

    const watermarkEnabled = Number(asset.watermark_enabled) === 1;
    if (watermarkEnabled && !asset.preview_key && !asset.thumbnail_key) {
      return Response.json(
        { error: "A protected preview is not available for this asset" },
        { status: 404 },
      );
    }
    const objectKey = watermarkEnabled
      ? (asset.preview_key || asset.thumbnail_key)!
      : (asset.preview_key || asset.thumbnail_key || asset.r2_key);
    const object = await env.UPLOADS_BUCKET.get(objectKey);
    if (!object) {
      return Response.json({ error: "Asset file not found" }, { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", asset.mime_type || "application/octet-stream");
    headers.set("Content-Disposition", `inline; filename="${sanitizeFileName(asset.original_name)}"`);
    headers.set("Cache-Control", "private, max-age=300, no-transform");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    return new Response(object.body, { headers });
  } catch (error) {
    logger.error("Gallery asset error:", { args: [error] });
    return Response.json({ error: "Failed to load gallery asset" }, { status: 500 });
  }
}

function sanitizeFileName(value: string): string {
  return String(value || "photo")
    .replace(/["\\\r\n]/g, "_")
    .slice(0, 180);
}
