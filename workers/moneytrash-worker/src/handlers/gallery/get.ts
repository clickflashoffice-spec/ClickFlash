/**
 * Get a customer-facing gallery by access code.
 * GET /api/galleries/:code
 */

import { logger } from "@clickflash/logger";
import type { Env } from "../../index";
import { signGalleryAssetUrl } from "../../utils/galleryAssetSignature";
import { createGalleryPurchaseToken } from "../../utils/galleryPurchaseToken";

interface GalleryRow {
  id: string;
  office_id: string;
  access_code: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  single_photo_price: number | null;
  full_gallery_price: number | null;
  watermark_enabled: number | null;
  allow_downloads: number | null;
}

interface GalleryAssetRow {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  status: string;
  created_at: string;
  preview_key: string | null;
  thumbnail_key: string | null;
}

export async function handleGalleryGet(
  request: Request,
  env: Env,
  params: Record<string, string>,
): Promise<Response> {
  try {
    const code = decodeURIComponent(params.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{4,64}$/.test(code)) {
      return Response.json({ error: "Invalid access code" }, { status: 400 });
    }
    if (!env.JWT_SECRET || new TextEncoder().encode(env.JWT_SECRET).byteLength < 32) {
      return Response.json(
        { error: "Gallery asset signing is not configured" },
        { status: 503 },
      );
    }

    const gallery = await env.DB.prepare(
      `SELECT
        g.id, g.office_id, g.access_code, g.name, g.description,
        g.status, g.created_at, g.updated_at, g.expires_at,
        gs.single_photo_price, gs.full_gallery_price,
        gs.watermark_enabled, gs.allow_downloads
       FROM galleries g
       LEFT JOIN gallery_settings gs ON g.id = gs.gallery_id
       WHERE g.access_code = ?
         AND (g.expires_at IS NULL OR g.expires_at > datetime('now'))
       LIMIT 1`,
    ).bind(code).first<GalleryRow>();
    if (!gallery) {
      return Response.json({ error: "Gallery not found" }, { status: 404 });
    }
    if (gallery.status !== "active") {
      return Response.json({ error: "Gallery is not active" }, { status: 403 });
    }

    const assetQuery = await env.DB.prepare(
      `SELECT
        id, filename, original_name, mime_type, size,
        width, height, status, created_at, preview_key, thumbnail_key
       FROM assets
       WHERE gallery_id = ? AND status = 'ready'
       ORDER BY created_at DESC
       LIMIT 500`,
    ).bind(gallery.id).all<GalleryAssetRow>();

    const requestOrigin = new URL(request.url).origin;
    const expires = Math.floor(Date.now() / 1000) + 300;
    const publicAssets = (assetQuery.results || []).filter((asset) =>
      Number(gallery.watermark_enabled ?? 0) !== 1 ||
      Boolean(asset.preview_key || asset.thumbnail_key),
    );
    const assets = await Promise.all(publicAssets.map(async (asset) => {
      const signature = await signGalleryAssetUrl(asset.id, expires, env.JWT_SECRET);
      const assetUrl = new URL(`/api/gallery-assets/${encodeURIComponent(asset.id)}`, requestOrigin);
      assetUrl.searchParams.set("expires", String(expires));
      assetUrl.searchParams.set("signature", signature);
      return {
        id: asset.id,
        filename: asset.filename,
        originalName: asset.original_name,
        title: asset.original_name || asset.filename,
        mimeType: asset.mime_type,
        size: Number(asset.size),
        width: asset.width,
        height: asset.height,
        url: assetUrl.toString(),
        thumbnailUrl: assetUrl.toString(),
        price: Number(gallery.single_photo_price || 0),
        originalPrice: Number(gallery.single_photo_price || 0),
        status: asset.status,
        createdAt: asset.created_at,
      };
    }));
    const purchaseSession = await createGalleryPurchaseToken(gallery.id, env.JWT_SECRET);

    return Response.json({
      success: true,
      gallery: {
        id: gallery.id,
        officeId: gallery.office_id,
        accessCode: gallery.access_code,
        name: gallery.name,
        description: gallery.description,
        status: gallery.status,
        settings: {
          singlePhotoPrice: Number(gallery.single_photo_price || 0),
          fullGalleryPrice: Number(gallery.full_gallery_price || 0),
          watermarkEnabled: Number(gallery.watermark_enabled ?? 0) === 1,
          allowDownloads: Number(gallery.allow_downloads ?? 0) === 1,
        },
        purchaseToken: purchaseSession.token,
        purchaseTokenExpiresAt: purchaseSession.expiresAt,
        assets,
        createdAt: gallery.created_at,
        updatedAt: gallery.updated_at,
        expiresAt: gallery.expires_at,
      },
    });
  } catch (error) {
    logger.error("Gallery get error:", { args: [error] });
    return Response.json({ error: "Failed to get gallery" }, { status: 500 });
  }
}
