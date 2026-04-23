import { pb } from "./pb";
import {
  Photographer,
  Order,
  Album,
  Photo,
  Product,
  Pack,
  Booking,
  Destination,
  Expense,
  ExpenseCategory,
  Adjustment,
  Equipment,
  Loan,
  SessionType,
} from "../types";
import { PocketRecord } from "./pbTypes";
import { logger } from "../utils/logger";
import { TIMEOUTS } from "../constants/timing";

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
export const apiService = {
  // --- Users / Photographers ---
  async getUsers(): Promise<Photographer[]> {
    const records = await pb.collection("users").getFullList();
    return records.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      password: r.password,
      role: r.role,
      specialty: r.specialty,
      avatarUrl: r.avatarUrl,
      monthlyTarget: r.monthlyTarget,
      dailyPhotoTarget: r.dailyPhotoTarget,
      payrollType: r.payrollType,
      monthlySalary: r.monthlySalary,
      commissionRate: r.commissionRate,
      destinationId: r.destinationId,
      workingHours: r.workingHours,
    }));
  },

  async createUser(data: Partial<Photographer>): Promise<Photographer> {
    const record = await pb.collection("users").create(data);
    return record as Photographer;
  },

  async updateUser(
    id: string | number,
    data: Partial<Photographer>,
  ): Promise<Photographer> {
    const record = await pb.collection("users").update(String(id), data);
    return record as Photographer;
  },

  async deleteUser(id: string | number): Promise<void> {
    await pb.collection("users").delete(String(id));
  },

  async loginUser(
    email: string,
    password: string,
  ): Promise<{ token: string; user: Photographer } | null> {
    try {
      const baseUrl = pb.baseUrlValue;

      // First, check if backend is reachable
      try {
        const healthController = new AbortController();
        const healthTimeoutId = setTimeout(
          () => healthController.abort(),
          5000,
        ); // 5 second timeout

        const healthCheck = await fetch(`${baseUrl}/api/health`, {
          method: "GET",
          signal: healthController.signal,
        }).catch((fetchError) => {
          // Catch network errors from fetch itself
          if (
            fetchError instanceof TypeError &&
            (fetchError.message.includes("Failed to fetch") ||
              fetchError.message.includes("NetworkError"))
          ) {
            const networkError = new Error(
              "Cannot connect to backend server. Please ensure the server is running. Start it with: node backend/server.js",
            );
            networkError.name = "NetworkError";
            throw networkError;
          }
          throw fetchError;
        });

        clearTimeout(healthTimeoutId);

        if (!healthCheck.ok) {
          throw new Error(
            "Backend server is not responding. Please ensure the server is running on port 8090.",
          );
        }
      } catch (healthError) {
        if (healthError instanceof Error) {
          if (
            healthError.name === "AbortError" ||
            healthError.message.includes("timeout")
          ) {
            throw new Error(
              "Backend server connection timeout. Please check if the server is running on port 8090.",
            );
          }
          if (
            healthError.name === "NetworkError" ||
            healthError.message.includes("Failed to fetch") ||
            healthError.message.includes("NetworkError") ||
            healthError.message.includes("Cannot connect to backend server")
          ) {
            throw new Error(
              "Cannot connect to backend server. Please ensure the server is running. Start it with: node backend/server.js",
            );
          }
          throw new Error(`Backend server error: ${healthError.message}`);
        }
        throw new Error(
          "Backend server is not reachable. Please ensure the server is running on port 8090.",
        );
      }

      // Perform login with timeout
      const loginController = new AbortController();
      const loginTimeoutId = setTimeout(() => loginController.abort(), 10000); // 10 second timeout for login

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        signal: loginController.signal,
      });
      clearTimeout(loginTimeoutId);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Login failed" }));
        // Prioritize message over error since message contains user-friendly description
        throw new Error(errorData.message || errorData.error || "Login failed");
      }

      const data = await response.json();

      // Store the token in the pb adapter
      pb.setAuthToken(data.token);

      return {
        token: data.token,
        user: data.user as Photographer,
      };
    } catch (error) {
      // Don't log here - let the caller (Login component) handle logging
      // Re-throw with more context if it's a network error
      if (error instanceof Error) {
        if (error.name === "AbortError" || error.message.includes("timeout")) {
          throw new Error(
            "Login request timed out. Please check your connection and try again.",
          );
        }
        if (
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError") ||
          error.message.includes("Cannot connect to backend server")
        ) {
          throw new Error(
            "Cannot connect to backend server. Please ensure the server is running. Start it with: node backend/server.js",
          );
        }
      }
      throw error;
    }
  },

  async refreshData(
    collections?: string[],
    incremental = true,
  ): Promise<{ success: boolean; refreshed: string[]; status: any }> {
    const baseUrl = pb.baseUrlValue;
    const response = await fetch(`${baseUrl}/api/data/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pb.authStore.token}`,
      },
      body: JSON.stringify({ collections, incremental }),
    });

    if (!response.ok) {
      // Try to read the error message from the response
      let errorMessage = "Failed to refresh data";
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      // Create error with more context
      const error = new Error(errorMessage);
      // Add status code for handling authentication errors
      (error as any).status = response.status;
      (error as any).code =
        response.status === 401 ? "AUTHENTICATION_ERROR" : "REFRESH_ERROR";
      throw error;
    }

    return await response.json();
  },

  // --- Albums ---
  async getAlbums(): Promise<Album[]> {
    try {
      const records = await pb
        .collection("albums")
        .getFullList({ sort: "-created" });

      // Ensure records is an array before processing
      if (!Array.isArray(records)) {
        console.warn("getAlbums: records is not an array", records);
        return [];
      }

      // Ensure records is not null/undefined
      if (records == null) {
        console.warn("getAlbums: records is null or undefined");
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
                      photoUrl = `${baseUrl}/api/files/photos/${p.id}/${p.url}`;
                    }

                    // Safely parse manualEdits
                    let manualEdits: any = {};
                    try {
                      const mEdits = p.manualEdits as any;
                      if (typeof mEdits === "string" && mEdits) {
                        const parsed = JSON.parse(mEdits);
                        manualEdits =
                          parsed != null &&
                          typeof parsed === "object" &&
                          !Array.isArray(parsed)
                            ? parsed
                            : {};
                      } else if (
                        mEdits != null &&
                        typeof mEdits === "object" &&
                        !Array.isArray(mEdits)
                      ) {
                        manualEdits = mEdits;
                      }
                    } catch (parseError) {
                      console.warn(
                        "Failed to parse manualEdits for photo",
                        p.id,
                        parseError,
                      );
                      manualEdits = {};
                    }

                    return {
                      id: p.id,
                      albumId: (p.albumId as string) || "",
                      title: (p.title as string) || "",
                      url: photoUrl,
                      photographerId: p.photographerId as number,
                      category: p.category ? (p.category as string) : undefined,
                      manualEdits: manualEdits,
                      original_file: p.original_file as string | undefined,
                    };
                  });
              }

              // Set cover photo from first photo if not already set
              if (!coverPhotoUrl && photos.length > 0 && photos[0]?.url) {
                coverPhotoUrl = photos[0].url;
              }
            } catch (photoError) {
              console.warn(
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
              console.warn(
                "Failed to parse categories for album",
                r.id,
                parseError,
              );
              categories = [];
            }

            return {
              id: r.id || "",
              title: (r.title as string) || "",
              date: (r.date as string) || "",
              photographerId:
                r.photographerId != null ? (r.photographerId as number) : 0,
              coverPhotoUrl: (coverPhotoUrl as string) || "",
              source: (r.source as string) || "",
              roomNumber: (r.roomNumber as string) || "",
              status: (r.status as string) || "",
              categories: categories,
              photos: photos,
            };
          }),
      );

      // Ensure result is an array
      if (!Array.isArray(albumsWithPhotos)) {
        console.warn(
          "getAlbums: albumsWithPhotos is not an array",
          albumsWithPhotos,
        );
        return [];
      }

      return albumsWithPhotos;
    } catch (error) {
      console.error("getAlbums: Error fetching albums", error);
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
        console.warn("Album not found or invalid record returned", {
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
            .filter(
              (p: PocketRecord) =>
                p != null && typeof p === "object" && p.id != null,
            ) // Filter out null/undefined records
            .map((p: PocketRecord) => {
              // Construct file URL - check if it's already a full URL or needs the base URL
              let photoUrl = (p.url as string) || "";
              if (
                photoUrl &&
                !photoUrl.startsWith("http") &&
                !photoUrl.startsWith("blob:")
              ) {
                // Construct file URL from base URL
                const baseUrl = pb.baseUrlValue;
                photoUrl = `${baseUrl}/api/files/photos/${p.id}/${p.url}`;
              }

              // Safely parse manualEdits - ensure it's always an object, never null
              let manualEdits: any = {};
              try {
                const mEdits = p.manualEdits as any;
                if (typeof mEdits === "string" && mEdits) {
                  const parsed = JSON.parse(mEdits);
                  manualEdits =
                    parsed != null &&
                    typeof parsed === "object" &&
                    !Array.isArray(parsed)
                      ? parsed
                      : {};
                } else if (
                  mEdits != null &&
                  typeof mEdits === "object" &&
                  !Array.isArray(mEdits)
                ) {
                  manualEdits = mEdits;
                }
              } catch (parseError) {
                console.warn(
                  "Failed to parse manualEdits for photo",
                  p.id,
                  parseError,
                );
                manualEdits = {};
              }

              return {
                id: p.id,
                albumId: (p.albumId as string) || "",
                title: (p.title as string) || "",
                url: photoUrl,
                photographerId: (p.photographerId as number) || 0,
                category: p.category ? (p.category as string) : undefined,
                manualEdits: manualEdits,
              };
            });
        } else {
          console.warn(
            "getAlbum: photosList is not an array for album",
            id,
            photosList,
          );
          photos = [];
        }
      } catch (photoError) {
        console.warn("Failed to fetch photos for album", photoError);
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
                  console.warn(
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
        console.warn(
          "Failed to parse categories for album",
          record?.id || "unknown",
          parseError,
        );
        categories = [];
      }

      // Safely construct album object with all defensive checks
      const albumId = record.id || "";
      const albumTitle = (record.title as string) || "";
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
      console.error("Failed to fetch album", error);

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
        logger.warn("Album update conflict detected", {
          albumId: id,
          error: errorMessage,
        });
        throw error;
      }

      // Retry on network errors
      if (retryCount < MAX_RETRIES && isNetworkError) {
        logger.info(
          `Retrying album update (attempt ${retryCount + 1}/${MAX_RETRIES})`,
          { albumId: id },
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * (retryCount + 1)),
        );
        return this.updateAlbum(id, data, retryCount + 1);
      }

      logger.error(
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

  // --- Photos ---
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
        photoUrl = `${baseUrl}/api/files/photos/${r.id}/${r.url}`;
      }

      return {
        id: r.id,
        albumId: (r.albumId as string) || "",
        title: (r.title as string) || "",
        url: photoUrl,
        photographerId: r.photographerId as number,
        category: r.category,
        manualEdits:
          typeof r.manualEdits === "string"
            ? JSON.parse(r.manualEdits)
            : r.manualEdits || {},
        original_file: r.original_file,
      };
    });
  },

  async createPhoto(data: Partial<Photo> | FormData): Promise<Photo> {
    const record = await pb.collection("photos").create(data);
    return record as unknown as Photo;
  },

  async deletePhoto(id: string): Promise<void> {
    await pb.collection("photos").delete(id);
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

  /**
   * Downloads the High-Resolution original file for a purchased photo.
   * Securely fetches a pre-signed R2 download URL from the Cloud Hub.
   */
  async downloadHighRes(photoId: string, filename?: string): Promise<void> {
    try {
      const baseUrl = pb.baseUrlValue || "http://127.0.0.1:8090";

      // Ask the Hub for a secure pre-signed download URL
      const response = await fetch(
        `${baseUrl}/api/photos/${photoId}/download-url`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404)
          throw new Error("High-res file not found on server.");
        if (response.status === 403)
          throw new Error("Unauthorized or order not paid.");
        throw new Error("Failed to retrieve download link.");
      }

      const data = await response.json();
      if (!data.downloadUrl) throw new Error("Invalid download configuration.");

      // Trigger download via hidden link using the secure R2 URL
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = filename || data.filename || `photo-${photoId}.jpg`;
      // Crucial: R2 urls might need target blank depending on CORS,
      // but standard download attribute usually works on same-origin or properly CORS-configured buckets
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error("Download Failed:", error);
      throw new Error(`Download failed: ${error.message}`);
    }
  },

  // --- Orders ---
  async getOrders(): Promise<Order[]> {
    const records = await pb
      .collection("orders")
      .getFullList({ sort: "-created" });
    return records.map((r: PocketRecord) => ({
      id: r.id,
      date: r.date,
      clientName: r.clientName,
      email: r.email,
      status: r.status,
      total: r.total,
      photographerId: r.photographerId,
      destinationId: r.destinationId,
      paymentMethod: r.paymentMethod,
      appliedDiscount: r.appliedDiscount,
      items: r.items,
      updatedAt: r.updated,
    }));
  },

  async createOrder(data: Partial<Order>): Promise<Order> {
    const record = await pb.collection("orders").create(data);
    return record as Order;
  },

  async updateOrder(
    id: string,
    data: Partial<Order>,
    retryCount = 0,
  ): Promise<Order> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    try {
      // Validate order data before saving
      if (data.items && Array.isArray(data.items)) {
        const calculatedTotal = data.items.reduce(
          (sum: number, item: any) =>
            sum + (item.price || 0) * (item.quantity || 0),
          0,
        );
        const discount = data.appliedDiscount || 0;
        const finalTotal = Math.max(0, calculatedTotal - discount);

        // Update total if it doesn't match calculation
        if (data.total !== finalTotal) {
          data.total = finalTotal;
        }
      }

      const record = await pb.collection("orders").update(id, data);
      return record as Order;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("timeout");

      // Retry on network errors
      if (retryCount < MAX_RETRIES && isNetworkError) {
        logger.info(
          `Retrying order update (attempt ${retryCount + 1}/${MAX_RETRIES})`,
          { orderId: id },
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * (retryCount + 1)),
        );
        return this.updateOrder(id, data, retryCount + 1);
      }

      logger.error(
        "Failed to update order",
        error instanceof Error ? error : undefined,
        { orderId: id, retryCount },
      );
      throw error;
    }
  },

  async deleteOrder(id: string): Promise<void> {
    await pb.collection("orders").delete(id);
  },

  async finalizeOrderForCustomerDelivery(orderId: string): Promise<Order> {
    // Mock implementation for now
    // In a real app, this would trigger email sending, etc.
    // We update the status to 'Delivered'
    const order = await this.updateOrder(orderId, { status: "Delivered" });
    return order;
  },

  // --- Products ---
  async getProducts(): Promise<Product[]> {
    const records = await pb.collection("products").getFullList();
    return records.map((r: PocketRecord) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      price: r.price,
      stock: r.stock,
      isFeatured: r.isFeatured,
    }));
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const record = await pb.collection("products").create(data);
    return record as Product;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const record = await pb.collection("products").update(id, data);
    return record as Product;
  },

  async deleteProduct(id: string): Promise<void> {
    await pb.collection("products").delete(id);
  },

  // --- Packs ---
  async getPacks(): Promise<Pack[]> {
    const records = await pb.collection("packs").getFullList();
    return records.map((r: PocketRecord) => {
      // Handle products field - it might be stored as JSON string or array
      let products: string[] = [];
      if (r.productsJSON) {
        if (typeof r.productsJSON === "string") {
          try {
            products = JSON.parse(r.productsJSON);
          } catch {
            products = [];
          }
        } else if (Array.isArray(r.productsJSON)) {
          products = r.productsJSON;
        }
      } else if (r.products && Array.isArray(r.products)) {
        products = r.products;
      }

      return {
        id: r.id,
        name: r.name,
        description: r.description || "",
        price: r.price,
        products: products,
      };
    });
  },

  async createPack(data: Partial<Pack>): Promise<Pack> {
    // Convert products array to JSON format for storage
    const packData: any = {
      name: data.name,
      description: data.description,
      price: data.price,
      productsJSON: data.products ? JSON.stringify(data.products) : "[]",
    };
    const record = await pb.collection("packs").create(packData);
    return {
      id: record.id,
      name: record.name,
      description: record.description || "",
      price: record.price,
      products: data.products || [],
    };
  },

  async updatePack(id: string, data: Partial<Pack>): Promise<Pack> {
    // Convert products array to JSON format for storage
    const packData: any = {
      name: data.name,
      description: data.description,
      price: data.price,
    };
    if (data.products !== undefined) {
      packData.productsJSON = JSON.stringify(data.products);
    }
    const record = await pb.collection("packs").update(id, packData);

    // Parse products back from JSON
    let products: string[] = [];
    if (record.productsJSON) {
      if (typeof record.productsJSON === "string") {
        try {
          products = JSON.parse(record.productsJSON);
        } catch {
          products = [];
        }
      } else if (Array.isArray(record.productsJSON)) {
        products = record.productsJSON;
      }
    }

    return {
      id: record.id,
      name: record.name,
      description: record.description || "",
      price: record.price,
      products: products,
    };
  },

  async deletePack(id: string): Promise<void> {
    await pb.collection("packs").delete(id);
  },

  // --- Bookings ---
  async getBookings(): Promise<Booking[]> {
    const records = await pb.collection("bookings").getFullList();
    return records as Booking[];
  },

  async createBooking(data: Partial<Booking>): Promise<Booking> {
    const record = await pb.collection("bookings").create(data);
    return record as Booking;
  },

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    const record = await pb.collection("bookings").update(id, data);
    return record as Booking;
  },

  async deleteBooking(id: string): Promise<void> {
    await pb.collection("bookings").delete(id);
  },

  // --- Destinations ---
  async getDestinations(): Promise<Destination[]> {
    const records = await pb.collection("destinations").getFullList();
    return records as Destination[];
  },

  async createDestination(data: Partial<Destination>): Promise<Destination> {
    try {
      console.log("Creating destination with data:", data);
      const record = await pb.collection("destinations").create(data);
      console.log("Destination created successfully:", record);
      return record as Destination;
    } catch (error: any) {
      console.error("createDestination error details:", {
        error,
        errorType: typeof error,
        errorKeys: error && typeof error === "object" ? Object.keys(error) : [],
        errorMessage: error?.message,
        errorResponse: error?.response,
        errorStatus: error?.status,
      });

      // Extract detailed error message from PocketBase
      let errorMessage = "Failed to create destination";
      if (error?.response?.data) {
        const pbError = error.response.data;
        console.log("PocketBase error data:", pbError);
        if (pbError.message) {
          errorMessage = pbError.message;
        } else if (
          pbError.data &&
          typeof pbError.data === "object" &&
          !Array.isArray(pbError.data)
        ) {
          // PocketBase validation errors - safely handle data object
          try {
            const validationErrors = Object.entries(pbError.data)
              .map(([field, msg]: [string, any]) => `${field}: ${msg}`)
              .join(", ");
            errorMessage = validationErrors || errorMessage;
          } catch (entriesError) {
            console.warn("Failed to process validation errors", entriesError);
            // Use default error message
          }
        } else if (pbError.error) {
          errorMessage = pbError.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      const finalError = new Error(errorMessage);
      // Preserve original error structure
      if (error?.response) {
        (finalError as any).response = error.response;
      }
      if (error?.status) {
        (finalError as any).status = error.status;
      }
      throw finalError;
    }
  },

  async updateDestination(
    id: string,
    data: Partial<Destination>,
  ): Promise<Destination> {
    const record = await pb.collection("destinations").update(id, data);
    return record as Destination;
  },

  async deleteDestination(id: string): Promise<void> {
    await pb.collection("destinations").delete(id);
  },

  // --- Expenses ---
  async getExpenses(): Promise<Expense[]> {
    const records = await pb.collection("expenses").getFullList();
    return records as Expense[];
  },

  async createExpense(data: Partial<Expense>): Promise<Expense> {
    const record = await pb.collection("expenses").create(data);
    return record as Expense;
  },

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    const record = await pb.collection("expenses").update(id, data);
    return record as Expense;
  },

  async deleteExpense(id: string): Promise<void> {
    await pb.collection("expenses").delete(id);
  },

  // --- Expense Categories ---
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const records = await pb.collection("expense_categories").getFullList();
    return records as ExpenseCategory[];
  },

  async createExpenseCategory(
    data: Omit<ExpenseCategory, "id">,
  ): Promise<ExpenseCategory> {
    const record = await pb.collection("expense_categories").create(data);
    return record as ExpenseCategory;
  },

  async updateExpenseCategory(
    id: string,
    data: Partial<ExpenseCategory>,
  ): Promise<ExpenseCategory> {
    const record = await pb.collection("expense_categories").update(id, data);
    return record as ExpenseCategory;
  },

  async deleteExpenseCategory(id: string): Promise<void> {
    await pb.collection("expense_categories").delete(id);
  },

  // --- Session Types ---
  async getSessionTypes(): Promise<SessionType[]> {
    const records = await pb.collection("session_types").getFullList();
    return records as SessionType[];
  },

  async createSessionType(data: Omit<SessionType, "id">): Promise<SessionType> {
    const record = await pb.collection("session_types").create(data);
    return record as SessionType;
  },

  async updateSessionType(
    id: string,
    data: Partial<SessionType>,
  ): Promise<SessionType> {
    const record = await pb.collection("session_types").update(id, data);
    return record as SessionType;
  },

  async deleteSessionType(id: string): Promise<void> {
    await pb.collection("session_types").delete(id);
  },

  // --- Adjustments ---
  async getAdjustments(): Promise<Adjustment[]> {
    const records = await pb.collection("adjustments").getFullList();
    return records as Adjustment[];
  },

  async createAdjustment(data: Partial<Adjustment>): Promise<Adjustment> {
    const record = await pb.collection("adjustments").create(data);
    return record as Adjustment;
  },

  async updateAdjustment(
    id: string,
    data: Partial<Adjustment>,
  ): Promise<Adjustment> {
    const record = await pb.collection("adjustments").update(id, data);
    return record as Adjustment;
  },

  async deleteAdjustment(id: string): Promise<void> {
    await pb.collection("adjustments").delete(id);
  },

  // --- Equipment ---
  async getEquipment(): Promise<Equipment[]> {
    const records = await pb.collection("equipment").getFullList();
    return records as Equipment[];
  },

  async createEquipment(data: Partial<Equipment>): Promise<Equipment> {
    const record = await pb.collection("equipment").create(data);
    return record as Equipment;
  },

  async updateEquipment(
    id: string,
    data: Partial<Equipment>,
  ): Promise<Equipment> {
    const record = await pb.collection("equipment").update(id, data);
    return record as Equipment;
  },

  async deleteEquipment(id: string): Promise<void> {
    await pb.collection("equipment").delete(id);
  },

  // --- Loans ---
  async getLoans(): Promise<Loan[]> {
    const records = await pb.collection("loans").getFullList();
    return records as Loan[];
  },

  async createLoan(data: Partial<Loan>): Promise<Loan> {
    const record = await pb.collection("loans").create(data);
    return record as Loan;
  },

  async updateLoan(id: string, data: Partial<Loan>): Promise<Loan> {
    const record = await pb.collection("loans").update(id, data);
    return record as Loan;
  },

  async deleteLoan(id: string): Promise<void> {
    await pb.collection("loans").delete(id);
  },

  // --- Kiosk Management ---
  async getKiosks(): Promise<any[]> {
    try {
      const records = await pb.collection("kiosks").getFullList();
      return records.map((r: any) => ({
        id: r.id,
        name: r.name || r.id,
        status: r.status || "Disconnected",
      }));
    } catch (error) {
      console.error("Failed to fetch kiosks:", error);
      return [];
    }
  },

  async getActiveKioskSessions(): Promise<Set<string>> {
    try {
      // Get all kiosk sessions - presence in this collection indicates active session
      // Optionally filter by recent lastSeen (within last 5 minutes) to handle stale sessions
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const records = await pb.collection("kiosk_sessions").getFullList({
        filter: `lastSeen >= "${fiveMinutesAgo}"`,
        fields: "kioskId",
      });
      return new Set(records.map((r: any) => r.kioskId).filter(Boolean));
    } catch (error) {
      // If filtering fails, try getting all sessions
      try {
        const records = await pb.collection("kiosk_sessions").getFullList({
          fields: "kioskId",
        });
        return new Set(records.map((r: any) => r.kioskId).filter(Boolean));
      } catch (fallbackError) {
        console.error("Failed to fetch active kiosk sessions:", fallbackError);
        return new Set();
      }
    }
  },

  async createKiosk(data: Partial<any>): Promise<any> {
    const record = await pb.collection("kiosks").create(data);
    return {
      id: record.id,
      name: record.name || record.id,
      status: record.status || "Disconnected",
    };
  },

  async updateKiosk(id: string, data: Partial<any>): Promise<any> {
    const record = await pb.collection("kiosks").update(id, data);
    return {
      id: record.id,
      name: record.name || record.id,
      status: record.status || "Disconnected",
    };
  },

  async deleteKiosk(id: string): Promise<void> {
    await pb.collection("kiosks").delete(id);
  },

  async sendKioskHeartbeat(kioskId: string): Promise<void> {
    try {
      const existing = await pb
        .collection("kiosks")
        .getFirstListItem(`id="${kioskId}"`);
      if (existing) {
        await pb.collection("kiosks").update(kioskId, {
          status: "Connected",
          lastHeartbeat: new Date().toISOString(),
        });
      }
    } catch {
      await pb.collection("kiosks").create({
        id: kioskId,
        name: kioskId,
        status: "Connected",
        lastHeartbeat: new Date().toISOString(),
      });
    }
  },

  // --- Settings ---
  async getSetting(key: string): Promise<any> {
    try {
      const record = await pb.collection("settings").getOne(key);
      return record.value;
    } catch {
      return null;
    }
  },

  async setSetting(key: string, value: unknown): Promise<void> {
    try {
      await pb.collection("settings").update(key, { value });
    } catch {
      await pb.collection("settings").create({ key, value });
    }
  },

  // --- Data Export/Import for Sync & Backup ---
  async exportDataForSync(fullBackup: boolean = false): Promise<any> {
    try {
      // Helper function to safely fetch data
      const safeFetch = async <T>(
        fetchFn: () => Promise<T[]>,
        defaultValue: T[] = [],
      ): Promise<T[]> => {
        try {
          return await fetchFn();
        } catch (err) {
          console.warn("Failed to fetch data for export:", err);
          return defaultValue;
        }
      };

      // Gather all data from the database with error handling
      const [
        albums,
        photos,
        orders,
        users,
        products,
        packs,
        bookings,
        destinations,
        expenses,
        adjustments,
        loans,
        equipment,
        sessionTypes,
        expenseCategories,
      ] = await Promise.all([
        safeFetch(() => this.getAlbums()),
        safeFetch(() => this.getPhotos()),
        safeFetch(() => this.getOrders()),
        safeFetch(() => this.getUsers()),
        safeFetch(() => this.getProducts()),
        safeFetch(() => this.getPacks()),
        safeFetch(() => this.getBookings()),
        safeFetch(() => this.getDestinations()),
        safeFetch(() => this.getExpenses()),
        safeFetch(() => this.getAdjustments()),
        safeFetch(() => this.getLoans()),
        safeFetch(() => this.getEquipment()),
        safeFetch(() => this.getSessionTypes()),
        safeFetch(() => this.getExpenseCategories()),
      ]);

      // Calculate summary
      const summary = {
        albums: albums.length,
        photos: photos.length,
        orders: orders.length,
        users: users.length,
        totalSizeMB: 0, // Estimate: roughly 0.1MB per photo, 0.01MB per record
      };

      // Rough size estimation (photos are the largest)
      summary.totalSizeMB =
        photos.length * 0.1 +
        (albums.length + orders.length + users.length) * 0.01;

      if (fullBackup) {
        // Return full data for backup
        return {
          summary,
          data: {
            albums,
            photos,
            orders,
            users,
            products,
            packs,
            bookings,
            destinations,
            expenses,
            adjustments,
            loans,
            equipment,
            sessionTypes,
            expenseCategories,
            exportDate: new Date().toISOString(),
            version: "1.0",
          },
        };
      } else {
        // Return just summary for sync preview
        return { summary };
      }
    } catch (error) {
      console.error("Failed to export data for sync:", error);
      throw new Error(
        `Failed to gather data from database: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  async importDataFromBackup(backupData: any): Promise<void> {
    try {
      const data = backupData.data || backupData;

      // Clear existing data (optional - you might want to merge instead)
      // For now, we'll import by creating/updating records

      // Import users
      if (data.users && Array.isArray(data.users)) {
        for (const user of data.users) {
          try {
            await this.updateUser(user.id, user);
          } catch {
            try {
              await this.createUser(user);
            } catch (err) {
              console.warn("Failed to import user:", user.id, err);
            }
          }
        }
      }

      // Import products
      if (data.products && Array.isArray(data.products)) {
        for (const product of data.products) {
          try {
            await this.updateProduct(product.id, product);
          } catch {
            try {
              await this.createProduct(product);
            } catch (err) {
              console.warn("Failed to import product:", product.id, err);
            }
          }
        }
      }

      // Import packs
      if (data.packs && Array.isArray(data.packs)) {
        for (const pack of data.packs) {
          try {
            await this.updatePack(pack.id, pack);
          } catch {
            try {
              await this.createPack(pack);
            } catch (err) {
              console.warn("Failed to import pack:", pack.id, err);
            }
          }
        }
      }

      // Import destinations
      if (data.destinations && Array.isArray(data.destinations)) {
        for (const destination of data.destinations) {
          try {
            await this.updateDestination(destination.id, destination);
          } catch {
            try {
              await this.createDestination(destination);
            } catch (err) {
              console.warn(
                "Failed to import destination:",
                destination.id,
                err,
              );
            }
          }
        }
      }

      // Import albums
      if (data.albums && Array.isArray(data.albums)) {
        for (const album of data.albums) {
          try {
            await this.updateAlbum(album.id, album);
          } catch {
            try {
              await this.createAlbum(album);
            } catch (err) {
              console.warn("Failed to import album:", album.id, err);
            }
          }
        }
      }

      // Import photos
      if (data.photos && Array.isArray(data.photos)) {
        for (const photo of data.photos) {
          try {
            await this.deletePhoto(photo.id);
          } catch {}
          try {
            await this.createPhoto(photo);
          } catch (err) {
            console.warn("Failed to import photo:", photo.id, err);
          }
        }
      }

      // Import orders
      if (data.orders && Array.isArray(data.orders)) {
        for (const order of data.orders) {
          try {
            await this.updateOrder(order.id, order);
          } catch {
            try {
              await this.createOrder(order);
            } catch (err) {
              console.warn("Failed to import order:", order.id, err);
            }
          }
        }
      }

      // Import bookings
      if (data.bookings && Array.isArray(data.bookings)) {
        for (const booking of data.bookings) {
          try {
            await this.updateBooking(booking.id, booking);
          } catch {
            try {
              await this.createBooking(booking);
            } catch (err) {
              console.warn("Failed to import booking:", booking.id, err);
            }
          }
        }
      }

      // Import expenses
      if (data.expenses && Array.isArray(data.expenses)) {
        for (const expense of data.expenses) {
          try {
            await this.updateExpense(expense.id, expense);
          } catch {
            try {
              await this.createExpense(expense);
            } catch (err) {
              console.warn("Failed to import expense:", expense.id, err);
            }
          }
        }
      }

      // Import adjustments
      if (data.adjustments && Array.isArray(data.adjustments)) {
        for (const adjustment of data.adjustments) {
          try {
            await this.updateAdjustment(adjustment.id, adjustment);
          } catch {
            try {
              await this.createAdjustment(adjustment);
            } catch (err) {
              console.warn("Failed to import adjustment:", adjustment.id, err);
            }
          }
        }
      }

      // Import loans
      if (data.loans && Array.isArray(data.loans)) {
        for (const loan of data.loans) {
          try {
            await this.updateLoan(loan.id, loan);
          } catch {
            try {
              await this.createLoan(loan);
            } catch (err) {
              console.warn("Failed to import loan:", loan.id, err);
            }
          }
        }
      }

      // Import equipment
      if (data.equipment && Array.isArray(data.equipment)) {
        for (const item of data.equipment) {
          try {
            await this.updateEquipment(item.id, item);
          } catch {
            try {
              await this.createEquipment(item);
            } catch (err) {
              console.warn("Failed to import equipment:", item.id, err);
            }
          }
        }
      }

      // Import session types
      if (data.sessionTypes && Array.isArray(data.sessionTypes)) {
        for (const sessionType of data.sessionTypes) {
          try {
            await this.updateSessionType(sessionType.id, sessionType);
          } catch {
            try {
              await this.createSessionType(sessionType);
            } catch (err) {
              console.warn(
                "Failed to import session type:",
                sessionType.id,
                err,
              );
            }
          }
        }
      }

      // Import expense categories
      if (data.expenseCategories && Array.isArray(data.expenseCategories)) {
        for (const category of data.expenseCategories) {
          try {
            await this.updateExpenseCategory(category.id, category);
          } catch {
            try {
              await this.createExpenseCategory(category);
            } catch (err) {
              console.warn(
                "Failed to import expense category:",
                category.id,
                err,
              );
            }
          }
        }
      }

      console.log("[apiService] Backup import completed");
    } catch (error) {
      console.error("Failed to import backup data:", error);
      throw new Error(
        `Failed to import backup: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  // --- Database Reset ---
  async resetDb(): Promise<void> {
    const baseUrl = pb.baseUrlValue;

    // Get auth token from localStorage (same way pb adapter does it)
    const authToken = localStorage.getItem("authToken");

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${baseUrl}/api/reset`, {
        method: "POST",
        headers,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Reset failed" }));
        throw new Error(
          errorData.message || errorData.error || "Failed to reset database",
        );
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Database reset failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("ERR_CONNECTION_REFUSED")
      ) {
        throw new Error(
          "Cannot connect to backend server. Please ensure the server is running.",
        );
      }
      throw error;
    }
  },

  // --- Initialization ---
  async initDb(): Promise<void> {
    // This method is called on app startup to ensure basic data exists
    // For SQLite backend, the schema is already created via migrations
    // We just need to ensure we have at least one user for login
    try {
      // First check if backend is available before trying to initialize
      const baseUrl = pb.baseUrlValue;
      try {
        const healthController = new AbortController();
        const healthTimeoutId = setTimeout(
          () => healthController.abort(),
          2000,
        ); // 2 second timeout
        await fetch(`${baseUrl} / api / health`, {
          signal: healthController.signal,
        });
        clearTimeout(healthTimeoutId);
      } catch (healthError) {
        // Backend is not available, skip initialization silently
        return;
      }

      const users = await this.getUsers();
      if (users.length === 0) {
        // Create a default admin user
        await this.createUser({
          name: "Admin",
          email: "admin@starmaster.local",
          password: "admin",
          role: "Admin",
        });
        console.log("[apiService] Created default admin user");
      }
    } catch (e) {
      // Only log non-network errors
      const errorMessage = e instanceof Error ? e.message : String(e);
      const isNetworkError =
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("ERR_CONNECTION_REFUSED") ||
        errorMessage.includes("Cannot connect to backend");

      if (!isNetworkError) {
        console.warn("[apiService] initDb failed:", e);
      }
    }
  },
};
