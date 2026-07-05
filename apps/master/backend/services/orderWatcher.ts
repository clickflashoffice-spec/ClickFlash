import fs from "fs";
import path from "path";
import { WebSocket, WebSocketServer } from "ws";
import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';

import { OrderValidationService } from "../services/OrderValidationService";

export class OrderWatcher {
  private dbManager: DatabaseManager;
  private logger: Logger;
  private wss: WebSocketServer | undefined;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private validationService: OrderValidationService;
  private pollingInterval: number = 30000;

  constructor(dbManager: DatabaseManager, logger: Logger, context: any) {
    this.dbManager = dbManager;
    this.logger = logger;
    this.wss = context.wss;

    // Fix: OrderValidationService requires all infrastructure dependencies
    this.validationService = new OrderValidationService(
      dbManager,
      logger,
      context.emailService,
      context.hardwareService,
      context.fulfillmentSlipService,
      process.env.JWT_SECRET || "fallback-secret",
    );
  }

  public start() {
    if (this.intervalId) return;
    this.logger.info(
      "[OrderWatcher] Starting service (Dynamic Polling Mode)...",
    );

    this.scan();
    this.scheduleNextScan();
  }

  private scheduleNextScan() {
    if (this.intervalId) clearTimeout(this.intervalId);
    this.intervalId = setTimeout(() => {
      this.scan().then(() => this.scheduleNextScan());
    }, this.pollingInterval);
  }

  public stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  private async scan() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      interface KioskRow {
        id: string;
        name: string;
        ordersFolderPath: string;
      }
      // Fetch all kiosks with valid order paths
      const kiosks = this.dbManager.query<KioskRow>(
        "SELECT * FROM kiosks WHERE ordersFolderPath IS NOT NULL AND ordersFolderPath != ''",
      );

      if (!kiosks || kiosks.length === 0) {
        this.pollingInterval = 30000; // Slow down when no kiosks configured
        return;
      }

      // Law 09 Optimization: Speed up when active kiosks are detected
      this.pollingInterval = 5000;

      // Parallel Scanning with Concurrency Limit (Batch Size: 10)
      const CONCURRENCY_LIMIT = 10;
      const chunks = [];
      for (let i = 0; i < kiosks.length; i += CONCURRENCY_LIMIT) {
        chunks.push(kiosks.slice(i, i + CONCURRENCY_LIMIT));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map((kiosk) => this.processKiosk(kiosk)));
      }
    } catch (error: any) {
      this.logger.error("[OrderWatcher] Scan failed", error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processKiosk(kiosk: any) {
    let orderImportPath = kiosk.ordersFolderPath;
    if (orderImportPath) orderImportPath = orderImportPath.trim();

    if (!orderImportPath) return;

    // 1. Validate Access / Attempt Creation
    try {
      await fs.promises.access(orderImportPath, fs.constants.R_OK);
    } catch (e) {
      try {
        // Only attempt creation if it doesn't exist (and likely local)
        try {
          await fs.promises.access(orderImportPath);
        } catch {
          await fs.promises.mkdir(orderImportPath, { recursive: true });
          this.logger.info(
            `[OrderWatcher] Created missing folder for kiosk ${kiosk.name}: "${orderImportPath}"`,
          );
        }
      } catch (mkdirErr) {
        // Network path offline, etc.
        return;
      }
    }

    // 2. Read Directory
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(orderImportPath, {
        withFileTypes: true,
      });
    } catch (readErr) {
      return;
    }

    // 3. Filter Items
    const orderFolders = entries.filter(
      (dirent) =>
        dirent.isDirectory() &&
        dirent.name.startsWith("order-") &&
        !dirent.name.endsWith(".processed"),
    );

    const orderFiles = entries.filter(
      (dirent) =>
        dirent.isFile() &&
        dirent.name.endsWith(".json") &&
        !dirent.name.endsWith(".processed.json") &&
        !dirent.name.endsWith(".tmp"),
    );

    // 4. Process Content (Sequential within Kiosk to avoid overwhelming single disk)
    for (const folder of orderFolders) {
      await this.processOrderFolder(
        path.join(orderImportPath, folder.name),
        folder.name,
        kiosk,
      );
    }

    for (const file of orderFiles) {
      await this.processOrderFile(
        path.join(orderImportPath, file.name),
        file.name,
        kiosk,
      );
    }
  }

  private async processOrderFolder(
    folderPath: string,
    folderName: string,
    kiosk: any,
  ) {
    const metadataPath = path.join(folderPath, "metadata.json");

    try {
      await fs.promises.access(metadataPath);
    } catch {
      return;
    }

    try {
      const rawData = await fs.promises.readFile(metadataPath, "utf8");
      const orderData = JSON.parse(rawData);
      const orderId =
        orderData.id || orderData.orderId || folderName.replace("order-", "");

      await this.importOrder(orderId, orderData, kiosk, "folder", folderPath);
    } catch (e: any) {
      this.logger.error(`[OrderWatcher] Failed folder import: ${folderName}`, {
        error: e.message,
      });
    }
  }

  private async processOrderFile(
    filePath: string,
    fileName: string,
    kiosk: any,
  ) {
    try {
      const rawData = await fs.promises.readFile(filePath, "utf8");
      const orderData = JSON.parse(rawData);
      const orderId = orderData.id || orderData.orderId;

      if (!orderId) return;

      await this.importOrder(orderId, orderData, kiosk, "file", filePath);
    } catch (error: any) {
      this.logger.error(`[OrderWatcher] Error processing file ${fileName}`, {
        error: error.message,
      });
    }
  }

  private async importOrder(
    orderId: string,
    orderData: any,
    kiosk: any,
    type: "folder" | "file",
    sourcePath: string,
  ) {
    // Check for duplicate
    const exists = this.dbManager.get("SELECT id FROM orders WHERE id = ?", [
      orderId,
    ]);
    if (exists) {
      this.logger.info(
        `[OrderWatcher] Skipping duplicate order ID: ${orderId} (Already Imported)`,
      );
      // Mark as processed without re-importing
      this.markAsProcessed(sourcePath, type);
      return;
    }

    const now = new Date().toISOString();
    const itemsJson = JSON.stringify(orderData.items || []);

    this.dbManager.run(
      `INSERT INTO orders (
                id, date, clientName, email, phone, status, total, 
                items, paymentMethod, appliedDiscount, source, 
                albumId, roomNumber, kioskId, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        orderData.date || orderData.created_at || orderData.orderDate || now,
        orderData.clientName || orderData.customerName || "",
        orderData.email || "",
        orderData.phone || "",
        orderData.status || "Pending",
        orderData.total || orderData.totalAmount || 0,
        itemsJson,
        orderData.paymentMethod || "Unknown",
        orderData.appliedDiscount || 0,
        "kiosk",
        orderData.albumId || "",
        orderData.roomNumber || "",
        kiosk.id,
        orderData.created_at || now,
        now,
      ],
    );

    this.markAsProcessed(sourcePath, type);
    this.logger.info(
      `[OrderWatcher] Imported ${type === "folder" ? "Folder" : "JSON"} Order ${orderId} from kiosk "${kiosk.name}"`,
    );

    // Broadcast via Realtime
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "NEW_ORDER_IMPORTED",
              payload: {
                orderId: orderId,
                kioskId: kiosk.id,
                kioskName: kiosk.name,
                timestamp: now,
              },
            }),
          );
        }
      });
    }

    // Rule: Trigger Order Validation (Split Logic)
    const status = (orderData.status || "").toLowerCase();
    if (status === "paid" || status === "verified") {
      try {
        const items = orderData.items || [];
        const assetIds = items.map((i: any) =>
          typeof i === "string" ? i : i.photoId || i.id,
        );
        const albumId = orderData.albumId;

        if (albumId && assetIds.length > 0) {
          this.validationService.validateOrder(orderId, albumId, assetIds);
        }
      } catch (err: any) {
        this.logger.error(
          `[OrderWatcher] Validation Trigger Failed for ${orderId}: ${err.message}`,
        );
      }
    }
  }

  private markAsProcessed(sourcePath: string, type: "folder" | "file") {
    try {
      const suffix = type === "folder" ? ".processed" : ".processed.json";
      // Simple rename: /path/to/order-123 -> /path/to/order-123.processed
      // or /path/to/order.json -> /path/to/order.json.processed.json
      fs.renameSync(sourcePath, `${sourcePath}${suffix}`);
    } catch (e: any) {
      this.logger.warn(
        `[OrderWatcher] Failed to mark ${sourcePath} as processed`,
        e,
      );
    }
  }
}

export default function startOrderWatcher(context: any) {
  const watcher = new OrderWatcher(context.dbManager, context.logger, context);
  watcher.start();
  return watcher;
}
