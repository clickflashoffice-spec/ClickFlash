/**
 * Register a new MoneyTrash office/station
 * POST /api/office/register
 */

import { Env } from '../../index';
import { createJWT } from '../../utils/jwt';

export interface OfficeRegistrationRequest {
  deskId: string;
  name: string;
  location?: string;
  contactEmail: string;
  apiKey: string;  // Master API key for validation
}

export interface Office {
  id: string;
  deskId: string;
  name: string;
  type: 'moneytrash';
  location?: string;
  contactEmail: string;
  apiKey: string;
  apiSecret: string;
  status: 'active' | 'suspended' | 'inactive';
  settings: OfficeSettings;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
}

export interface OfficeSettings {
  maxUploadSize: number;
  allowedFormats: string[];
  defaultPricing?: {
    singlePhoto: number;
    fullGallery: number;
  };
  storageConfig: {
    provider: 's3' | 'r2';
    bucket: string;
    region: string;
  };
}

export async function handleOfficeRegister(request: Request, env: Env): Promise<Response> {
  try {
    const body: OfficeRegistrationRequest = await request.json();
    
    // Validate required fields
    if (!body.deskId || !body.name || !body.contactEmail || !body.apiKey) {
      return Response.json(
        { error: 'Missing required fields: deskId, name, contactEmail, apiKey' },
        { status: 400 }
      );
    }
    
    // Validate master API key (in production, check against secure store)
    if (body.apiKey !== env.MASTER_API_KEY) {
      return Response.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Check if office already exists
    const existing = await env.DB.prepare(
      'SELECT id FROM offices WHERE desk_id = ?'
    ).bind(body.deskId).first();
    
    if (existing) {
      return Response.json(
        { error: 'Office with this deskId already exists' },
        { status: 409 }
      );
    }
    
    // Create office
    const officeId = crypto.randomUUID();
    const apiSecret = generateApiSecret();
    
    const office: Office = {
      id: officeId,
      deskId: body.deskId,
      name: body.name,
      type: 'moneytrash',
      location: body.location,
      contactEmail: body.contactEmail,
      apiKey: generateApiKey(),
      apiSecret,
      status: 'active',
      settings: {
        maxUploadSize: parseInt(env.MAX_UPLOAD_SIZE),
        allowedFormats: ['jpg', 'jpeg', 'png', 'heic', 'webp'],
        storageConfig: {
          provider: 'r2',
          bucket: 'moneytrash-uploads',
          region: 'auto',
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Store in D1
    await env.DB.prepare(
      `INSERT INTO offices (id, desk_id, name, type, location, contact_email, api_key, api_secret, status, settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      office.id,
      office.deskId,
      office.name,
      office.type,
      office.location || null,
      office.contactEmail,
      office.apiKey,
      office.apiSecret,
      office.status,
      JSON.stringify(office.settings),
      office.createdAt,
      office.updatedAt
    ).run();
    
    // Generate JWT for immediate use
    const token = await createJWT({
      officeId: office.id,
      deskId: office.deskId,
      type: office.type,
    }, env.JWT_SECRET);
    
    return Response.json({
      success: true,
      office: {
        id: office.id,
        deskId: office.deskId,
        name: office.name,
        apiKey: office.apiKey,
      },
      token,
      message: 'Office registered successfully',
    });
    
  } catch (error) {
    console.error('Office registration error:', error);
    return Response.json(
      { error: 'Failed to register office' },
      { status: 500 }
    );
  }
}

function generateApiKey(): string {
  return 'mt_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateApiSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(64)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
