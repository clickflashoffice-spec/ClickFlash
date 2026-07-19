// @ts-nocheck
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
        logger.info("[FaceRecognition] Loading Edge AI models...");
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

        this.isLoaded = true;
        logger.info("[FaceRecognition] Edge AI models loaded successfully");
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
   * Returns photos that match the scanned face using sub-2-second Edge AI mapping
   */
  async searchFaces(imageBlob: Blob): Promise<Photo[]> {
    try {
      logger.info("[FaceRecognition] Computing face vector on Edge...");
      
      if (!this.isLoaded) await this.loadModels();
      const img = await faceapi.bufferToImage(imageBlob);
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        logger.warn("[FaceRecognition] No face detected on Edge");
        return [];
      }

      logger.info("[FaceRecognition] Transmitting 128D vector to Master...");
      const descriptorArray = Array.from(detection.descriptor);

      const response = await fetch(`${pb.baseUrl}/api/faces/search-vector`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {})
        },
        body: JSON.stringify({ descriptor: descriptorArray }),
      });

      if (!response.ok) {
        throw new Error(`Face vector search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.matches || data.matches.length === 0) {
        return [];
      }

      logger.info(`[FaceRecognition] Found ${data.matches.length} matching photos via Vector index`);
      return data.matches as Photo[];
    } catch (error) {
      logger.error(
        "[FaceRecognition] Error in Edge AI vector search",
        error instanceof Error ? error : undefined,
      );
      return [];
    }
  },

  /**
   * Complete face search flow:
   * 1. Scan face & Compute Edge Vector
   * 2. Query Master via Vector Search
   * 3. Return Matches
   */
  async searchByFace(imageBlob: Blob): Promise<FaceSearchResult> {
    try {
      logger.info("[FaceRecognition] Starting complete Edge AI face search flow...");
      
      const matchedPhotos = await this.searchFaces(imageBlob);
      
      const faceFound = matchedPhotos.length > 0;
      const roomNumber = faceFound && matchedPhotos[0].roomNumber ? matchedPhotos[0].roomNumber : null;
      const roomFound = !!roomNumber;

      const result: FaceSearchResult = {
        success: true,
        faceFound,
        roomFound,
        roomNumber,
        matchCount: matchedPhotos.length,
        matchedFacePhotos: matchedPhotos,
        allRoomPhotos: matchedPhotos, // Assuming we only show matched photos in this flow for speed
        albumCount: new Set(matchedPhotos.map(p => p.albumId)).size,
        totalPhotos: matchedPhotos.length,
        message: faceFound ? "Matches found via Edge AI." : "No matches found."
      };

      logger.info(
        `[FaceRecognition] Edge AI search result: success=${result.success}, ` +
        `faceFound=${result.faceFound}, matches=${result.matchCount}`
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
    logger.warn(
      "[FaceRecognition] findMatches is deprecated. Use searchFaces or searchByFace instead.",
    );
    return this.searchFaces(referencePhoto);
  },
};
