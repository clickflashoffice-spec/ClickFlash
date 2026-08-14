import express, { Request, Response, Router } from "express";
import path from "path";
import { videoReelService } from "../services/videoReelService";
import DatabaseManager from "../database/db";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

export default function (context: { dbManager: DatabaseManager; logger: any; uploadDir: string }): Router {
    const router = express.Router();
    const { dbManager, logger, uploadDir } = context;

    /**
     * @route POST /api/reels/generate
     * @desc Generates an MP4 boomerang video from a sequence of photo IDs
     */
    router.post("/generate", requirePermission(PERMISSIONS.PHOTO_EDIT), async (req: Request, res: Response) => {
        try {
            const { photoIds, fps = 10, boomerang = true } = req.body;

            if (!photoIds || !Array.isArray(photoIds) || photoIds.length < 2) {
                return res.status(400).json({ error: "At least 2 photoIds are required to generate a reel" });
            }

            // Fetch the photo paths from the database
            const photos: { id: string; file: string }[] = [];
            const chunkSize = 500;
            for (let i = 0; i < photoIds.length; i += chunkSize) {
                const chunk = photoIds.slice(i, i + chunkSize);
                const placeholders = chunk.map(() => '?').join(',');
                photos.push(
                    ...dbManager.query<{ id: string; file: string }>(
                        `SELECT id, file FROM photos WHERE id IN (${placeholders})`,
                        chunk
                    )
                );
            }

            if (photos.length !== photoIds.length) {
                return res.status(404).json({ error: "One or more photos could not be found in the database" });
            }

            // Maintain the requested order
            const orderedPhotos = photoIds.map(id => photos.find(p => p.id === id)).filter(Boolean);
            
            // Map to absolute paths
            const imagePaths = orderedPhotos.map(p => path.join(uploadDir, p!.file));

            const outputFilename = `reel_${Date.now()}.mp4`;
            const outputPath = path.join(uploadDir, outputFilename);

            logger.info(`Generating video reel with ${imagePaths.length} photos at ${outputPath}`);

            await videoReelService.generateReel(imagePaths, outputPath, {
                fps,
                boomerang
            });

            // Optionally, we could save this generated reel to a 'reels' table in the DB, 
            // but for now we just return the URL to the client.
            const reelUrl = `/uploads/${outputFilename}`;

            res.status(200).json({ success: true, reelUrl, outputPath });
        } catch (error) {
            logger.error("Failed to generate video reel", error);
            res.status(500).json({ error: "Failed to generate video reel", details: String(error) });
        }
    });

    return router;
}
