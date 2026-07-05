import { createToken, verifyToken, extractTokenFromHeader } from "../jwt.js";
import { checkLoginRateLimit, recordLoginAttempt } from "../loginRateLimiter.js";
import { validateLogin } from "../validation.js";
import { verifyPassword } from "../auth.js";
import { handlePayments } from "../payments.js";

export const handleCloud = async (request: Request, url: URL, pathName: string, env: any, dbManager: any, corsHeaders: any, photoProcessor: any, payload: any) => {


          // File Serving (R2) with Law 13 Hardware Hardening
          if (pathName.startsWith("/api/files/")) {
            const storageKey = pathName.replace("/api/files/", "");

            // SECURITY GUARD: Check if requesting high-resolution asset
            const isHighRes = storageKey.includes("/highres/");

            if (isHighRes) {
              // Extract photo ID from key: <album>/highres/<photoId>.jpg
              const segments = storageKey.split("/");
              const filename = segments[segments.length - 1];
              const photoId = filename.split(".")[0];

              // Verify payment status in D1
              // We check 'moneytrash_purchases' for MoneyTrash or 'orders' json_each for main gallery
              const access = (await dbManager.get(
                `
                              SELECT 'purchased' as status FROM moneytrash_purchases WHERE photo_id = ?
                              UNION ALL
                              SELECT 'paid' as status FROM orders, json_each(orders.items) 
                              WHERE json_extract(json_each.value, '$.id') = ? AND (orders.status = 'completed' OR orders.status = 'paid')
                              LIMIT 1
                          `,
                [photoId, photoId],
              )) as any;

              const isPurchased =
                access &&
                (access.status === "purchased" || access.status === "paid");

              if (!isPurchased) {
                // FALLBACK Logic: If not purchased, try to serve the watermarked preview
                const wmKey = storageKey
                  .replace("/highres/", "/thumbs/")
                  .replace(/\.[^.]+$/, "_preview_wm.webp");
                const wmObject = await env.GALLERY_BUCKET.get(wmKey);

                if (wmObject) {
                  const headers = new Headers();
                  wmObject.writeHttpMetadata(headers);
                  headers.set("Cache-Control", "public, max-age=3600"); // Shorter cache for previews
                  headers.set("X-Access-Target", "preview-watermarked");
                  return new Response(wmObject.body, { headers });
                }

                // If no watermark exists, return Paywall required
                return new Response(
                  JSON.stringify({
                    error: "Payment Required",
                    message: "High-resolution access requires a completed order.",
                    photoId: photoId,
                  }),
                  {
                    status: 402,
                    headers: {
                      "Content-Type": "application/json",
                    },
                  },
                );
              }
            }

            // Authorized or Low-Res (Preview/Thumb): Proceed to R2
            const object = await env.GALLERY_BUCKET.get(storageKey);

            if (!object) {
              return new Response(
                JSON.stringify({
                  error: "Not Found",
                  message: "File not found in storage",
                }),
                {
                  status: 404,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set("etag", object.httpEtag);
            headers.set("Cache-Control", "public, max-age=31536000, immutable");

            return new Response(object.body, { headers });
          }
  return null;
};
