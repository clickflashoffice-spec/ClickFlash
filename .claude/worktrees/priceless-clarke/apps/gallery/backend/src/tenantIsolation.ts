/**
 * Tenant Isolation Middleware for Gallery Backend
 * Ensures strict data isolation based on destinationId/hotelId
 * 
 * All data access must be scoped to the authenticated user's destination
 */

import { DatabaseManager } from './db.js';

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
 * Extract tenant scope from request authentication
 * In production, this would verify JWT and extract destinationId
 */
export async function extractTenantScope(
  request: Request,
  dbManager: DatabaseManager
): Promise<TenantScope | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  
  try {
    // Verify token and extract claims
    // In production, use proper JWT verification
    const claims = JSON.parse(atob(token.split('.')[1]));
    
    if (!claims.destinationId) {
      return null;
    }

    return {
      destinationId: claims.destinationId,
      orderId: claims.orderId,
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
    const photos = await dbManager.all(
      `SELECT id FROM photos WHERE id IN (${placeholders}) AND destinationId = ?`,
      [...photoIds, tenantScope.destinationId]
    );

    return photos.length === photoIds.length;
  } catch {
    return false;
  }
}

/**
 * Middleware wrapper for tenant isolation
 * Use this to wrap route handlers
 */
export function withTenantIsolation(
  handler: (request: Request, env: any, tenantScope: TenantScope) => Promise<Response>
) {
  return async (request: Request, env: any): Promise<Response> => {
    const dbManager = new DatabaseManager(env.GALLERY_DB);
    
    const tenantScope = await extractTenantScope(request, dbManager);
    
    if (!tenantScope) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Valid authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return handler(request, env, tenantScope);
  };
}
