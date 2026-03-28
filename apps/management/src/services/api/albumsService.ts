/**
 * Albums Service
 * Handles album-related CRUD operations
 */

import { pb } from "../pb";
import { Album, AlbumStatus } from "../../types";
import { PocketRecord } from "../pbTypes";

export const albumsService = {
  async getAlbums(): Promise<Album[]> {
    const records = await pb.collection("albums").getFullList();
    return records.map((r: PocketRecord) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      coverPhotoId: r.coverPhotoId,
      status: r.status as AlbumStatus,
      photographerId: r.photographerId,
      orderId: r.orderId,
      guestEmail: r.guestEmail,
      guestName: r.guestName,
      created: r.created,
      updated: r.updated,
    }));
  },

  async getAlbum(id: string): Promise<Album | null> {
    try {
      const r = await pb.collection("albums").getOne(id);
      return r as unknown as Album;
    } catch {
      return null;
    }
  },

  async createAlbum(data: Partial<Album>): Promise<Album> {
    const record = await pb.collection("albums").create(data);
    return record as unknown as Album;
  },

  async updateAlbum(id: string, data: Partial<Album>): Promise<Album> {
    const record = await pb.collection("albums").update(id, data);
    return record as unknown as Album;
  },

  async deleteAlbum(id: string): Promise<void> {
    await pb.collection("albums").delete(id);
  },

  async getAlbumsByStatus(status: AlbumStatus): Promise<Album[]> {
    const records = await pb.collection("albums").getList(1, 500, {
      filter: `status = "${status}"`,
    });
    return records.items as unknown as Album[];
  },

  async getAlbumsByPhotographer(photographerId: string): Promise<Album[]> {
    const records = await pb.collection("albums").getList(1, 500, {
      filter: `photographerId = "${photographerId}"`,
    });
    return records.items as unknown as Album[];
  },
};