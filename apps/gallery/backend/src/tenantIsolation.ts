/**
 * Tenant Isolation Middleware for Gallery Backend
 * Ensures strict data isolation based on destinationId/hotelId
 *
 * All data access must be scoped to the authenticated user's destination
 */

import { jwtVerify } from 'jose';
import DatabaseManager from './db.js';

export interface AuthContext {
  userId?: string;
  destinationId?: string;
  role?: string;
  orderId?: string;
}

export interface TenantScope {
  destinationId: string;
  orderId?: string;
}

/**
 * Extract tenant scope from request authentication.
 * Verifies the JWT signature with HS256 before trusting any claims.
 */
export async function extractTenantScope(
  request: Request,
  dbManager: DatabaseManager,
  jwtSecret: string,
): Promise<TenantScope | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

    const destinationId = payload['destinationId'];
    if (typeof destinationId !== 'string' || !destinationId) {
      return null;
    }

    const orderId = payload['orderId'];
    return {
      destinationId,
      orderId: typeof orderId === 'string' ? orderId : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Validate that a record belongs to the specified destination
 */
export async function validateRecordAccess(
  dbManager: DatabaseManager,
  tableName: string,
  recordId: string,
  tenantScope: TenantScope
): Promise<boolean> {
  try {
    const row = await dbManager.get(
      `SELECT destinationId FROM ${tableName} WHERE id = ?`,
      [recordId]
    ) as { destinationId: string } | undefined;

    if (!row) {
      return false;
    }

    return row.destinationId === tenantScope.destinationId;
  } catch {
    return false;
  }
}

/**
 * Add destinationId filter to SQL queries to enforce tenant isolation
 */
export function addTenantFilter(
  sql: string,
  params: unknown[],
  tenantScope: TenantScope,
  tableAlias: string = ''
): { sql: string; params: unknown[] } {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  
  // Ensure destinationId is always in the WHERE clause
  if (sql.toLowerCase().includes('where')) {
    // Append to existing WHERE
    return {
      sql: `${sql} AND ${prefix}destinationId = ?`,
      params: [...params, tenantScope.destinationId],
    };
  } else {
    // Add new WHERE
    return {
      sql: `${sql} WHERE ${prefix}destinationId = ?`,
      params: [...params, tenantScope.destinationId],
    };
  }
}

/**
 * Validate that items in an order belong to the same destination
 */
export async function validateOrderItemsAccess(
  dbManager: DatabaseManager,
  orderId: string,
  photoIds: string[],
  tenantScope: TenantScope
): Promise<boolean> {
  if (photoIds.length === 0) {
    return true;
  }

  try {
    // Verify the order belongs to the tenant
    const order = await dbManager.get(
      'SELECT destinationId FROM orders WHERE id = ?',
      [orderId]
    ) as { destinationId: string } | undefined;

    if (!order || order.destinationId !== tenantScope.destinationId) {
      return false;
    }

    // Verify all photos belong to the same destination
    const placeholders = photoIds.map(() => '?').join(',');
    const photos = await dbManager.query(
      `SELECT id FROM photos WHERE id IN (${placeholders}) AND destinationId = ?`,
      [...photoIds, tenantScope.destinationId]
    );

    return photos.length === photoIds.length;
  } catch {
    return false;
  }
}

/**
 * Middleware wrapper for tenant isolation.
 * Reads JWT_SECRET from the Worker env binding.
 */
export function withTenantIsolation(
  handler: (request: Request, env: Record<string, unknown>, tenantScope: TenantScope) => Promise<Response>
) {
  return async (request: Request, env: Record<string, unknown>): Promise<Response> => {
    const jwtSecret = env['JWT_SECRET'];
    if (typeof jwtSecret !== 'string' || !jwtSecret) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: JWT_SECRET not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dbManager = new DatabaseManager(env['GALLERY_DB'] as any);
    const tenantScope = await extractTenantScope(request, dbManager, jwtSecret);

    if (!tenantScope) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Valid authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return handler(request, env, tenantScope);
  };
}
