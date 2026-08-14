import { pb } from "./pb";
import { apiService } from "./apiService";
import { logger } from "../utils/logger";

// Helper function to make authenticated API calls to cloud server
async function cloudApiCall(
  cloudUrl: string,
  token: string,
  method: string,
  endpoint: string,
  data?: unknown,
) {
  const response = await fetch(`${cloudUrl}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

export const pbManagement = {
  /**
   * Authenticate as Admin to perform schema changes
   */
  async adminLogin(email: string, pass: string) {
    return await pb.admins.authWithPassword(email, pass);
  },

  /**
   * Test connection to the remote cloud server
   */
  async testConnection(cloudUrl: string, apiKey: string): Promise<boolean> {
    try {
      // Test connection by attempting to authenticate via API
      const response = await fetch(`${cloudUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@starmaster.cloud",
          password: apiKey,
        }),
      });
      return response.ok;
    } catch (e) {
      logger.error("Cloud connection test failed:", e);
      return false;
    }
  },

  /**
   * Define the schema structure and create collections if they don't exist
   */
  async initSchema() {
    const collections = [
      {
        name: "albums",
        type: "base",
        schema: [
          { name: "title", type: "text", required: true },
          { name: "date", type: "date", required: true },
          { name: "photographerId", type: "number" },
          { name: "roomNumber", type: "text" },
          {
            name: "status",
            type: "select",
            options: { values: ["Draft", "Finalized", "Archived"] },
          },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "photos",
        type: "base",
        schema: [
          { name: "title", type: "text" },
          {
            name: "album",
            type: "relation",
            collectionId: "albums",
            cascadeDelete: true,
          },
          {
            name: "url",
            type: "file",
            options: { mimeTypes: ["image/jpeg", "image/png"] },
          },
        ],
        listRule: "",
        viewRule: "",
      },
      {
        name: "orders",
        type: "base",
        schema: [
          { name: "clientName", type: "text" },
          { name: "email", type: "email" },
          { name: "total", type: "number" },
          { name: "status", type: "text" },
          { name: "itemsJSON", type: "json" },
          { name: "destinationId", type: "text" },
          { name: "photographerId", type: "number" },
        ],
        listRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "products",
        type: "base",
        schema: [
          { name: "name", type: "text", required: true },
          { name: "category", type: "text" },
          { name: "price", type: "number" },
          { name: "stock", type: "number" },
          { name: "isFeatured", type: "bool" },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "sessionTypes",
        type: "base",
        schema: [
          { name: "name", type: "text", required: true },
          { name: "numberOfPhotos", type: "number" },
          { name: "price", type: "number" },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "kiosks",
        type: "base",
        schema: [
          { name: "name", type: "text" },
          { name: "status", type: "text" },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "kiosk_sessions",
        type: "base",
        schema: [
          { name: "kioskId", type: "text", required: true },
          { name: "ip", type: "text" },
          { name: "lastSeen", type: "date" },
          { name: "version", type: "text" },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "expenses",
        type: "base",
        schema: [
          { name: "description", type: "text" },
          { name: "cost", type: "number" },
          { name: "date", type: "date" },
          { name: "category", type: "text" },
          { name: "destinationId", type: "text" },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "users",
        type: "base",
        schema: [
          { name: "name", type: "text" },
          { name: "email", type: "email" },
          { name: "role", type: "text" },
          { name: "destinationId", type: "text" },
          { name: "workingHoursJSON", type: "json" },
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "packs",
        type: "base",
        schema: [
          { name: "name", type: "text" },
          { name: "price", type: "number" },
          { name: "description", type: "text" },
          { name: "productsJSON", type: "json" },
        ],
        listRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      },
      {
        name: "bookings",
        type: "base",
        schema: [
          { name: "clientName", type: "text" },
          { name: "bookingDate", type: "text" },
          { name: "status", type: "text" },
          { name: "photographerId", type: "number" },
        ],
        listRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "destinations",
        type: "base",
        schema: [
          { name: "name", type: "text" },
          { name: "country", type: "text" },
          { name: "type", type: "text" },
          { name: "licenseKey", type: "text" },
          { name: "featuresJSON", type: "json" },
        ],
        listRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "loans",
        type: "base",
        schema: [
          { name: "source", type: "text" },
          { name: "amount", type: "number" },
          { name: "status", type: "text" },
          { name: "paymentsJSON", type: "json" },
        ],
        listRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "adjustments",
        type: "base",
        schema: [
          { name: "description", type: "text" },
          { name: "amount", type: "number" },
          { name: "type", type: "text" },
          { name: "photographerId", type: "number" },
          { name: "status", type: "text" },
        ],
        listRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "equipment",
        type: "base",
        schema: [
          { name: "name", type: "text" },
          { name: "type", type: "text" },
          { name: "status", type: "text" },
        ],
        listRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "expenseCategories",
        type: "base",
        schema: [{ name: "label", type: "text" }],
        listRule: "",
        createRule: "",
        updateRule: "",
      },
      {
        name: "equipmentCategories",
        type: "base",
        schema: [{ name: "label", type: "text" }],
        listRule: "",
        createRule: "",
        updateRule: "",
      },
    ];

    const results = [];
    for (const col of collections) {
      try {
        await pb.collections.getOne(col.name);
        results.push({ name: col.name, status: "Exists" });
      } catch (_e) {
        try {
          await pb.collections.create(col);
          results.push({ name: col.name, status: "Created" });
        } catch (err) {
          results.push({ name: col.name, status: "Error", error: err });
        }
      }
    }
    return results;
  },

  /**
   * Hybrid Sync: Push data from Local DB to Cloud, then Pull Config updates
   */
  async syncLocalToCloud(
    cloudUrl: string,
    apiKey: string,
    onProgress: (msg: string, percentage: number) => void,
    defaultUserPassword?: string,
  ) {
    onProgress("Connecting to Cloud Server...", 5);

    // 1. Authenticate
    let authToken: string;
    try {
      const authResponse = await fetch(`${cloudUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@starmaster.cloud",
          password: apiKey,
        }),
      });

      if (!authResponse.ok) {
        throw new Error("Authentication failed");
      }

      const authData = await authResponse.json();
      authToken = authData.token;
    } catch (_e) {
      throw new Error("Authentication failed. Check Server URL and API Key.");
    }

    onProgress("Authentication Successful. Pushing local data...", 10);

    // 2. Sync Users
    const localUsers = await apiService.getUsers();
    let processed = 0;

    if (localUsers.length > 0) {
      for (const user of localUsers) {
        try {
          // Check if user exists
          const existingResponse = await fetch(
            `${cloudUrl}/api/collections/users/records?filter=email="${user.email}"`,
            {
              headers: { Authorization: `Bearer ${authToken}` },
            },
          );
          const existingData = await existingResponse.json();

          if (existingData.items && existingData.items.length > 0) {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "PATCH",
              `/api/collections/users/records/${existingData.items[0].id}`,
              {
                name: user.name,
                role: user.role,
                workingHoursJSON: user.workingHoursJSON,
                destinationId: user.destinationId,
              },
            );
          } else {
            // SECURE RANDOM FALLBACK: If no default password is provided, generate a secure random one.
            // This prevents unauthorized access to the cloud account unless explicitly set.
            const passwordToUse =
              defaultUserPassword || crypto.randomUUID() + crypto.randomUUID();

            if (!defaultUserPassword) {
              logger.warn(
                `User ${user.email} synced without default password. Generated random secure password.`,
              );
            }

            await cloudApiCall(
              cloudUrl,
              authToken,
              "POST",
              "/api/collections/users/records",
              {
                name: user.name,
                role: user.role,
                email: user.email,
                workingHoursJSON: user.workingHoursJSON,
                destinationId: user.destinationId,
                password: passwordToUse,
                passwordConfirm: passwordToUse,
              },
            );
          }
        } catch (e) {
          logger.warn(`Failed to sync user`, {
            userName: user.name,
            error: e instanceof Error ? e.message : String(e),
          });
        }
        processed++;
        onProgress(
          `Syncing Users (${processed}/${localUsers.length})...`,
          10 + Math.floor((processed / localUsers.length) * 20),
        );
      }
    }

    // 3. Sync Orders
    const response = await apiService.getOrders();
    const localOrders = response.data || [];
    processed = 0;
    if (localOrders.length > 0) {
      for (const order of localOrders) {
        try {
          try {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "PATCH",
              `/api/collections/orders/records/${order.id}`,
              {
                status: order.status,
                total: order.total,
                clientName: order.clientName,
                items: order.items,
                photographerId: order.photographerId,
                destinationId: order.destinationId,
              },
            );
          } catch (err: unknown) {
            const error = err as { status?: number };
            if (error.status === 404) {
              await cloudApiCall(
                cloudUrl,
                authToken,
                "POST",
                "/api/collections/orders/records",
                {
                  id: order.id,
                  clientName: order.clientName,
                  email: order.email,
                  total: order.total,
                  status: order.status,
                  items: order.items,
                  photographerId: order.photographerId,
                  destinationId: order.destinationId,
                  date: order.date,
                },
              );
            } else {
              throw err;
            }
          }
        } catch (e) {
          logger.warn(`Failed to sync order`, {
            orderId: order.id,
            error: e instanceof Error ? e.message : String(e),
          });
        }
        processed++;
        const progress = 30 + Math.floor((processed / localOrders.length) * 40);
        onProgress(
          `Syncing Orders (${processed}/${localOrders.length})...`,
          progress,
        );
      }
    }

    // 4. Sync Expenses & Adjustments
    const localExpenses = await apiService.getExpenses();
    for (const exp of localExpenses) {
      try {
        if (exp.id) {
          try {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "PATCH",
              `/api/collections/expenses/records/${exp.id}`,
              exp,
            );
          } catch {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "POST",
              "/api/collections/expenses/records",
              exp,
            );
          }
        } else {
          await cloudApiCall(
            cloudUrl,
            authToken,
            "POST",
            "/api/collections/expenses/records",
            exp,
          );
        }
      } catch (e) {
        logger.warn(`Failed to sync expense`, {
          expenseId: exp.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const localAdjustments = await apiService.getAdjustments();
    for (const adj of localAdjustments) {
      try {
        if (adj.id) {
          try {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "PATCH",
              `/api/collections/adjustments/records/${adj.id}`,
              adj,
            );
          } catch {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "POST",
              "/api/collections/adjustments/records",
              adj,
            );
          }
        } else {
          await cloudApiCall(
            cloudUrl,
            authToken,
            "POST",
            "/api/collections/adjustments/records",
            adj,
          );
        }
      } catch (e) {
        logger.warn(`Failed to sync adjustment`, {
          adjustmentId: adj.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    onProgress("Financial Data Synced.", 90);

    // 5. Heartbeat & Pull Config
    const sampleUser = localUsers[0];
    if (sampleUser && sampleUser.destinationId) {
      try {
        onProgress("Updating System Config...", 95);

        // Heartbeat: Tell cloud we are online
        const updatedDest = await cloudApiCall(
          cloudUrl,
          authToken,
          "PATCH",
          `/api/collections/destinations/records/${sampleUser.destinationId}`,
          {
            name: "Online (Synced Just Now)",
          },
        );

        // Reverse Sync: Pull Feature Flags from Cloud to Local
        if (updatedDest.features) {
          const localDest = await apiService
            .getDestinations()
            .then((ds) => ds.find((d) => d.id === sampleUser.destinationId));
          if (localDest) {
            await apiService.updateDestination(localDest.id, {
              features: updatedDest.features,
            });
            logger.info("Updated local features from cloud", {
              features: updatedDest.features,
            });
          }
        }
      } catch (e) {
        logger.warn("Failed to sync destination status/config", {
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
      }
    }

    onProgress("Sync Completed Successfully!", 100);
  },

  async syncLocalToRemote(onProgress: (msg: string, percent: number) => void) {
    onProgress("Starting full database migration...", 5);

    try {
      // Helper for chunking arrays
      const chunk = <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };

      // 1. Sync Products
      onProgress("Migrating Products...", 10);
      const products = await apiService.getProducts();
      for (const p of products) {
        try {
          await pb.collection("products").create(p as any);
        } catch {
          // Falls back to update if already exists
          await pb.collection("products").update(p.id, p as any);
        }
      }

      // 2. Sync Albums
      onProgress("Migrating Albums...", 30);
      const albums = await apiService.getAlbums();
      for (const album of albums) {
        try {
          const { photos, ...albumData } = album;
          // Ensure photographerId is string if it's an expanded object/legacy
          if (typeof albumData.photographerId !== "string") {
            albumData.photographerId = String(albumData.photographerId || "");
          }
          await pb.collection("albums").create(albumData);
        } catch {
          const { photos, ...albumData } = album;
          await pb.collection("albums").update(albumData.id, albumData);
        }
      }

      // 3. Sync Photos (Chunked)
      onProgress("Migrating Photos (this may take a while)...", 50);
      // We fetch all photo records. Warning: if 100k photos, this might need optimization.
      // But for a migration, we'll try fetching in pages if getPhotos doesn't support it.
      // Assuming photoService.getPhotos() exists and is used in other syncs.
      const photos = await apiService.getPhotos();
      if (photos.length > 0) {
        const photoChunks = chunk(photos, 50);
        for (let i = 0; i < photoChunks.length; i++) {
          const pChunk = photoChunks[i];
          onProgress(
            `Migrating Photos [Chunk ${i + 1}/${photoChunks.length}]...`,
            50 + Math.floor((i / photoChunks.length) * 30),
          );
          await Promise.all(
            pChunk.map(async (photo) => {
              try {
                const photoData: any = { ...photo };
                // Stringify nested objects if they exist
                if (
                  photoData.manualEdits &&
                  typeof photoData.manualEdits === "object"
                ) {
                  photoData.manualEdits = JSON.stringify(photoData.manualEdits);
                }
                await pb.collection("photos").create(photoData);
              } catch {
                const photoData: any = { ...photo };
                if (
                  photoData.manualEdits &&
                  typeof photoData.manualEdits === "object"
                ) {
                  photoData.manualEdits = JSON.stringify(photoData.manualEdits);
                }
                await pb.collection("photos").update(photoData.id, photoData);
              }
            }),
          );
        }
      }

      // 4. Sync Orders (Chunked)
      onProgress("Migrating Orders...", 85);
      const ordersResponse = await apiService.getOrders();
      const orders = ordersResponse.data || [];
      const orderChunks = chunk(orders, 50);
      for (let i = 0; i < orderChunks.length; i++) {
        const oChunk = orderChunks[i];
        await Promise.all(
          oChunk.map(async (order) => {
            try {
              await pb.collection("orders").create(order as any);
            } catch {
              await pb
                .collection("orders")
                .update((order as any).id, order as any);
            }
          }),
        );
      }

      onProgress("Migration Completed Successfully!", 100);
      logger.info("Local-to-Remote Data Migration Finished.");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      onProgress(`Migration Failed: ${errMsg}`, 100);
      logger.error("Database Migration Error", error);
      throw error;
    }
  },
};
