import { logger } from "@clickflash/logger";
import type { Env } from "../../index";
import { verifyPurchaseDownload } from "../../utils/purchaseDownloadSignature";

interface PurchasedAssetRow {
  original_name: string;
  mime_type: string;
  r2_key: string;
}

export async function handleGalleryPurchaseDownload(
  request: Request,
  env: Env,
  params: Record<string, string>,
): Promise<Response> {
  try {
    const orderId = params.orderId || "";
    const assetId = params.assetId || "";
    const url = new URL(request.url);
    const expires = Number(url.searchParams.get("expires"));
    const signature = url.searchParams.get("signature") || "";
    if (
      !orderId ||
      !assetId ||
      !await verifyPurchaseDownload(orderId, assetId, expires, signature, env.JWT_SECRET)
    ) {
      return Response.json({ error: "Invalid or expired purchase download" }, { status: 403 });
    }

    const asset = await env.DB.prepare(
      `SELECT a.original_name, a.mime_type, a.r2_key
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN assets a ON a.id = oi.asset_id
       JOIN galleries g ON g.id = o.gallery_id
       WHERE o.id = ? AND oi.asset_id = ? AND o.status = 'paid'
         AND a.gallery_id = o.gallery_id AND g.status = 'active'
         AND (g.expires_at IS NULL OR g.expires_at > datetime('now'))
       LIMIT 1`,
    ).bind(orderId, assetId).first<PurchasedAssetRow>();
    if (!asset) return Response.json({ error: "Purchased asset not found" }, { status: 404 });

    const object = await env.UPLOADS_BUCKET.get(asset.r2_key);
    if (!object) return Response.json({ error: "Purchased file not found" }, { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", asset.mime_type || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${sanitizeFileName(asset.original_name)}"`);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    return new Response(object.body, { headers });
  } catch (error) {
    logger.error("MoneyTrash purchase download failed", { args: [error] });
    return Response.json({ error: "Purchase download is unavailable" }, { status: 500 });
  }
}

function sanitizeFileName(value: string): string {
  return String(value || "photo")
    .replace(/["\\\r\n]/g, "_")
    .slice(0, 180);
}
