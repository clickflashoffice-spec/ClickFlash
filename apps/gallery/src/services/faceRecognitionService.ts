import { logger } from '@clickflash/logger';
/**
 * Face Recognition Service — Gallery
 *
 * Delegates face search to the master backend API.
 * Gallery runs as a CF Worker PWA and cannot run face-api.js locally,
 * so all recognition is server-side via master's /api/faces endpoints.
 */

import { Photo } from '../types.ts';

export interface IdentifiedUser {
  id: string;
  name: string;
  roomNumber: string;
}

/** Resolve the master API base URL from gallery config */
function getMasterBaseUrl(): string {
  // In kiosk/touch mode, master URL is stored in localStorage
  try {
    const settings = localStorage.getItem('connectionSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.masterUrl) return parsed.masterUrl;
      if (parsed.manualIp) return `http://${parsed.manualIp}:8090`;
    }
  } catch {
    // Ignore parse errors
  }

  // Fallback: same origin (gallery may be proxied behind master)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8090';
}

export const faceRecognitionService = {
  isLoaded: true, // No client-side models needed

  async loadModels(): Promise<void> {
    // No-op — face detection runs server-side on master
  },

  async detectFace(imageBlob: Blob): Promise<boolean> {
    if (!imageBlob || imageBlob.size === 0) return false;
    // Optimistic — let the server determine if a face is present
    return true;
  },

  async identifyUser(imageBlob: Blob): Promise<IdentifiedUser | null> {
    // Face login is restricted to staff via master's /api/faces/login
    // Gallery customers should use room number search instead
    logger.warn('[FaceRecognition] User identification is restricted to staff.');
    return null;
  },

  async findMatches(referencePhoto: Blob, allPhotos: Photo[]): Promise<Photo[]> {
    try {
      const baseUrl = getMasterBaseUrl();
      const formData = new FormData();
      formData.append('image', referencePhoto, 'face-search.jpg');

      const response = await fetch(`${baseUrl}/api/faces/search`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        logger.error(`[FaceRecognition] Search failed: ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (!data.faceFound || !data.matches || data.matches.length === 0) {
        return [];
      }

      // Map matched photo IDs to the local photo objects
      const matchedIds = new Set(data.matches.map((m: { id: string }) => m.id));
      const matched = allPhotos.filter((p) => matchedIds.has(p.id));

      // If we got full photo objects from master, prefer those
      if (matched.length > 0) return matched;

      // Otherwise return the server results directly
      return data.matches as Photo[];
    } catch (error) {
      logger.error('[FaceRecognition] Error searching faces:', error);
      return [];
    }
  },
};
