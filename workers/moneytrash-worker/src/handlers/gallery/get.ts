/**
 * Get gallery by access code
 * GET /api/galleries/:code
 */

import { Env } from '../../index';
import { logger } from "@clickflash/logger";

export async function handleGalleryGet(request: Request, env: Env, params: Record<string, string>): Promise<Response> {
  try {
    const { code } = params;
    
    if (!code) {
      return Response.json(
        { error: 'Missing access code' },
        { status: 400 }
      );
    }
    
    // Get gallery with assets
    const gallery = await env.DB.prepare(
      `SELECT 
        g.id, g.office_id, g.access_code, g.name, g.description, 
        g.status, g.created_at, g.updated_at,
        gs.single_photo_price, gs.full_gallery_price, 
        gs.watermark_enabled, gs.allow_downloads
       FROM galleries g
       LEFT JOIN gallery_settings gs ON g.id = gs.gallery_id
       WHERE g.access_code = ?`
    ).bind(code).first();
    
    if (!gallery) {
      return Response.json(
        { error: 'Gallery not found' },
        { status: 404 }
      );
    }
    
    if (gallery.status !== 'active') {
      return Response.json(
        { error: 'Gallery is not active' },
        { status: 403 }
      );
    }
    
    // Get assets
    const assets = await env.DB.prepare(
      `SELECT 
        id, filename, original_name, mime_type, size,
        width, height, status, created_at
       FROM assets
       WHERE gallery_id = ? AND status = 'ready'
       ORDER BY created_at DESC`
    ).bind(gallery.id).all();
    
    return Response.json({
      success: true,
      gallery: {
        id: gallery.id,
        accessCode: gallery.access_code,
        name: gallery.name,
        description: gallery.description,
        status: gallery.status,
        settings: {
          singlePhotoPrice: gallery.single_photo_price,
          fullGalleryPrice: gallery.full_gallery_price,
          watermarkEnabled: gallery.watermark_enabled,
          allowDownloads: gallery.allow_downloads,
        },
        assets: assets.results || [],
        createdAt: gallery.created_at,
        updatedAt: gallery.updated_at,
      },
    });
    
  } catch (error) {
    logger.error('Gallery get error:', { args: [error] });
    return Response.json(
      { error: 'Failed to get gallery' },
      { status: 500 }
    );
  }
}
