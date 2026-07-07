import DatabaseManager from "../db.js";
import { createErrorResponse } from "../errorHandler.js";

export async function handleFiles(
    request: Request,
    env: any,
    url: URL,
    corsHeaders: any
): Promise<Response | null> {
    const fileMatch = url.pathname.match(/\/api\/files\/(.+)$/);
    if (fileMatch) {
        const key = fileMatch[1];
        const object = await env.GALLERY_BUCKET.get(key);
        if (!object) return createErrorResponse(404, "Not Found", "File not found in storage");
        
        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        
        return new Response(object.body, { headers });
    }
    return null;
}
