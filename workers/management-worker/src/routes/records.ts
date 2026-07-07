import DatabaseManager from "../db.js";
import RecordService from "../services/recordService.js";
import { createErrorResponse } from "../errorHandler.js";

export async function handleRecords(
  request: Request,
  env: any,
  url: URL,
  dbManager: DatabaseManager,
  recordService: RecordService,
  payload: any,
  corsHeaders: any
): Promise<Response | null> {
  const deskId = payload?.desk_id || null;

  // Generic CRUD Records
  const collectionMatch = url.pathname.match(/\/api\/collections\/([^/]+)\/records(?:\/([^/]+))?/);
  if (collectionMatch) {
    const collection = collectionMatch[1];
    const id = collectionMatch[2];

    if (request.method === "GET") {
      const data = await recordService.listRecords(collection, url.searchParams, deskId);
      return Response.json(data, { headers: corsHeaders });
    }

    if (request.method === "POST" || request.method === "PATCH") {
      const body = (await request.json()) as any;
      if (id) body.id = id;
      try {
        const result = await recordService.saveRecord(collection, body, request.method === "PATCH", deskId);
        return Response.json(result, { headers: corsHeaders });
      } catch (e: any) {
        return createErrorResponse(400, "Collection Error", e.message);
      }
    }

    if (request.method === "DELETE" && id) {
      try {
        await recordService.deleteRecord(collection, id, deskId);
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (e: any) {
        return createErrorResponse(400, "Collection Error", e.message);
      }
    }
  }

  return null;
}
