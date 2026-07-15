import { createErrorResponse } from "../errorHandler.js";
import { logger } from "@clickflash/logger";

export const handleTelemetry = async (request: Request, url: URL, corsHeaders: any) => {
  if (url.pathname === "/api/telemetry/ingest" && request.method === "POST") {
    try {
      const body = await request.json() as any;
      const { logs } = body;
      
      if (!Array.isArray(logs)) {
        return createErrorResponse(400, "Bad Request", "Invalid payload format");
      }

      // In a real CF worker, you might push this to an external service, Durable Object, 
      // or tail it using standard `console.log`. Since CF workers don't have local disk,
      // we will just use console.log which gets picked up by Wrangler or CF log push.
      logs.forEach(log => {
        const level = (log.level || 'INFO').toUpperCase();
        const msg = `[TELEMETRY] [${log.service}] [${log.url}] [${level}] ${log.message}`;
        if (level === 'ERROR' || level === 'FATAL') logger.error(String(msg) + ' ' + String(log.data));
        else if (level === 'WARN') logger.warn(String(msg) + ' ' + String(log.data));
        else if (level === 'DEBUG') logger.debug(String(msg) + ' ' + String(log.data));
        else logger.info(String(msg) + ' ' + String(log.data));
      });

      return Response.json({ success: true, count: logs.length }, { headers: corsHeaders });
    } catch (error) {
      logger.error("[TELEMETRY] Failed to ingest telemetry payload", { args: [error] });
      return createErrorResponse(500, "Internal Server Error", "Failed to process telemetry");
    }
  }

  return null; // Route not matched
};
