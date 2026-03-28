/**
 * Album Service
 *
 * Handles all CRUD operations for albums
 * Includes complex photo fetching and URL construction logic
 */

import { pb } from "../pb";
import { Album, Photo, ManualEdits } from "../../types";
import { PocketRecord, GetListResult, CollectionOptions } from "../pbTypes";
import { logger } from "../../utils/logger";

/**
 * Helper function to construct photo URL
 */
function constructPhotoUrl(
  photo: PocketRecord,
  baseUrl: string,
  tier: "original" | "preview" | "tiny" | "thumb" = "original",
): string {
  let fileName = (photo.url as string) || "";
  if (
    !fileName ||
    fileName.startsWith("http") ||
    fileName.startsWith("blob:")
  ) {
    return fileName;
  }

  const id = photo.id;
  const albumId = (photo.albumId as string) || "";

  // RULE 12: Structured Storage Construction
  // Original is in [albumId]/highres/
  // Thumbs/Previews are in [albumId]/thumbs/

  // Fix: If fileName is already a path (starts with /), return it as is or appended to baseUrl
  if (fileName.startsWith("/")) {
    let cleanPath = fileName;
    // If it starts with /uploads, strip it because /api/files maps to UPLOAD_DIR
    // request: /api/files/albums/123 -> UPLOAD_DIR/albums/123
    // db: /uploads/albums/123
    if (cleanPath.startsWith("/uploads/")) {
      cleanPath = cleanPath.substring(8); // remove /uploads
      // Ensure leading slash for next check? No, construct route.
      if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
    }

    // If it doesn't have /api/files, add it
    if (!cleanPath.startsWith("/api/files")) {
      cleanPath = `/api/files${cleanPath}`;
    }

    return cleanPath.startsWith("http") ? cleanPath : `${baseUrl}${cleanPath}`;
  }

  if (tier === "original") {
    // Fallback for older records or non-structured
    if (!fileName.includes("/")) {
      fileName = `${albumId}/highres/${fileName}`;
    }
    return `${baseUrl}/api/files/photos/${id}/${fileName}`;
  }

  // Determine extension from original
  const dotIndex = fileName.lastIndexOf(".");
  const ext = dotIndex !== -1 ? fileName.substring(dotIndex + 1) : "jpg";

  let tierFileName = "";
  if (tier === "tiny") {
    tierFileName = `${albumId}/thumbs/${id}_tiny.webp`;
  } else if (tier === "preview") {
    tierFileName = `${albumId}/thumbs/${id}_preview.${ext}`;
  } else if (tier === "thumb") {
    tierFileName = `${albumId}/thumbs/${id}_thumb.${ext}`;
  }

  return `${baseUrl}/api/files/photos/${id}/${tierFileName}`;
}

/**
 * Helper function to parse manualEdits safely
 */
function parseManualEdits(p: PocketRecord): ManualEdits | undefined {
  let manualEdits: ManualEdits | undefined = undefined;
  try {
    if (typeof p.manualEdits === "string" && p.manualEdits) {
      const parsed = JSON.parse(p.manualEdits);
      manualEdits =
        parsed != null && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as ManualEdits)
          : undefined;
    } else if (
      p.manualEdits != null &&
      typeof p.manualEdits === "object" &&
      !Array.isArray(p.manualEdits)
    ) {
      manualEdits = p.manualEdits as ManualEdits;
    }
  } catch (parseError) {
    logger.warn("Failed to parse manualEdits for photo", {
      photoId: p.id,
      error: parseError,
    });
    manualEdits = undefined;
  }
  return manualEdits;
}

/**
 * Helper function to parse categories safely
 */
function parseCategories(record: PocketRecord): string[] {
  let categories: string[] = [];
  try {
    if (typeof record.categories === "string" && record.categories) {
      const parsed = JSON.parse(record.categories);
      categories = Array.isArray(parsed) ? parsed.map((c) => String(c)) : [];
    } else if (Array.isArray(record.categories)) {
      categories = record.categories.map((c) => String(c));
    }
  } catch (parseError) {
    logger.warn("Failed to parse categories for album", {
      albumId: record.id,
      error: parseError,
    });
    categories = [];
  }
  return categories;
}

/**
 * Helper function to transform photo record to Photo type
 */
function transformPhoto(p: PocketRecord, baseUrl: string): Photo {
  const photoUrl = constructPhotoUrl(p, baseUrl, "original");
  const manualEdits = parseManualEdits(p);

  return {
    id: p.id,
    albumId: (p.albumId as string) || "",
    title: (p.title as string) || "",
    url: photoUrl,
    originalUrl: photoUrl,
    photographerId: (p.photographerId as string) || "",
    category: (p.category as string) || undefined,
    manualEdits: manualEdits,
    // Helper to get tiered URLs (3-tier system: thumbnail, preview, full)
    thumbnailUrl: constructPhotoUrl(p, baseUrl, "thumb"),
    previewUrl: constructPhotoUrl(p, baseUrl, "preview"),
  };
}

/**
 * Helper function to transform album record to Album type
 */
function transformAlbum(r: PocketRecord, baseUrl: string): Album {
  let coverPhotoUrl = (r.coverPhotoUrl as string) || "";

  // Fix coverPhotoUrl to be a proper API URL
  if (
    coverPhotoUrl &&
    !coverPhotoUrl.startsWith("http") &&
    !coverPhotoUrl.startsWith("blob:")
  ) {
    if (coverPhotoUrl.startsWith("/uploads/")) {
      // Convert /uploads/... to /api/files/... format
      // The file route expects: /api/files/{collection}/{recordId}/{...path}
      // coverPhotoUrl is stored as: /uploads/{albumId}/highres/{filename}
      const cleanPath = coverPhotoUrl.replace("/uploads/", "");
      coverPhotoUrl = `${baseUrl}/api/files/albums/${r.id}/${cleanPath}`;
    } else if (coverPhotoUrl.startsWith("/")) {
      // Other root-relative paths - prepend baseUrl
      coverPhotoUrl = `${baseUrl}${coverPhotoUrl}`.replace(
        /([^:])\/\//g,
        "$1/",
      );
    } else {
      // Relative path without leading slash
      coverPhotoUrl = `${baseUrl}/api/files/albums/${r.id}/${coverPhotoUrl}`;
    }
  }

  // Handle expanded photos from backend (photos_via_album)
  let photos: Photo[] = [];
  const expand = r.expand as Record<string, unknown> | undefined;
  if (expand?.photos_via_album && Array.isArray(expand.photos_via_album)) {
    photos = expand.photos_via_album.map((p) =>
      transformPhoto(p as PocketRecord, baseUrl),
    );
  }

  return {
    id: r.id || "",
    title: (r.title as string) || "",
    date: (r.date as string) || "",
    photographerId: r.photographerId != null ? String(r.photographerId) : "",
    coverPhotoUrl: coverPhotoUrl,
    thumbnailUrl: coverPhotoUrl, // Default to coverPhotoUrl if thumbnail is not explicitly set
    source: (r.source as string) || "",
    roomNumber: (r.roomNumber as string) || "",
    status: (r.status as string) || "",
    customerEmail: (r.customerEmail as string) || "",
    categories: parseCategories(r),
    photos: photos,
    numberOfPhotos: photos.length || 0,
  } as Album;
}

export const albumService = {
  /**
   * Get all albums (metadata only for performance)
   */
  async getAlbums(): Promise<Album[]> {
    try {
      const records = await pb.collection("albums").getFullList({
        sort: "-created",
        // Expand photos to get cover images and photo counts
        expand: "photos_via_album",
      });

      if (!Array.isArray(records)) {
        logger.warn("getAlbums: records is not an array", { records });
        return [];
      }

      const baseUrl = pb.baseUrlValue;
      return records.map((r: PocketRecord) => transformAlbum(r, baseUrl));
    } catch (error) {
      logger.error("getAlbums: Error fetching albums", error);
      return [];
    }
  },

  /**
   * Get albums with pagination
   */
  async getAlbumsPaginated(
    page: number = 1,
    perPage: number = 50,
    sort: string = "-created",
    filter: string = "",
  ): Promise<GetListResult<Album>> {
    try {
      // Enforce max page size (Security)
      const safePerPage = Math.min(Math.max(1, perPage), 100);

      const options: CollectionOptions = {
        sort: sort,
        // Expand photos to get cover images and photo counts
        expand: "photos_via_album",
      };

      if (filter) {
        options.filter = filter;
      }

      const result = await pb
        .collection("albums")
        .getList(page, safePerPage, options);

      const baseUrl = pb.baseUrlValue;

      return {
        items: result.items.map((r: PocketRecord) =>
          transformAlbum(r, baseUrl),
        ),
        totalItems: result.totalItems,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
      };
    } catch (error) {
      logger.error("getAlbumsPaginated: Error", error);
      return {
        items: [],
        totalItems: 0,
        page: 1,
        perPage: perPage,
        totalPages: 0,
      };
    }
  },

  /**
   * Get a single album by ID
   */
  async getAlbum(id: string): Promise<Album | null> {
    try {
      const baseUrl = pb.baseUrlValue;

      // Fetch album with expanded photos
      let record: PocketRecord;
      try {
        record = (await pb
          .collection("albums")
          .getOne(id, { expand: "photos_via_albumId" })) as PocketRecord;
      } catch (expandError) {
        // Fallback: get album without expand, then fetch photos separately
        logger.warn(
          "Failed to expand photos, fetching separately",
          expandError,
        );
        record = (await pb.collection("albums").getOne(id)) as PocketRecord;

        // Fetch photos separately
        const photos = await this.getPhotosForAlbum(id);
        record.expand = {
          photos_via_albumId: photos as unknown as Record<string, unknown>[],
        };
      }

      if (!record) return null;

      const album = transformAlbum(record, baseUrl);

      // Ensure photos array is populated
      if (!album.photos || album.photos.length === 0) {
        // Try to get photos from expand
        const expandedPhotos = (record as unknown as Record<string, unknown>)
          .expand?.photos_via_albumId;
        if (Array.isArray(expandedPhotos)) {
          album.photos = expandedPhotos.map((p) =>
            transformPhoto(p as PocketRecord, baseUrl),
          );
        }
      }

      return album;
    } catch (error) {
      logger.error("getAlbum: Error fetching album", error);
      return null;
    }
  },

  /**
   * Get photos for an album
   */
  async getPhotosForAlbum(albumId: string): Promise<Photo[]> {
    try {
      const baseUrl = pb.baseUrlValue;
      const records = await pb.collection("photos").getFullList({
        filter: `albumId="${albumId}"`,
        sort: "created",
      });

      return records.map((p: PocketRecord) => transformPhoto(p, baseUrl));
    } catch (error) {
      logger.error("getPhotosForAlbum: Error", error);
      return [];
    }
  },

  /**
   * Create a new album
   */
  async createAlbum(data: Partial<Album>): Promise<Album> {
    try {
      // Optimistic ID
      const optimisticId = crypto.randomUUID();

      const payload = {
        ...data,
        id: optimisticId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const record = (await pb
        .collection("albums")
        .create(payload)) as PocketRecord;

      const baseUrl = pb.baseUrlValue;
      return transformAlbum(record, baseUrl);
    } catch (error) {
      logger.error("createAlbum: Error", error);
      throw error instanceof Error
        ? error
        : new Error("Unknown error creating album");
    }
  },

  /**
   * Update an existing album
   */
  async updateAlbum(
    id: string,
    data: Partial<Album>,
  ): Promise<{ success: boolean; album?: Album; error?: string }> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // Delete photos from payload (not part of album record)
      delete (updateData as Partial<Album> & { photos?: unknown }).photos;

      const record = (await pb
        .collection("albums")
        .update(id, updateData)) as PocketRecord;

      const baseUrl = pb.baseUrlValue;
      return { success: true, album: transformAlbum(record, baseUrl) };
    } catch (error) {
      logger.error("updateAlbum: Error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Delete an album
   */
  async deleteAlbum(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await pb.collection("albums").delete(id);
      return { success: true };
    } catch (error) {
      logger.error("deleteAlbum: Error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Duplicate an album (metadata only, not photos)
   */
  async duplicateAlbum(
    album: Album,
  ): Promise<{ success: boolean; album?: Album; error?: string }> {
    try {
      const { id: _, ...albumData } = album;
      const newId = crypto.randomUUID();

      const payload = {
        ...albumData,
        id: newId,
        title: `${albumData.title} (Copy)`,
        status: "Draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Remove photos array (not part of album record)
      delete (payload as Partial<Album> & { photos?: unknown }).photos;

      const record = (await pb
        .collection("albums")
        .create(payload)) as PocketRecord;

      const baseUrl = pb.baseUrlValue;
      return { success: true, album: transformAlbum(record, baseUrl) };
    } catch (error) {
      logger.error("duplicateAlbum: Error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Batch update photos
   */
  async batchUpdatePhotos(
    updates: { id: string; category?: string; photographerId?: string }[],
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Process sequentially to avoid race conditions
      for (const update of updates) {
        const { id, ...data } = update;
        const pbData = { ...data, updated_at: new Date().toISOString() };
        await pb.collection("photos").update(update.id, pbData);
      }
      return { success: true };
    } catch (error) {
      logger.error("batchUpdatePhotos: Error", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Search albums by query string
   */
  async searchAlbums(query: string): Promise<Album[]> {
    try {
      const filter = `title~"${query}"`;
      const records = await pb.collection("albums").getFullList({
        filter,
        sort: "-created",
      });

      const baseUrl = pb.baseUrlValue;
      return records.map((r: PocketRecord) => transformAlbum(r, baseUrl));
    } catch (error) {
      logger.error("searchAlbums: Error", error);
      return [];
    }
  },
};
