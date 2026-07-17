/**
 * Verify office credentials and generate JWT
 * POST /api/office/verify
 */

import { Env } from '../../index';
import { createJWT } from '../../utils/jwt';
import { logger } from "@clickflash/logger";

export interface OfficeVerifyRequest {
  deskId: string;
  apiKey: string;
}

interface OfficeRow {
  id: string;
  desk_id: string;
  name: string;
  type: string;
  status: string;
  settings: string | null;
}

export async function handleOfficeVerify(request: Request, env: Env): Promise<Response> {
  try {
    const body: OfficeVerifyRequest = await request.json();
    
    if (!body.deskId || !body.apiKey) {
      return Response.json(
        { error: 'Missing required fields: deskId, apiKey' },
        { status: 400 }
      );
    }
    
    // Look up office
    const office = await env.DB.prepare(
      `SELECT id, desk_id, name, type, status, settings 
       FROM offices 
       WHERE desk_id = ? AND api_key = ?`
    ).bind(body.deskId, body.apiKey).first<OfficeRow>();
    
    if (!office) {
      return Response.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    if (office.status !== 'active') {
      return Response.json(
        { error: `Office is ${office.status}` },
        { status: 403 }
      );
    }
    
    // Update last seen
    await env.DB.prepare(
      'UPDATE offices SET last_seen_at = datetime("now") WHERE id = ?'
    ).bind(office.id).run();
    
    // Generate JWT
    const token = await createJWT({
      officeId: office.id,
      deskId: office.desk_id,
      type: office.type,
    }, env.JWT_SECRET);
    
    return Response.json({
      success: true,
      office: {
        id: office.id,
        deskId: office.desk_id,
        name: office.name,
        type: office.type,
        settings: office.settings ? JSON.parse(office.settings) : {},
      },
      token,
      expiresIn: '24h',
    });
    
  } catch (error) {
    logger.error('Office verification error:', { args: [error] });
    return Response.json(
      { error: 'Failed to verify office' },
      { status: 500 }
    );
  }
}
