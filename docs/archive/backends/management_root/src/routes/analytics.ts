import DatabaseManager from "../db.js";
import AnalyticsService from "../services/analyticsService.js";
import { createErrorResponse } from "../errorHandler.js";

export async function handleAnalytics(
  request: Request,
  env: any,
  url: URL,
  dbManager: DatabaseManager,
  analyticsService: AnalyticsService,
  payload: any,
  corsHeaders: any
): Promise<Response | null> {
  const deskId = payload?.desk_id || null;

  // --- GET /api/analytics/dashboard ---
  if (url.pathname === "/api/analytics/dashboard" && request.method === "GET") {
    const startDate = url.searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = url.searchParams.get("endDate") || new Date().toISOString();
    const stats = await analyticsService.getDashboardStats(startDate, endDate, deskId);
    return Response.json(stats, { headers: corsHeaders });
  }

  // --- GET /api/analytics/revenue-trend ---
  if (url.pathname === "/api/analytics/revenue-trend" && request.method === "GET") {
    const startDate = url.searchParams.get("startDate") || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = url.searchParams.get("endDate") || new Date().toISOString();
    const trend = await analyticsService.getRevenueTrend(startDate, endDate, deskId);
    return Response.json(trend, { headers: corsHeaders });
  }

  // --- GET /api/analytics/top-albums ---
  if (url.pathname === "/api/analytics/top-albums" && request.method === "GET") {
    const startDate = url.searchParams.get("startDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = url.searchParams.get("endDate") || new Date().toISOString();
    const limit = parseInt(url.searchParams.get("limit") || "5", 10);
    const albums = await analyticsService.getTopAlbums(startDate, endDate, deskId, limit);
    return Response.json(albums, { headers: corsHeaders });
  }

  return null;
}
