/**
 * Photos Service
 * Handles photo-related operations
 */

import { pb } from "../pb";
import { Photo } from "../../types";

export const photosService = {
  async getPhotos(): Promise<Photo[]> {
    const records = await pb.collection("photos").getFullList();
    return records as unknown as Photo[];
  },

  async getPhoto(id: string): Promise<Photo | null> {
    try {
      const record = await pb.collection("photos").getOne(id);
      return record as unknown as Photo;
    } catch {
      return null;
    }
  },

  async createPhoto(data: Partial<Photo> | FormData): Promise<Photo> {
    const record = await pb.collection("photos").create(data);
    return record as unknown as Photo;
  },

  async updatePhoto(id: string, data: Partial<Photo>): Promise<Photo> {
    const record = await pb.collection("photos").update(id, data);
    return record as unknown as Photo;
  },

  async deletePhoto(id: string): Promise<void> {
    await pb.collection("photos").delete(id);
  },

  async getPhotosByAlbum(albumId: string): Promise<Photo[]> {
    const records = await pb.collection("photos").getList(1, 500, {
      filter: `albumId = "${albumId}"`,
    });
    return records.items as unknown as Photo[];
  },

  async getPhotoBlobs(photoIds: string[]): Promise<Record<string, Blob>> {
    const blobs: Record<string, Blob> = {};
    await Promise.all(
      photoIds.map(async (id) => {
        try {
          const record = await pb.collection("photos").getOne(id);
          const response = await pb.files.getUrl(record, record.file);
          const blob = await fetch(response).then((r) => r.blob());
          blobs[id] = blob;
        } catch (e) {
          console.error(`Failed to fetch photo ${id}:`, e);
        }
      })
    );
    return blobs;
  },
};