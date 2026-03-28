import * as faceapi from "@vladmandic/face-api";
import { Photo } from "../types.ts";
import { logger } from "../utils/logger";
import { pb } from "./api/core";
import { apiService } from "./apiService";

export interface IdentifiedUser {
  id: string;
  name: string;
  roomNumber: string;
}

export interface FaceSearchResult {
  success: boolean;
  faceFound: boolean;
  roomFound: boolean;
  roomNumber: string | null;
  matchCount: number;
  matchedFacePhotos: Photo[];
  allRoomPhotos: Photo[];
  albumCount: number;
  totalPhotos: number;
  message: string;
}

// Configuration for face-api (Client-side detection only)
const MODEL_URL = "/models";

export const faceRecognitionService = {
  isLoaded: false,
  loadPromise: null as Promise<void> | null,

  async loadModels(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        logger.info("[FaceRecognition] Loading detection models...");
        // Only load detection models, not recognition (saves memory on Touch)
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        // Landmarks needed for alignment? Yes usually.
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        // We DON'T need faceRecognitionNet on client anymore!

        this.isLoaded = true;
        logger.info("[FaceRecognition] Models loaded successfully");
      } catch (error) {
        logger.error(
          "[FaceRecognition] Failed to load models",
          error instanceof Error ? error : undefined,
        );
        throw error;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  },

  async detectFace(imageBlob: Blob): Promise<boolean> {
    if (!imageBlob || imageBlob.size === 0) return false;

    try {
      if (!this.isLoaded) await this.loadModels();

      const img = await faceapi.bufferToImage(imageBlob);
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks();

      // We don't need descriptor here, just presence
      return !!detection;
    } catch (error) {
      logger.error(
        "[FaceRecognition] Error in face detection",
        error instanceof Error ? error : undefined,
      );
      return false;
    }
  },

  /**
   * Search for faces in the local photo database
   * Returns photos that match the scanned face
   */
  async searchFaces(imageBlob: Blob): Promise<Photo[]> {
    try {
      logger.info("[FaceRecognition] Searching for matching faces...");
      
      // Use the backend API to search for faces
      const formData = new FormData();
      formData.append("image", imageBlob, "face-search.jpg");

      const response = await fetch("/api/faces/search", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Face search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.faceFound || !data.matches) {
        return [];
      }

      logger.info(`[FaceRecognition] Found ${data.matches.length} matching photos`);
      return data.matches as Photo[];
    } catch (error) {
      logger.error(
        "[FaceRecognition] Error searching faces",
        error instanceof Error ? error : undefined,
      );
      return [];
    }
  },

  /**
   * Complete face search flow:
   * 1. Scan face
   * 2. Find matching face in photos
   * 3. Get room number from matched photo
   * 4. Return all photos from that room
   */
  async searchByFace(imageBlob: Blob): Promise<FaceSearchResult> {
    try {
      logger.info("[FaceRecognition] Starting complete face search flow...");
      
      // Use the backend API for the complete flow
      const formData = new FormData();
      formData.append("image", imageBlob, "face-search.jpg");

      const response = await fetch("/api/faces/search-by-face", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Face search failed: ${response.statusText}`);
      }

      const result: FaceSearchResult = await response.json();
      
      logger.info(
        `[FaceRecognition] Face search result: success=${result.success}, ` +
        `faceFound=${result.faceFound}, room=${result.roomNumber}, ` +
        `photos=${result.totalPhotos}`
      );

      return result;
    } catch (error) {
      logger.error(
        "[FaceRecognition] Error in searchByFace",
        error instanceof Error ? error : undefined,
      );
      return {
        success: false,
        faceFound: false,
        roomFound: false,
        roomNumber: null,
        matchCount: 0,
        matchedFacePhotos: [],
        allRoomPhotos: [],
        albumCount: 0,
        totalPhotos: 0,
        message: "An error occurred during face search. Please try again or use room number search."
      };
    }
  },

  async identifyUser(imageBlob: Blob): Promise<IdentifiedUser | null> {
    // Phase 36: User identification via face is now restricted to staff only.
    logger.warn(
      "[FaceRecognition] User identification via face is currently disabled for customers.",
    );
    return null;
  },

  // Deprecated / Unused client-side matching
  async findMatches(
    referencePhoto: Blob,
    allPhotos: Photo[],
  ): Promise<Photo[]> {
    console.warn(
      "[FaceRecognition] findMatches is deprecated. Use searchFaces or searchByFace instead.",
    );
    return this.searchFaces(referencePhoto);
  },
};
