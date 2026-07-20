// @ts-nocheck
import express, { Request, Response, Router, NextFunction } from "express";
import formidable from "formidable";
import path from "path";
import fs from "fs";
import {
  sendValidationError,
  sendInvalidInputError,
  sendInternalError,
  sendAuthError,
  sendAuthorizationError,
} from '../utils/errorHandler';
import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import { UPLOAD_DIR } from "../config/constants";
import { faceService } from "../services/faceService";
import { VectorIndexService } from "../services/VectorIndexService";

import jwt from "jsonwebtoken";
import AuditLogger from '../utils/auditLogger';
import { authMiddleware } from "../middleware/auth";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";
import { strictRateLimiter } from '../middleware/rateLimiter';

interface FacesContext {
  logger: Logger;
  dbManager: DatabaseManager;
  auditLogger?: AuditLogger;
  JWT_SECRET?: string;
  vectorIndex: VectorIndexService;
}

export default function faceRoutes(context: FacesContext): Router {
  const { logger, dbManager, auditLogger, JWT_SECRET, vectorIndex } = context;
  const router = express.Router();

  // Helper to euclidean distance
  const euclideanDistance = (desc1: Float32Array, desc2: Float32Array) => {
    return Math.sqrt(
      desc1.reduce(
        (sum, val, i) => sum + Math.pow(val - (desc2[i] || 0), 2),
        0,
      ),
    );
  };

  const _auth = (req: Request, res: Response, next: NextFunction) => {
    authMiddleware(req, res, next, auditLogger);
  };

  const STAFF_ROLES = [
    "Admin",
    "Photographer",
    "Manager",
    "CEO",
    "Team Leader",
  ];

  /**
   * @route POST /login
   * @description Login with Face
   */
  router.post("/login", strictRateLimiter, (req: Request, res: Response) => {
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
        // 1. Get Descriptor
        const probeDescriptor = await faceService.getDescriptor(file.filepath);
        if (!probeDescriptor)
          return sendValidationError(res, "No face detected");

        // 2. Search using Vector Index
        const descriptorArray = Array.from(probeDescriptor);
        const matchedPhotoIds = vectorIndex.search(descriptorArray, 1, 0.5); // Stricter for login

        let matchedUser: any = null;
        if (matchedPhotoIds.length > 0) {
          // Find the user with this face descriptor
          // Note: Here we might need a way to link faceId to userId
          // or just search users directly if faceDescriptor is stored on users.
          // The existing logic searches the `users` table directly.

          const users = dbManager.query<{
            id: string;
            email: string;
            role: string;
            name: string;
            faceDescriptor: string;
          }>(
            "SELECT id, email, role, name, faceDescriptor FROM users WHERE faceDescriptor IS NOT NULL",
          );

          for (const user of users) {
            try {
              const storedDesc = new Float32Array(
                JSON.parse(user.faceDescriptor),
              );
              const distance = euclideanDistance(probeDescriptor, storedDesc);
              if (distance < 0.5) {
                matchedUser = user;
                break;
              }
            } catch (e) {
              logger.warn("Failed to parse user face descriptor:", {
                userId: user.id,
              });
            }
          }
        }

        if (!matchedUser) {
          // Audit failure?
          return sendValidationError(res, "Face not recognized");
        }

        // 2.5 Verify Role (Staff Only) - Phase 36 Requirement
        if (!STAFF_ROLES.includes(matchedUser.role)) {
          logger.warn("Face login attempted by non-staff user", {
            userId: matchedUser.id,
            role: matchedUser.role,
            email: matchedUser.email,
          });
          return sendAuthError(
            res,
            "Face recognition is restricted to staff only.",
          );
        }

        // 3. Login Success
        const session = req.session;
        if (session) {
          session.user = {
            id: matchedUser.id,
            email: matchedUser.email,
            role: matchedUser.role,
            name: matchedUser.name,
          };
        }

        const token = jwt.sign(
          {
            id: matchedUser.id,
            email: matchedUser.email,
            role: matchedUser.role,
          },
          JWT_SECRET || "secret",
          { expiresIn: "7d" },
        );

        if (auditLogger)
          auditLogger.logLoginAttempt(
            matchedUser.email,
            true,
            req.socket.remoteAddress || "unknown",
            "FACE_LOGIN",
          );

        res.json({
          success: true,
          user: {
            id: matchedUser.id,
            email: matchedUser.email,
            role: matchedUser.role,
            name: matchedUser.name,
          },
          token,
        });
      } catch (error: any) {
        logger.error("Face login error", error);
        sendInternalError(res, error.message);
      } finally {
        try {
          fs.unlinkSync(file.filepath);
        } catch (e) {
          logger.warn(`Failed to cleanup temp file ${file.filepath}:`, {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    });
  });

  /**
   * @route POST /register
   * @description Register face for current user or a targeted user (Admin/Team Leader only)
   */
  router.post("/register", strictRateLimiter, requirePermission(PERMISSIONS.PHOTO_VIEW), (req: Request, res: Response) => {
    const sessionUser = req.session ? req.session.user : null;
    if (!sessionUser) return sendAuthError(res, "Not authenticated");

    const form = formidable({
      uploadDir: path.join(UPLOAD_DIR, "temp"),
      keepExtensions: true,
    });

    const tempDir = path.join(UPLOAD_DIR, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    form.parse(req, async (err, fields, files) => {
      if (err) return sendInternalError(res, `Upload failed: ${err.message}`);

      const file = Array.isArray(files.image) ? files.image[0] : files.image;
      if (!file) return sendInvalidInputError(res, "No image file uploaded");

      const targetUserIdField = fields.userId;
      const targetUserId = Array.isArray(targetUserIdField) ? targetUserIdField[0] : targetUserIdField;
      
      let enrollmentUserId = sessionUser.id;

      // Rule: Only Admin or Team Leader can enroll faces for others
      if (targetUserId && targetUserId !== sessionUser.id) {
        const canManageOthers = sessionUser.role === "Admin" || sessionUser.role === "Team Leader";
        if (!canManageOthers) {
          return sendAuthorizationError(res, "Insufficient permissions to enroll face for another user");
        }
        enrollmentUserId = targetUserId;
      }

      try {
        const descriptor = await faceService.getDescriptor(file.filepath);
        if (!descriptor) return sendValidationError(res, "No face detected");

        // Update User
        dbManager.run("UPDATE users SET faceDescriptor = ? WHERE id = ?", [
          JSON.stringify(Array.from(descriptor)),
          enrollmentUserId,
        ]);

        logger.info(`Registered face for user ID: ${enrollmentUserId} (by ${sessionUser.email})`);
        res.json({ success: true, message: "Face registered successfully" });
      } catch (error: any) {
        logger.error("Face registration error", error);
        sendInternalError(res, error.message);
      } finally {
        try {
          fs.unlinkSync(file.filepath);
        } catch (e) {
          logger.warn(`Failed to cleanup temp file ${file.filepath}:`, {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    });
  });

  /**
   * @route POST /search
   * @description Search for photos matching the uploaded face
   * @access Staff Only
   */
  router.post("/search", requirePermission(PERMISSIONS.PHOTO_VIEW), strictRateLimiter, (req: Request, res: Response) => {
    const form = formidable({
      uploadDir: path.join(UPLOAD_DIR, "temp"),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    // Ensure temp dir exists
    const tempDir = path.join(UPLOAD_DIR, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    form.parse(req, async (err, _fields, files) => {
      if (err) {
        return sendInternalError(res, `Upload failed: ${err.message}`);
      }

      const file = Array.isArray(files.image) ? files.image[0] : files.image;
      if (!file) {
        return sendInvalidInputError(res, "No image file uploaded");
      }

      try {
        // 1. Get descriptor for probe image
        const probeDescriptor = await faceService.getDescriptor(file.filepath);

        if (!probeDescriptor) {
          return sendValidationError(res, "No face detected in the image");
        }

        // 2. Search using Vector Index
        const descriptorArray = Array.from(probeDescriptor);
        const matchedPhotoIds = vectorIndex.search(descriptorArray, 50);

        if (!matchedPhotoIds || matchedPhotoIds.length === 0) {
          return res.json({ matches: [] });
        }

        // 3. Fetch Photo Details
        const photos: any[] = [];
        const chunkSize = 500;
        for (let i = 0; i < matchedPhotoIds.length; i += chunkSize) {
          const chunk = matchedPhotoIds.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => "?").join(",");
          photos.push(
            ...dbManager.query(
              `SELECT * FROM photos WHERE id IN (${placeholders})`,
              chunk
            )
          );
        }

        res.json({ matches: photos });
      } catch (error: any) {
        logger.error("Face search error", error);
        sendInternalError(res, error.message);
      } finally {
        // Cleanup temp file
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
   * @route POST /search-vector
   * @description Search for photos using a pre-computed 128D face descriptor (Edge AI optimized)
   * @access Staff Only
   */
  router.post("/search-vector", requirePermission(PERMISSIONS.PHOTO_VIEW), strictRateLimiter, express.json(), (req: Request, res: Response) => {
    try {
      const { descriptor } = req.body;
      
      if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
        return sendInvalidInputError(res, "Invalid or missing 128D face descriptor");
      }

      // Search using Vector Index
      const matchedPhotoIds = vectorIndex.search(descriptor, 50);

      if (!matchedPhotoIds || matchedPhotoIds.length === 0) {
        return res.json({ matches: [] });
      }

      // Fetch Photo Details
      const photos: any[] = [];
      const chunkSize = 500;
      for (let i = 0; i < matchedPhotoIds.length; i += chunkSize) {
        const chunk = matchedPhotoIds.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => "?").join(",");
        photos.push(
          ...dbManager.query(
            `SELECT * FROM photos WHERE id IN (${placeholders})`,
            chunk
          )
        );
      }

      res.json({ matches: photos });
    } catch (error: any) {
      logger.error("Face vector search error", error);
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route POST /consumer-search
   * @description Public FaceFind search for customers
   * @access Public
   */
  router.post("/consumer-search", strictRateLimiter, (req: Request, res: Response) => {
    const form = formidable({
      uploadDir: path.join(UPLOAD_DIR, "temp"),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    // Ensure temp dir exists
    const tempDir = path.join(UPLOAD_DIR, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    form.parse(req, async (err, _fields, files) => {
      if (err) {
        return sendInternalError(res, `Upload failed: ${err.message}`);
      }

      const file = Array.isArray(files.image) ? files.image[0] : files.image;
      if (!file) {
        return sendInvalidInputError(res, "No image file uploaded");
      }

      try {
        // 1. Get descriptor for probe image
        const probeDescriptor = await faceService.getDescriptor(file.filepath);

        if (!probeDescriptor) {
          return sendValidationError(res, "No face detected in the image");
        }

        // 2. Search using Vector Index
        const descriptorArray = Array.from(probeDescriptor);
        const matchedPhotoIds = vectorIndex.search(descriptorArray, 100, 0.6); // more lenient for consumer?

        if (!matchedPhotoIds || matchedPhotoIds.length === 0) {
          return res.json({ matches: [] });
        }

        // 3. Fetch Photo Details
        const photos: any[] = [];
        const chunkSize = 500;
        for (let i = 0; i < matchedPhotoIds.length; i += chunkSize) {
          const chunk = matchedPhotoIds.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => "?").join(",");
          photos.push(
            ...dbManager.query(
              `SELECT id, url, originalFilename, albumId, roomNumber, createdAt, width, height, tier FROM photos WHERE id IN (${placeholders}) AND status = 'active'`,
              chunk
            )
          );
        }

        res.json({ matches: photos });
      } catch (error: any) {
        logger.error("Face consumer-search error", error);
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
   * @route POST /reindex
   * @description Re-scan all photos for faces (Admin)
   * @access Staff/Admin Only
   */
  router.post("/reindex", requirePermission(PERMISSIONS.SYSTEM_ADMIN), strictRateLimiter, async (_req: Request, res: Response) => {
    try {
      dbManager.run(`
                INSERT INTO face_indexing_queue (photoId, status)
                SELECT id, 'pending' FROM photos
            `);

      logger.info(`[FaceReindex] Queued all photos for reindexing.`);
      res.json({ success: true, message: "Reindexing queued successfully" });
    } catch (error: any) {
      logger.error("[FaceReindex] Error queuing:", error);
      sendInternalError(res, error.message);
    }
  });

  return router;
}
