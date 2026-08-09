import { pb } from "./pb";
import { apiService } from "./apiService";
import { logger } from "@/utils/logger";

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
      const adminEmail = import.meta.env.VITE_CLOUD_ADMIN_EMAIL || "admin@example.com";
      const response = await fetch(`${cloudUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
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
      {
        name: "loan_payments",
        type: "base",
        schema: [
          {
            name: "loanId",
            type: "relation",
            collectionId: "loans",
            required: true,
            cascadeDelete: true,
          },
          { name: "amount", type: "number", required: true },
          { name: "paymentDate", type: "date", required: true },
          { name: "paymentMethod", type: "text" },
          { name: "notes", type: "text" },
        ],
        listRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      },
    ];

    const results = [];
    for (const col of collections) {
      try {
        await pb.collections.getOne(col.name);
        results.push({ name: col.name, status: "Exists" });
      } catch {
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
  ) {
    onProgress("Connecting to Cloud Server...", 5);

    // 1. Authenticate
    let authToken: string;
    try {
      const adminEmail = import.meta.env.VITE_CLOUD_ADMIN_EMAIL || "admin@example.com";
      const authResponse = await fetch(`${cloudUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: apiKey,
        }),
      });

      if (!authResponse.ok) {
        throw new Error("Authentication failed");
      }

      const authData = await authResponse.json();
      authToken = authData.token;
    } catch {
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
                workingHours: user.workingHours,
                destinationId: user.destinationId,
              },
            );
          } else {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "POST",
              "/api/collections/users/records",
              {
                name: user.name,
                role: user.role,
                email: user.email,
                workingHours: user.workingHours,
                destinationId: user.destinationId,
                password: import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD as string,
                passwordConfirm: import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD as string,
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
    const localOrders = await apiService.getOrders();
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

    // 4.1 Sync Inventory (Products Stock) - Added for Phase 2
    onProgress("Syncing Inventory Stock...", 80);
    const localProducts = await apiService.getProducts();
    for (const prod of localProducts) {
      try {
        await cloudApiCall(
          cloudUrl,
          authToken,
          "PATCH",
          `/api/collections/products/records/${prod.id}`,
          { stock: prod.stock },
        );
      } catch (e) {
        logger.warn(`Failed to sync product stock`, {
          productId: prod.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // 4.2 Sync Equipment - Added for Phase 2
    onProgress("Syncing Equipment Tracker...", 82);
    const localEquip = await apiService.getEquipment();
    for (const item of localEquip) {
      try {
        try {
          await cloudApiCall(
            cloudUrl,
            authToken,
            "PATCH",
            `/api/collections/equipment/records/${item.id}`,
            item,
          );
        } catch {
          await cloudApiCall(
            cloudUrl,
            authToken,
            "POST",
            "/api/collections/equipment/records",
            item,
          );
        }
      } catch (e) {
        logger.warn(`Failed to sync equipment`, {
          id: item.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // 4.3 Sync Loan Payments - Added for Phase 2
    onProgress("Syncing Loan Payments...", 85);
    try {
      const records = await pb.collection("loan_payments").getFullList();
      for (const pay of records) {
        try {
          try {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "PATCH",
              `/api/collections/loan_payments/records/${pay.id}`,
              pay,
            );
          } catch {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "POST",
              "/api/collections/loan_payments/records",
              pay,
            );
          }
        } catch (e) {
          logger.warn(`Failed to sync loan payment`, {
            id: pay.id,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    } catch (e) {
      logger.warn("Failed to fetch loan payments for sync", { error: e });
    }

    onProgress("Operational Data Synced.", 90);

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
          originalError: e instanceof Error ? e : undefined,
        });
      }
    }

    onProgress("Sync Completed Successfully!", 100);
  },

  async syncLocalToRemote(onProgress: (msg: string, percent: number) => void) {
    onProgress(
      "Feature not fully implemented for Local-to-Remote migration.",
      100,
    );
  },

  /**
   * Force push a single collection to the cloud
   */
  async forcePush(
    collectionName: string,
    cloudUrl: string,
    authToken: string,
  ): Promise<boolean> {
    try {
      logger.info(`[pbManagement] Force pushing ${collectionName}...`);
      const records = await pb.collection(collectionName).getFullList();

      for (const record of records) {
        try {
          // Attempt to patch, then create
          try {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "PATCH",
              `/api/collections/${collectionName}/records/${record.id}`,
              record,
            );
          } catch {
            await cloudApiCall(
              cloudUrl,
              authToken,
              "POST",
              `/api/collections/${collectionName}/records`,
              record,
            );
          }
        } catch {
          logger.error(
            `Failed to push record ${record.id} in ${collectionName}`,
          );
        }
      }
      return true;
    } catch (e) {
      logger.error(`Force push failed for ${collectionName}:`, e);
      return false;
    }
  },
};
