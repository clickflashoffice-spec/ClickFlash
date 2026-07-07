import DatabaseManager from "../db.js";
import { createErrorResponse, sendAuthError } from "../errorHandler.js";

export async function handleGdpr(
  request: Request,
  url: URL,
  dbManager: DatabaseManager,
  payload: any,
  corsHeaders: any
): Promise<Response | null> {
  // GDPR APIs require authentication
  if (!payload) return sendAuthError("Auth required for GDPR endpoints");

  // POST /api/gdpr/erasure
  // Completely erases personal data for a given email address
  if (url.pathname === "/api/gdpr/erasure" && request.method === "POST") {
    try {
      const body = await request.json() as { email: string };
      if (!body.email) {
        return createErrorResponse(400, "Bad Request", "email is required");
      }
      
      const targetEmail = body.email.trim();
      
      // Anonymize Users table
      await dbManager.run(
        `UPDATE users 
         SET name = 'Anonymized', 
             email = 'erased_' || id || '_' || CAST(RANDOM() AS TEXT) || '@gdpr.local', 
             password = NULL, 
             desk_id = NULL, 
             machine_id = NULL, 
             location = NULL, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE email = ?`,
        [targetEmail]
      );
      
      // Anonymize Orders table
      await dbManager.run(
        `UPDATE orders 
         SET clientName = 'Anonymized', 
             email = 'erased@gdpr.local', 
             items = '{}', 
             updated_at = CURRENT_TIMESTAMP 
         WHERE LOWER(email) = LOWER(?)`,
        [targetEmail]
      );
      
      return Response.json(
        { success: true, message: "Personal data successfully erased" },
        { headers: corsHeaders }
      );
    } catch (e: any) {
      return createErrorResponse(500, "GDPR Erasure Error", e.message);
    }
  }

  // GET /api/gdpr/export
  // Exports personal data for portability
  if (url.pathname === "/api/gdpr/export" && request.method === "GET") {
    try {
      const email = url.searchParams.get("email");
      if (!email) {
        return createErrorResponse(400, "Bad Request", "email query param is required");
      }
      
      const targetEmail = email.trim();
      
      // Fetch user data
      const user = await dbManager.get(
        `SELECT id, name, email, role, specialty, avatarUrl, destinationId, workingHours, desk_id, location, created_at, updated_at 
         FROM users 
         WHERE email = ? LIMIT 1`,
        [targetEmail]
      );
      
      // Fetch orders data
      const orders = await dbManager.query(
        `SELECT id, date, clientName, email, status, total, photographerId, destinationId, paymentMethod, appliedDiscount, items, albumId, created_at, updated_at 
         FROM orders 
         WHERE LOWER(email) = LOWER(?)`,
        [targetEmail]
      );
      
      return Response.json(
        { 
          success: true, 
          data: {
            user: user || null,
            orders: orders || []
          }
        },
        { headers: corsHeaders }
      );
    } catch (e: any) {
      return createErrorResponse(500, "GDPR Export Error", e.message);
    }
  }

  return null;
}
