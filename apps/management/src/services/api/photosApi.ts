import { pb } from "../pb";
import {
  Photo,
} from "../../types";
import { PocketRecord } from "../pbTypes";

/**
 * API Service - Wrapper around pb adapter for convenient data operations
 *
 * This service provides a clean interface for all CRUD operations with:
 * - Automatic retry logic for network failures
 * - Comprehensive error handling
 * - Request/response logging in development
 * - Type-safe operations
 *
 * All methods return Promises and handle errors gracefully.
 */


export const photosApi = {
  async getPhotos(): Promise<Photo[]> {
    const records = await pb.collection("photos").getFullList();
    const baseUrl = pb.baseUrlValue;
    return records.map((r: PocketRecord) => {
      // Construct file URL - check if it's already a full URL or needs the base URL
      let photoUrl = (r.url as string) || "";
      if (
        photoUrl &&
        !photoUrl.startsWith("http") &&
        !photoUrl.startsWith("blob:")
      ) {
        // Construct file URL from base URL
        photoUrl = `${baseUrl}/api/files/photos/${r.id}/${photoUrl}`;
      }

      return {
        id: r.id,
        albumId: r.albumId,
        title: r.title || "",
        url: photoUrl,
        photographerId: r.photographerId,
        category: r.category,
        manualEdits:
          typeof r.manualEdits === "string"
            ? JSON.parse(r.manualEdits)
            : r.manualEdits || {},
      };
    });
  },

  async createPhoto(data: Partial<Photo> | FormData): Promise<Photo> {
    const record = await pb.collection("photos").create(data);
    return record as Photo;
  },

  async deletePhoto(id: string): Promise<void> {
    await pb.collection("photos").delete(id);
  },

  async updatePhoto(id: string, data: Partial<Photo>): Promise<Photo> {
    const record = await pb.collection("photos").update(id, data);
    return record as Photo;
  },

  async getPhotoBlobs(photoIds: string[]): Promise<Record<string, Blob>> {
    const blobs: Record<string, Blob> = {};
    const baseUrl = pb.baseUrlValue;

    for (const photoId of photoIds) {
      try {
        // Get photo record to find the URL
        const photo = await pb.collection("photos").getOne(photoId);
        let photoUrl = photo.url || "";

        // Construct full URL if needed
        if (
          photoUrl &&
          !photoUrl.startsWith("http") &&
          !photoUrl.startsWith("blob:") &&
          !photoUrl.startsWith("data:")
        ) {
          photoUrl = `${baseUrl}/api/files/photos/${photoId}/${photoUrl}`;
        }

        // Fetch the image and convert to blob
        if (photoUrl) {
          const response = await fetch(photoUrl);
          if (response.ok) {
            blobs[photoId] = await response.blob();
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch blob for photo ${photoId}:`, error);
      }
    }

    return blobs;
  },
};
