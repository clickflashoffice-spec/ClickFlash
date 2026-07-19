import { Router, Request, Response } from "express";

export default function photographerRoutes(context: any): Router {
  const router = Router();
  const { dbManager, logger } = context;

  // POST /api/photographers/enroll-face/proxy
  // Receives biometric face enrollment from mobile app via LAN and saves to local SQLite,
  // then attempts to sync to upstream Cloudflare.
  router.post("/enroll-face/proxy", async (req: Request, res: Response) => {
    try {
      const { photographerId, name, stationId, faceVector } = req.body;
      if (!photographerId || !faceVector || !Array.isArray(faceVector)) {
        return res.status(400).json({ error: "Invalid enrollment data: photographerId and faceVector array are required." });
      }

      logger.info(`[PhotographerRoutes] Enrolling face vector locally for photographer: ${photographerId} (${name || 'Unknown'})`);

      // 1. Store/Update in local SQLite `photographer_faces` table
      const vectorStr = JSON.stringify(faceVector);
      dbManager.run(
        `INSERT INTO photographer_faces (photographer_id, name, station_id, face_vector, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(photographer_id) DO UPDATE SET
           name = excluded.name,
           station_id = excluded.station_id,
           face_vector = excluded.face_vector,
           updated_at = CURRENT_TIMESTAMP`,
        [photographerId, name || "Photographer", stationId || null, vectorStr]
      );

      // Also update `users` table `faceDescriptor` if the user exists locally
      try {
        dbManager.run(
          `UPDATE users SET faceDescriptor = ? WHERE id = ?`,
          [vectorStr, photographerId]
        );
      } catch (err: any) {
        logger.warn(`[PhotographerRoutes] Could not update users.faceDescriptor: ${err.message}`);
      }

      // 2. Attempt to forward to upstream Cloudflare worker
      const cloudUrl = "https://clickflash-api.yourdomain.workers.dev/api/photographers/enroll-face";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      fetch(cloudUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photographerId, name, stationId, faceVector }),
        signal: controller.signal,
      })
        .then((cloudRes) => {
          if (cloudRes.ok) {
            logger.info(`[PhotographerRoutes] Successfully forwarded face enrollment for ${photographerId} to Cloudflare.`);
          } else {
            logger.warn(`[PhotographerRoutes] Cloudflare enrollment failed with status: ${cloudRes.status}`);
          }
        })
        .catch((err) => {
          logger.warn(`[PhotographerRoutes] Cloudflare unreachable during face enrollment: ${err.message}`);
        })
        .finally(() => clearTimeout(timeoutId));

      return res.status(200).json({
        success: true,
        message: "Face vector enrolled and proxied successfully",
      });
    } catch (error: any) {
      logger.error("[PhotographerRoutes] Error handling face enrollment proxy:", error);
      return res.status(500).json({ error: "Failed to proxy face enrollment" });
    }
  });

  // GET /api/photographers/:id/face-vector/proxy
  // Retrieves enrolled face vector for a photographer from local SQLite or fetches upstream and caches locally.
  router.get("/:id/face-vector/proxy", async (req: Request, res: Response) => {
    try {
      const photographerId = req.params.id;
      if (!photographerId) {
        return res.status(400).json({ error: "Photographer ID is required" });
      }

      // 1. Check local SQLite `photographer_faces` first
      const localFace = dbManager.get(`SELECT photographer_id, name, station_id, face_vector FROM photographer_faces WHERE photographer_id = ?`, [photographerId]) as {
        photographer_id: string;
        name: string;
        station_id: string | null;
        face_vector: string;
      } | undefined;

      if (localFace && localFace.face_vector) {
        try {
          const faceVector = JSON.parse(localFace.face_vector);
          logger.info(`[PhotographerRoutes] Served local face vector for ${photographerId}`);
          return res.status(200).json({
            success: true,
            photographer: {
              photographerId: localFace.photographer_id,
              name: localFace.name,
              stationId: localFace.station_id,
              faceVector,
            },
          });
        } catch (e: any) {
          logger.warn(`[PhotographerRoutes] Corrupt local face vector for ${photographerId}, trying upstream.`);
        }
      }

      // Also check `users` table `faceDescriptor` if not found in `photographer_faces`
      const userFace = dbManager.get(`SELECT id, name, faceDescriptor FROM users WHERE id = ? AND faceDescriptor IS NOT NULL`, [photographerId]) as {
        id: string;
        name: string;
        faceDescriptor: string;
      } | undefined;

      if (userFace && userFace.faceDescriptor) {
        try {
          const faceVector = JSON.parse(userFace.faceDescriptor);
          // Cache into `photographer_faces`
          dbManager.run(
            `INSERT INTO photographer_faces (photographer_id, name, station_id, face_vector)
             VALUES (?, ?, ?, ?) ON CONFLICT(photographer_id) DO UPDATE SET face_vector = excluded.face_vector`,
            [userFace.id, userFace.name || "Photographer", null, userFace.faceDescriptor]
          );
          logger.info(`[PhotographerRoutes] Served users face vector for ${photographerId}`);
          return res.status(200).json({
            success: true,
            photographer: {
              photographerId: userFace.id,
              name: userFace.name,
              stationId: null,
              faceVector,
            },
          });
        } catch (e: any) {
          logger.warn(`[PhotographerRoutes] Corrupt users.faceDescriptor for ${photographerId}, trying upstream.`);
        }
      }

      // 2. Fallback: Fetch upstream from Cloudflare and cache locally
      const cloudUrl = `https://clickflash-api.yourdomain.workers.dev/api/photographers/${photographerId}/face-vector`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const cloudRes = await fetch(cloudUrl, { signal: controller.signal });
        if (cloudRes.ok) {
          const data = await cloudRes.json();
          if (data.success && data.photographer?.faceVector) {
            const vectorStr = JSON.stringify(data.photographer.faceVector);
            dbManager.run(
              `INSERT INTO photographer_faces (photographer_id, name, station_id, face_vector)
               VALUES (?, ?, ?, ?) ON CONFLICT(photographer_id) DO UPDATE SET face_vector = excluded.face_vector`,
              [photographerId, data.photographer.name || "Photographer", data.photographer.stationId || null, vectorStr]
            );
            logger.info(`[PhotographerRoutes] Fetched from upstream and cached face vector for ${photographerId}`);
            return res.status(200).json(data);
          }
        }
      } catch (err: any) {
        logger.warn(`[PhotographerRoutes] Upstream fetch failed for face vector of ${photographerId}: ${err.message}`);
      } finally {
        clearTimeout(timeoutId);
      }

      return res.status(404).json({
        success: false,
        error: "Face vector not found for photographer",
      });
    } catch (error: any) {
      logger.error("[PhotographerRoutes] Error retrieving face vector:", error);
      return res.status(500).json({ error: "Failed to retrieve face vector" });
    }
  });

  return router;
}
