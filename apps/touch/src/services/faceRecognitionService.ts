// @ts-nocheck
import { Photo } from "../types.ts";
import { logger } from "../utils/logger";
import { pb } from "./api/core";
import { apiService } from "./apiService";
import { aiClient } from "./aiClient";

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

export const faceRecognitionService = {
  isLoaded: true, // We don't load local models anymore, always ready via AI worker
  loadPromise: null as Promise<void> | null,

  async loadModels(): Promise<void> {
    return Promise.resolve();
  },

  async detectFace(imageBlob: Blob): Promise<boolean> {
    if (!imageBlob || imageBlob.size === 0) return false;

    try {
      const response = await aiClient.getFaceDescriptor(imageBlob);
      return response.success && !!response.descriptor;
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
   * Returns photos that match the scanned face using AI Worker vector matching
   */
  async searchFaces(imageBlob: Blob): Promise<Photo[]> {
    try {
      logger.info("[FaceRecognition] Computing face vector on Edge Worker...");
      
      const response = await aiClient.getFaceDescriptor(imageBlob);

      if (!response.success || !response.descriptor) {
        logger.warn("[FaceRecognition] No face detected on Edge Worker");
        return [];
      }

      logger.info("[FaceRecognition] Transmitting vector to Master...");
      const descriptorArray = response.descriptor;

      const fetchResponse = await fetch(`${pb.baseUrl}/api/faces/search-vector`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {})
        },
        body: JSON.stringify({ descriptor: descriptorArray }),
      });

      if (!fetchResponse.ok) {
        throw new Error(`Face vector search failed: ${fetchResponse.statusText}`);
      }

      const data = await fetchResponse.json();
      
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
