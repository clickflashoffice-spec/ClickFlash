import express, { Request, Response, Router } from "express";
import formidable from "formidable";
import path from "path";
import fs from "fs";
import {
  sendValidationError,
  sendInvalidInputError,
  sendInternalError,
} from "../shared/errorHandler";
import { DatabaseManager } from "../shared/db";
import { Logger } from "../shared/logger";
import { VectorIndexService } from "../services/VectorIndexService";
import { faceService } from "../services/faceService";

interface FacesContext {
  logger: Logger;
  dbManager: DatabaseManager;
  vectorIndex: VectorIndexService;
  UPLOAD_DIR: string;
}

interface PhotoWithAlbum {
  id: string;
  albumId: string;
  title: string;
  url: string;
  photographerId: number;
  roomNumber: string;
  albumTitle: string;
  distance: number;
}

export default function faceRoutes(context: FacesContext): Router {
  const { logger, dbManager, vectorIndex, UPLOAD_DIR } = context;
  const router = express.Router();

  /**
   * @route POST /search
   * @description Search for photos matching the uploaded face
   * @access Public (Kiosk)
   */
  router.post("/search", (req: Request, res: Response) => {
    const form = formidable({
      uploadDir: path.join(UPLOAD_DIR, "temp"),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const tempDir = path.join(UPLOAD_DIR, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    form.parse(req, async (err, _fields, files) => {
      if (err) return sendInternalError(res, `Upload failed: ${err.message}`);

      const file = Array.isArray(files.image) ? files.image[0] : files.image;
      if (!file) return sendInvalidInputError(res, "No image file uploaded");

      try {
        // 1. Get descriptor for probe image
        const probeDescriptor = await faceService
          .getInstance(logger)
          .getDescriptor(file.filepath);

        if (!probeDescriptor) {
          return sendValidationError(res, "No face detected in the image");
        }

        // 2. Search using Vector Index
        const matchedPhotoIds = vectorIndex.search(probeDescriptor, 50, 0.6);

        if (!matchedPhotoIds || matchedPhotoIds.length === 0) {
          return res.json({ 
            matches: [],
            roomNumber: null,
            albumId: null,
            faceFound: false 
          });
        }

        // 3. Fetch Photo Details with Album Info (for room number)
        const placeholders = matchedPhotoIds.map(() => "?").join(",");
        const photos = dbManager.query(
          `SELECT p.*, a.roomNumber, a.title as albumTitle 
           FROM photos p 
           JOIN albums a ON p.albumId = a.id 
           WHERE p.id IN (${placeholders})`,
          matchedPhotoIds,
        );

        // 4. Determine the most likely room number (majority vote)
        const roomCounts: Record<string, number> = {};
        let bestRoom = "";
        let maxCount = 0;

        photos.forEach((photo: any) => {
          const room = photo.roomNumber || "unknown";
          roomCounts[room] = (roomCounts[room] || 0) + 1;
          if (roomCounts[room] > maxCount) {
            maxCount = roomCounts[room];
            bestRoom = room;
          }
        });

        // 5. Get the album ID for the best room
        const albumId = photos.length > 0 ? photos[0].albumId : null;

        logger.info(`[FaceSearch] Found ${photos.length} matches, room: ${bestRoom}`);

        res.json({ 
          matches: photos,
          roomNumber: bestRoom,
          albumId: albumId,
          faceFound: true,
          matchCount: photos.length,
          confidence: photos.length > 0 ? "high" : "low"
        });
      } catch (error: any) {
        logger.error("Face search error", error);
        sendInternalError(res, error.message);
      } finally {
        try {
          fs.unlinkSync(file.filepath);
        } catch (e: any) {
          logger.warn(`Failed to cleanup temp file ${file.filepath}:`, {
            error: e.message,
          });
        }
      }
    });
  });

  /**
   * @route POST /search-by-face
   * @description Complete flow: scan face → find room → return room photos
   * @access Public (Kiosk)
   */
  router.post("/search-by-face", (req: Request, res: Response) => {
    const form = formidable({
      uploadDir: path.join(UPLOAD_DIR, "temp"),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const tempDir = path.join(UPLOAD_DIR, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    form.parse(req, async (err, _fields, files) => {
      if (err) return sendInternalError(res, `Upload failed: ${err.message}`);

      const file = Array.isArray(files.image) ? files.image[0] : files.image;
      if (!file) return sendInvalidInputError(res, "No image file uploaded");

      try {
        logger.info("[FaceSearch] Starting face scan for customer");

        // 1. Get descriptor for probe image
        const probeDescriptor = await faceService
          .getInstance(logger)
          .getDescriptor(file.filepath);

        if (!probeDescriptor) {
          return res.json({
            success: false,
            faceFound: false,
            message: "No face detected in the image. Please ensure your face is clearly visible."
          });
        }

        // 2. Search using Vector Index (top match only for room identification)
        const matchedPhotoIds = vectorIndex.search(probeDescriptor, 20, 0.6);

        if (!matchedPhotoIds || matchedPhotoIds.length === 0) {
          return res.json({ 
            success: false,
            faceFound: true,
            roomFound: false,
            message: "Face found but no matching photos in our gallery. Please try again or use room number search."
          });
        }

        // 3. Get the matched photos with album info
        const placeholders = matchedPhotoIds.map(() => "?").join(",");
        const matchedPhotos = dbManager.query(
          `SELECT p.*, a.roomNumber, a.title as albumTitle, a.id as albumId
           FROM photos p 
           JOIN albums a ON p.albumId = a.id 
           WHERE p.id IN (${placeholders})`,
          matchedPhotoIds,
        );

        // 4. Determine the most likely room number (majority vote from top matches)
        const roomCounts: Record<string, { count: number; photos: any[]; albumId: string }> = {};
        
        matchedPhotos.forEach((photo: any) => {
          const room = photo.roomNumber || "unknown";
          if (!roomCounts[room]) {
            roomCounts[room] = { count: 0, photos: [], albumId: photo.albumId };
          }
          roomCounts[room].count++;
          roomCounts[room].photos.push(photo);
        });

        // Find room with most matches
        let bestRoom = "";
        let bestRoomData = null;
        let maxCount = 0;

        for (const [room, data] of Object.entries(roomCounts)) {
          if (data.count > maxCount && room !== "unknown") {
            maxCount = data.count;
            bestRoom = room;
            bestRoomData = data;
          }
        }

        if (!bestRoom || bestRoom === "unknown") {
          return res.json({
            success: false,
            faceFound: true,
            roomFound: false,
            message: "Face recognized but could not determine room number. Please use room number search."
          });
        }

        // 5. Fetch ALL photos from the identified room (all albums with this room number)
        const roomAlbums = dbManager.query(
          `SELECT * FROM albums WHERE roomNumber = ? AND kiosk_ready = 1`,
          [bestRoom]
        );

        const allRoomPhotos: any[] = [];
        for (const album of roomAlbums) {
          const albumPhotos = dbManager.query(
            `SELECT p.*, a.roomNumber, a.title as albumTitle 
             FROM photos p 
             JOIN albums a ON p.albumId = a.id 
             WHERE p.albumId = ?`,
            [album.id]
          );
          allRoomPhotos.push(...albumPhotos);
        }

        logger.info(`[FaceSearch] Room ${bestRoom} identified with ${maxCount} face matches, returning ${allRoomPhotos.length} total photos`);

        res.json({
          success: true,
          faceFound: true,
          roomFound: true,
          roomNumber: bestRoom,
          matchCount: maxCount,
          matchedFacePhotos: matchedPhotos.slice(0, 5), // Top 5 face matches for display
          allRoomPhotos: allRoomPhotos, // All photos from the room
          albumCount: roomAlbums.length,
          totalPhotos: allRoomPhotos.length,
          message: `Welcome! We found ${allRoomPhotos.length} photos from Room ${bestRoom}.`
        });

      } catch (error: any) {
        logger.error("[FaceSearch] Error in search-by-face", error);
        sendInternalError(res, error.message);
      } finally {
        try {
          fs.unlinkSync(file.filepath);
        } catch (e: any) {
          logger.warn(`Failed to cleanup temp file ${file.filepath}:`, {
            error: e.message,
          });
        }
      }
    });
  });

  return router;
}
