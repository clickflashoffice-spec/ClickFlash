/**
 * Create a new gallery
 * POST /api/galleries
 */

import { Env } from '../../index';
import { logger } from "@clickflash/logger";

export interface GalleryCreateRequest {
  name: string;
  accessCode: string;
  description?: string;
  coverImage?: string;
  settings?: {
    singlePhotoPrice?: number;
    fullGalleryPrice?: number;
    watermarkEnabled?: boolean;
    allowDownloads?: boolean;
  };
}

export async function handleGalleryCreate(request: Request, env: Env): Promise<Response> {
  try {
    const body: GalleryCreateRequest = await request.json();
    
    // Validate
    if (!body.name || !body.accessCode) {
      return Response.json(
        { error: 'Missing required fields: name, accessCode' },
        { status: 400 }
      );
    }
    
    // Get office from auth context
    const officeId = request.headers.get('X-Office-Id');
    
    if (!officeId) {
      return Response.json(
        { error: 'Office not authenticated' },
        { status: 401 }
      );
    }
    
    // Check if access code already exists
    const existing = await env.DB.prepare(
      'SELECT id FROM galleries WHERE access_code = ?'
    ).bind(body.accessCode).first();
    
    if (existing) {
      return Response.json(
        { error: 'Access code already in use' },
        { status: 409 }
      );
    }
    
    const galleryId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Create gallery
    await env.DB.prepare(
      `INSERT INTO galleries (id, office_id, access_code, name, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    ).bind(
      galleryId,
      officeId,
      body.accessCode,
      body.name,
      body.description || null,
      now,
      now
    ).run();
    
    // Create settings if provided
    if (body.settings) {
      await env.DB.prepare(
        `INSERT INTO gallery_settings (
          gallery_id, single_photo_price, full_gallery_price, 
          watermark_enabled, allow_downloads, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        galleryId,
        body.settings.singlePhotoPrice || null,
        body.settings.fullGalleryPrice || null,
        body.settings.watermarkEnabled ?? true,
        body.settings.allowDownloads ?? false,
        now
      ).run();
    }
    
    return Response.json({
      success: true,
      gallery: {
        id: galleryId,
        accessCode: body.accessCode,
        name: body.name,
        url: `${env.GALLERY_APP_URL}/gallery/${body.accessCode}`,
      },
    });
    
  } catch (error) {
    logger.error('Gallery creation error:', { args: [error] });
    return Response.json(
      { error: 'Failed to create gallery' },
      { status: 500 }
    );
  }
}
