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
    const body = (await request.json()) as Partial<GalleryCreateRequest>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const accessCode = typeof body.accessCode === 'string'
      ? body.accessCode.trim().toUpperCase()
      : '';
    
    // Validate
    if (!name || name.length > 120 || !/^[A-Z0-9_-]{4,64}$/.test(accessCode)) {
      return Response.json(
        { error: 'name and a valid 4-64 character accessCode are required' },
        { status: 400 }
      );
    }
    const singlePhotoPrice = validatePrice(body.settings?.singlePhotoPrice);
    const fullGalleryPrice = validatePrice(body.settings?.fullGalleryPrice);
    if (singlePhotoPrice === false || fullGalleryPrice === false) {
      return Response.json(
        { error: 'Gallery prices must be between 0 and 100000' },
        { status: 400 },
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
    ).bind(accessCode).first();
    
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
      `INSERT INTO galleries (
        id, office_id, access_code, name, description, status,
        expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', datetime('now', '+30 days'), ?, ?)`
    ).bind(
      galleryId,
      officeId,
      accessCode,
      name,
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
        singlePhotoPrice ?? null,
        fullGalleryPrice ?? null,
        body.settings.watermarkEnabled ?? false,
        body.settings.allowDownloads ?? false,
        now
      ).run();
    }
    
    return Response.json({
      success: true,
      gallery: {
        id: galleryId,
        accessCode,
        name,
        url: `${env.GALLERY_APP_URL.replace(/\/+$/, '/') }?access_code=${encodeURIComponent(accessCode)}`,
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

function validatePrice(value: unknown): number | null | false {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100_000
    ? parsed
    : false;
}
