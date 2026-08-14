import { apiService } from '../apiService';
import { pb } from "../pb";
import {
  Album,
  Photo,
  AlbumStatus,
} from "../../types";
import { PocketRecord } from "../pbTypes";
import { logger as appLogger } from "@/utils/logger";

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


export const albumsApi = {
  async getAlbums(): Promise<Album[]> {
    try {
      const records = await pb
        .collection("albums")
        .getFullList({ sort: "-created" });

      // Ensure records is an array before processing
      if (!Array.isArray(records)) {
        appLogger.warn("getAlbums: records is not an array", records);
        return [];
      }

      // Ensure records is not null/undefined
      if (records == null) {
        appLogger.warn("getAlbums: records is null or undefined");
        return [];
      }

      // Fetch photos for each album
      const albumsWithPhotos = await Promise.all(
        records
          .filter(
            (r: PocketRecord) =>
              r != null && typeof r === "object" && r.id != null,
          ) // Filter out invalid records
          .map(async (r: PocketRecord) => {
            let photos: Photo[] = [];
            let coverPhotoUrl = r.coverPhotoUrl || "";

            try {
              // Fetch photos for this album
              const photosList = await pb
                .collection("photos")
                .getFullList({ filter: `albumId="${r.id}"` });

              // Ensure photosList is an array before processing
              if (Array.isArray(photosList)) {
                photos = photosList
                  .filter(
                    (p: PocketRecord) =>
                      p != null && typeof p === "object" && p.id != null,
                  )
                  .map((p: PocketRecord) => {
                    // Construct file URL
                    let photoUrl = (p.url as string) || "";
                    if (
                      photoUrl &&
                      !photoUrl.startsWith("http") &&
                      !photoUrl.startsWith("blob:")
                    ) {
                      const baseUrl = pb.baseUrlValue;
                      photoUrl = `${baseUrl}/api/files/photos/${p.id}/${photoUrl}`;
                    }

                    // Safely parse manualEdits
                    let manualEdits: any = {};
                    try {
                      if (typeof p.manualEdits === "string" && p.manualEdits) {
                        const parsed = JSON.parse(p.manualEdits);
                        manualEdits =
                          parsed != null &&
                          typeof parsed === "object" &&
                          !Array.isArray(parsed)
                            ? parsed
                            : {};
                      } else if (
                        p.manualEdits != null &&
                        typeof p.manualEdits === "object" &&
                        !Array.isArray(p.manualEdits)
                      ) {
                        manualEdits = p.manualEdits;
                      }
                    } catch (parseError) {
                      appLogger.warn(
                        "Failed to parse manualEdits for photo",
                        p.id,
                        parseError,
                      );
                      manualEdits = {};
                    }

                    return {
                      id: p.id as string,
                      albumId: (p.albumId as string) || "",
                      title: (p.title as string) || "",
                      url: photoUrl,
                      photographerId: p.photographerId as string,
                      category: (p.category as string) || undefined,
                      manualEdits: manualEdits,
                    };
                  });
              }

              // Set cover photo from first photo if not already set
              if (!coverPhotoUrl && photos.length > 0 && photos[0]?.url) {
                coverPhotoUrl = photos[0].url as string;
              }
            } catch (photoError) {
              appLogger.warn(
                "Failed to fetch photos for album",
                r.id,
                photoError,
              );
              // Continue with empty photos array
            }

            // Safely parse categories
            let categories: any[] = [];
            try {
              if (typeof r.categories === "string" && r.categories) {
                const parsed = JSON.parse(r.categories);
                categories = Array.isArray(parsed) ? parsed : [];
              } else if (Array.isArray(r.categories)) {
                categories = r.categories;
              }
            } catch (parseError) {
              appLogger.warn(
                "Failed to parse categories for album",
                r.id,
                parseError,
              );
              categories = [];
            }

            return {
              id: (r.id as string) || "",
              title: (r.title as string) || "",
              date: (r.date as string) || "",
              photographerId:
                (r.photographerId != null ? (r.photographerId as string) : "") as string | number,
              coverPhotoUrl: coverPhotoUrl as string,
              source: (r.source as string) || "",
              roomNumber: (r.roomNumber as string) || "",
              status: r.status as AlbumStatus,
              categories: categories,
              photos: photos,
            };
          }),
      );

      // Ensure result is an array
      if (!Array.isArray(albumsWithPhotos)) {
        appLogger.warn(
          "getAlbums: albumsWithPhotos is not an array",
          albumsWithPhotos,
        );
        return [];
      }

      return albumsWithPhotos;
    } catch (error) {
      appLogger.error("getAlbums: Error fetching albums", error);
      // Return empty array on any error to prevent crashes
      return [];
    }
  },

  async getAlbum(id: string): Promise<Album | null> {
    try {
      // Fetch album with expanded photos
      const record = (await pb
        .collection("albums")
        .getOne(id, { expand: "photos_via_album" })) as any;

      // Explicit null check - return early if record is null/undefined
      if (!record || typeof record !== "object") {
        appLogger.warn("Album not found or invalid record returned", {
          albumId: id,
        });
        return null;
      }

      // Fetch photos separately
      let photos: Photo[] = [];
      try {
        const photosList = await pb
          .collection("photos")
          .getFullList({ filter: `albumId="${id}"` });

        // Ensure photosList is an array before processing
        if (Array.isArray(photosList)) {
          photos = photosList
            .filter((p: any) => p != null && p.id != null)
            .map((p: any) => {
              let photoUrl = p.url || "";
              if (
                photoUrl &&
                !photoUrl.startsWith("http") &&
                !photoUrl.startsWith("blob:")
              ) {
                const baseUrlValue = pb.baseUrlValue;
                photoUrl = `${baseUrlValue}/api/files/photos/${p.id}/${photoUrl}`;
              }

              let manualEdits: any = {};
              try {
                if (typeof p.manualEdits === "string" && p.manualEdits) {
                  const parsed = JSON.parse(p.manualEdits);
                  manualEdits =
                    parsed != null && typeof parsed === "object" ? parsed : {};
                } else if (
                  p.manualEdits != null &&
                  typeof p.manualEdits === "object"
                ) {
                  manualEdits = p.manualEdits;
                }
              } catch (e) {
                manualEdits = {};
              }

              return {
                id: p.id as string,
                albumId: (p.albumId as string) || "",
                title: (p.title as string) || "",
                url: photoUrl,
                photographerId: p.photographerId as string,
                category: (p.category as string) || undefined,
                manualEdits: manualEdits,
              };
            });
        } else {
          appLogger.warn(
            "getAlbum: photosList is not an array for album",
            id,
            photosList,
          );
          photos = [];
        }
      } catch (photoError) {
        appLogger.warn("Failed to fetch photos for album", photoError);
        // Try to get photos from expand if available
        if (
          record &&
          record.expand &&
          typeof record.expand === "object" &&
          record.expand.photos_via_album
        ) {
          const expandedPhotos = record.expand.photos_via_album;
          if (Array.isArray(expandedPhotos)) {
            photos = expandedPhotos
              .filter((p: any) => p != null && p.id != null) // Filter out null/undefined records
              .map((p: any) => {
                let photoUrl = p.url || "";
                if (
                  photoUrl &&
                  !photoUrl.startsWith("http") &&
                  !photoUrl.startsWith("blob:")
                ) {
                  const baseUrl = pb.baseUrlValue;
                  photoUrl = `${baseUrl}/api/files/photos/${p.id}/${p.url}`;
                }

                // Safely parse manualEdits - ensure it's always an object, never null
                let manualEdits: any = {};
                try {
                  if (typeof p.manualEdits === "string" && p.manualEdits) {
                    const parsed = JSON.parse(p.manualEdits);
                    manualEdits =
                      parsed != null &&
                      typeof parsed === "object" &&
                      !Array.isArray(parsed)
                        ? parsed
                        : {};
                  } else if (
                    p.manualEdits != null &&
                    typeof p.manualEdits === "object" &&
                    !Array.isArray(p.manualEdits)
                  ) {
                    manualEdits = p.manualEdits;
                  }
                } catch (parseError) {
                  appLogger.warn(
                    "Failed to parse manualEdits for photo",
                    p.id,
                    parseError,
                  );
                  manualEdits = {};
                }

                return {
                  id: p.id,
                  albumId: p.albumId || "",
                  title: p.title || "",
                  url: photoUrl,
                  photographerId: p.photographerId,
                  category: p.category || null,
                  manualEdits: manualEdits,
                };
              });
          }
        }
      }

      // Safely parse categories with defensive checks
      let categories: any[] = [];
      try {
        if (record.categories != null) {
          if (typeof record.categories === "string" && record.categories) {
            const parsed = JSON.parse(record.categories);
            categories = Array.isArray(parsed) ? parsed : [];
          } else if (Array.isArray(record.categories)) {
            categories = record.categories;
          }
        }
      } catch (parseError) {
        appLogger.warn(
          "Failed to parse categories for album",
          record?.id || "unknown",
          parseError,
        );
        categories = [];
      }

      // Safely construct album object with all defensive checks
      const albumId = record.id || "";
      const albumTitle = record.title || "";
      const albumDate = record.date || "";
      const photographerId =
        record.photographerId != null ? record.photographerId : null;
      const coverPhotoUrl =
        record.coverPhotoUrl ||
        (photos.length > 0 && photos[0]?.url ? photos[0].url : "") ||
        "";
      const albumSource = record.source || "";
      const roomNumber = record.roomNumber || "";
      const albumStatus = record.status || "";

      return {
        id: albumId,
        title: albumTitle,
        date: albumDate,
        photographerId: photographerId,
        coverPhotoUrl: coverPhotoUrl,
        source: albumSource,
        roomNumber: roomNumber,
        status: albumStatus,
        categories: categories,
        photos: photos,
      };
    } catch (error) {
      appLogger.error("Failed to fetch album", error);

      // Provide more specific error information
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes("failed to fetch") ||
          errorMessage.includes("network") ||
          errorMessage.includes("connection")
        ) {
          throw new Error(
            "Network error: Unable to connect to the server. Please check your connection.",
          );
        }
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("404")
        ) {
          throw new Error(`Album not found. The album may have been deleted.`);
        }
        if (
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("401") ||
          errorMessage.includes("403")
        ) {
          throw new Error(
            "Permission denied: You do not have access to this album.",
          );
        }
        throw new Error(`Failed to load album: ${error.message}`);
      }

      // For non-Error objects, return null (legacy behavior)
      return null;
    }
  },

  async createAlbum(data: Partial<Album>): Promise<Album> {
    const record = await pb.collection("albums").create(data);
    return record as Album;
  },

  async updateAlbum(
    id: string,
    data: Partial<Album>,
    retryCount = 0,
  ): Promise<Album> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    try {
      const record = await pb.collection("albums").update(id, data);
      return record as Album;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("timeout");
      const isConflict =
        errorMessage.includes("conflict") || errorMessage.includes("modified");

      // Don't retry on conflict errors
      if (isConflict) {
        appLogger.warn("Album update conflict detected", {
          albumId: id,
          error: errorMessage,
        });
        throw error;
      }

      // Retry on network errors
      if (retryCount < MAX_RETRIES && isNetworkError) {
        appLogger.info(
          `Retrying album update (attempt ${retryCount + 1}/${MAX_RETRIES})`,
          { albumId: id },
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * (retryCount + 1)),
        );
        return apiService.updateAlbum(id, data, retryCount + 1);
      }

      appLogger.error(
        "Failed to update album",
        error instanceof Error ? error : undefined,
        { albumId: id, retryCount },
      );
      throw error;
    }
  },

  async deleteAlbum(id: string): Promise<void> {
    await pb.collection("albums").delete(id);
  },
};
