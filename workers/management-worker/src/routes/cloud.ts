import { sendAuthError, sendNotFoundError, sendInternalError, createErrorResponse, sendDatabaseError } from "../errorHandler.js";

export const handleCloud = async (request: Request, url: URL, env: any, dbManager: any, corsHeaders: any, recordService: any, analyticsService: any, emailRelayService: any, photoProcessor: any, geminiService: any, payload: any) => {
  const deskId = payload?.desk_id || "UNKNOWN";



      // --- PUBLIC: Check desk_id availability (no auth needed — pre-registration check) ---
      // --- PUBLIC: Register a new Master Desk (no auth — first-time pairing) ---
      // Login (Public)
      // Auth Middleware check for other routes
      // --- PUBLIC: Customer Order Lookup (Gallery Auth — no JWT required) ---
      // These endpoints authenticate customers using their order credentials.
      // Orders arrive here via Master → Cloud Sync, so ALL Masters' customers can log in.
      // Debug: Log incoming request path
      // Generic CRUD Records
      // Analytics Routes
      // --- Phase 70: Ingest Daily Audits from Master Apps ---
      // --- Phase 75: Ingest Resort-level BI from Master Apps ---
      // --- Phase 75: Retrieve Resort BI for Management UI ---
      // --- Phase 70: Retrieve Location Audits for Management UI ---


      // --- Phase 35: Fleet Heartbeat Endpoint ---
      if (
        url.pathname === "/api/cloud/heartbeat" &&
        request.method === "POST"
      ) {
        if (!deskId) return sendAuthError("Desk ID required for heartbeat.");

        try {
          const body = (await request.json()) as any;
          await recordService.updateFleetHeartbeat(deskId, body);
          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (hbErr: any) {
          console.error("[Heartbeat] Error:", hbErr.message);
          return sendInternalError(hbErr, "Heartbeat Processing");
        }
      }


      // --- Phase 35: Fleet Status Endpoint ---
      if (url.pathname === "/api/cloud/fleet" && request.method === "GET") {
        const fleet = await recordService.getFleetStatus();
        return Response.json(
          { success: true, fleet },
          { headers: corsHeaders },
        );
      }


      // --- Phase 35: Fleet Stations Endpoint (aliased for FleetService compatibility) ---
      if (
        (url.pathname === "/api/cloud/fleet/stations" ||
          url.pathname === "/api/cloud/fleet/status") &&
        request.method === "GET"
      ) {
        const fleet = await recordService.getFleetStatus();
        return Response.json(fleet, { headers: corsHeaders });
      }


      // --- Phase 35: Per-Station Detail Endpoint ---
      const stationDetailMatch = url.pathname.match(
        /\/api\/cloud\/fleet\/stations\/([^/]+)$/,
      );

      if (stationDetailMatch && request.method === "GET") {
        const stationDeskId = stationDetailMatch[1];
        const fleet = await recordService.getFleetStatus();
        const station = fleet.find((s: any) => s.id === stationDeskId);
        if (!station) return sendNotFoundError("Station");
        return Response.json(station, { headers: corsHeaders });
      }


      // --- Phase 35: Force Sync Endpoint ---
      const forceSyncMatch = url.pathname.match(
        /\/api\/cloud\/fleet\/stations\/([^/]+)\/sync$/,
      );

      if (
        (forceSyncMatch || url.pathname === "/api/cloud/fleet/sync-all") &&
        request.method === "POST"
      ) {
        // Stub: In production, sends a push signal to the target station
        return Response.json(
          { success: true, message: "Sync signal dispatched" },
          { headers: corsHeaders },
        );
      }


      // --- Phase 45: Dispatch Command Endpoint ---
      const commandMatch = url.pathname.match(
        /\/api\/admin\/desks\/([^/]+)\/command$/,
      );

      if (commandMatch && request.method === "POST") {
        if (!payload || payload.role !== "admin")
          return sendAuthError("Admin access required");

        const targetDeskId = commandMatch[1];
        const body = (await request.json()) as { command: string };

        if (!body.command) {
          return createErrorResponse(400, "Bad Request", "Missing command");
        }

        try {
          // Fetch existing commands
          const desk = (await dbManager.get(
            "SELECT pending_commands FROM desks WHERE id = ?",
            [targetDeskId],
          )) as { pending_commands: string } | null;

          if (!desk) return sendNotFoundError("Desk not found");

          const pending = JSON.parse(desk.pending_commands || "[]");
          pending.push(body.command);

          // Update desk record
          await dbManager.run(
            "UPDATE desks SET pending_commands = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [JSON.stringify(pending), targetDeskId],
          );

          return Response.json(
            { success: true, message: `Command ${body.command} queued` },
            { headers: corsHeaders },
          );
        } catch (err: any) {
          return createErrorResponse(500, "Database Error", err.message);
        }
      }


      // ─────────────────────────────────────────────────────────────────────────
      // CLOUD SYNC ROUTES (bi-directional Master ↔ Hub data pipeline)
      // Called by cloudSyncService.ts on every sync cycle
      // ─────────────────────────────────────────────────────────────────────────

      // POST /api/cloud/sync/operations — push operation log batch from a Master desk
      if (
        url.pathname === "/api/cloud/sync/operations" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const body = (await request.json()) as {
          desk_id: string;
          operations: any[];
        };
        const ops = body.operations || [];
        if (ops.length === 0)
          return Response.json(
            { success: true, processed: [] },
            { headers: corsHeaders },
          );

        const destination = await dbManager.get(`
          SELECT d.studio_id, s.billing_tier, s.photos_this_month
          FROM destinations d
          LEFT JOIN studios s ON d.studio_id = s.id
          WHERE d.id = ?
        `, [body.desk_id]) as any;

        const isFreeTier = destination?.billing_tier === 'Free';
        let currentUsage = destination?.photos_this_month || 0;
        let photosAdded = 0;

        const processed: string[] = [];
        for (const op of ops) {
          try {
            // Free Tier Enforcement
            if (isFreeTier && op.table === 'photos' && op.type.toLowerCase() === 'insert') {
              if (currentUsage + photosAdded >= 100) {
                return createErrorResponse(402, "Payment Required", "Free tier limit of 100 photos/month reached. Please upgrade to Pro.", undefined, undefined, corsHeaders);
              }
              photosAdded++;
            }

            await dbManager.run(
              `INSERT OR IGNORE INTO operation_logs (id, desk_id, type, table_name, record_id, payload, timestamp, sequence_number)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                op.id,
                body.desk_id,
                op.type,
                op.table,
                op.record_id,
                typeof op.payload === "string"
                  ? op.payload
                  : JSON.stringify(op.payload),
                op.timestamp,
                op.sequence_number,
              ],
            );
            processed.push(op.id);
          } catch (err) {
            console.error(`[SyncOps] Failed to store op ${op.id}:`, err);
          }
        }

        // Update studio photo usage
        if (photosAdded > 0 && destination?.studio_id) {
          await dbManager.run(
            `UPDATE studios SET photos_this_month = photos_this_month + ? WHERE id = ?`,
            [photosAdded, destination.studio_id]
          );
        }

        return Response.json(
          { success: true, processed },
          { headers: corsHeaders },
        );
      }


      // GET /api/cloud/sync/operations?since_hub_index=N — pull remote ops for bi-directional sync
      // Excludes ops from the requesting desk to avoid echo
      if (
        url.pathname === "/api/cloud/sync/operations" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const sinceIndex = parseInt(
          url.searchParams.get("since_hub_index") || "0",
          10,
        );
        const requestingDeskId = (payload as any).desk_id || "";
        const ops = await dbManager.query(
          `SELECT id, desk_id, type, table_name, record_id, payload, timestamp, sequence_number, rowid as hub_index
           FROM operation_logs
           WHERE rowid > ? AND desk_id != ?
           ORDER BY rowid ASC LIMIT 200`,
          [sinceIndex, requestingDeskId],
        );
        return Response.json(
          { success: true, operations: ops || [] },
          { headers: corsHeaders },
        );
      }


      // POST /api/cloud/sync/order — sync validated orders from Master and send gallery access email
      if (
        url.pathname === "/api/cloud/sync/order" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");

        try {
          const body = (await request.json()) as any;
          const deskId = body.desk_id || (payload as any).desk_id || "unknown";
          const order = body.order;

          if (!order || !order.id || !order.email) {
            return createErrorResponse(
              400,
              "Bad Request",
              "Order must include id and email",
            );
          }

          // Fetch existing order to see if credentials already exist
          const existingOrder = await dbManager.get(
            `SELECT access_pin, magic_link_token FROM orders WHERE id = ? LIMIT 1`,
            [order.id],
          );

          // Generate access credentials if not already assigned
          let accessPin = existingOrder?.access_pin || order.access_pin;
          let magicLinkToken =
            existingOrder?.magic_link_token || order.magic_link_token;
          let isNewAccess = false;

          if (!accessPin) {
            // Generate a secure 6-digit PIN
            accessPin = Math.floor(100000 + Math.random() * 900000).toString();
            // Generate a cryptographically random token for magic link
            magicLinkToken =
              crypto.randomUUID().replace(/-/g, "") +
              crypto.randomUUID().replace(/-/g, "");
            isNewAccess = true;
          }

          const itemsRaw =
            typeof order.items === "string"
              ? order.items
              : JSON.stringify(order.items || []);

          await dbManager.run(
            `INSERT INTO orders (id, date, clientName, email, status, fulfillment_status, total, totalAmount, photographerId, destinationId, paymentMethod, appliedDiscount, items, albumId, desk_id, original_id, access_pin, magic_link_token, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET 
                status = excluded.status, 
                fulfillment_status = excluded.fulfillment_status,
                items = excluded.items,
                updated_at = CURRENT_TIMESTAMP`,
            [
              order.id,
              order.date || new Date().toISOString(),
              order.clientName || "Guest",
              order.email,
              order.status || "paid",
              order.fulfillment_status || "synced",
              order.total || 0,
              order.totalAmount || 0,
              order.photographerId || "",
              order.destinationId || "",
              order.paymentMethod || "",
              order.appliedDiscount || 0,
              itemsRaw,
              order.albumId || "",
              deskId,
              order.original_id || order.id,
              accessPin,
              magicLinkToken,
            ],
          );

          // Send notification email if these are new credentials
          if (isNewAccess) {
            const galleryUrl = `https://gallery.clickflash.com`; // ToDo: Make environment variable if needed
            const magicLink = `${galleryUrl}/access?token=${magicLinkToken}`;

            const emailHtml = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                      <h2>Your Photos are Ready!</h2>
                      <p>Hi ${order.clientName || "Guest"},</p>
                      <p>Your high-resolution photos from your recent ClickFlash session are now available for download.</p>
                      <p><strong>Option 1:</strong> Access your gallery instantly via this secure link:</p>
                      <p><a href="${magicLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View My Photos</a></p>
                      <p><strong>Option 2:</strong> Go to <a href="${galleryUrl}">${galleryUrl}</a> and log in using your email and this secure PIN:</p>
                      <h3 style="letter-spacing: 5px; font-size: 24px; color: #007bff;">${accessPin}</h3>
                      <p>Thank you for choosing ClickFlash!</p>
                  </div>
              `;

            await emailRelayService.sendEmail({
              to: order.email,
              from: env.FROM_EMAIL || "support@clickflash.com",
              fromName: "ClickFlash Photography",
              subject: "Your High-Res Photos are Ready for Download",
              html: emailHtml,
              text: `Your photos are ready! View them here: ${magicLink} or use PIN: ${accessPin}`,
            });
          }

          return Response.json(
            { success: true, orderId: order.id, accessPin },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          console.error(`[SyncOrder] Failed to sync order:`, e);
          return sendDatabaseError(e);
        }
      }


      // POST /api/cloud/sync/batch — generic batch upsert for system_stats, retention stats, etc.
      if (
        url.pathname === "/api/cloud/sync/batch" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const body = (await request.json()) as { table: string; items: any[] };
        const { table, items } = body;
        if (!table || !items?.length)
          return Response.json(
            { success: true, processed: 0 },
            { headers: corsHeaders },
          );

        // Allowlist of tables safe for generic upsert
        const ALLOWED = ["system_stats", "fleet_heartbeats", "retention_stats"];
        if (!ALLOWED.includes(table))
          return createErrorResponse(
            400,
            "Bad Request",
            `Table '${table}' not allowed for batch upsert`,
          );

        const ALLOWED_COLUMNS: Record<string, string[]> = {
          system_stats: ["desk_id", "retention_queue_size", "retention_potential_value", "retention_status", "last_updated"],
          fleet_heartbeats: ["desk_id", "last_seen", "metrics", "updated_at"],
          retention_stats: ["id", "desk_id", "month", "returning_customers", "new_customers", "retention_rate", "created_at"],
        };

        let count = 0;
        for (const item of items) {
          try {
            const keys = Object.keys(item).filter((k) => ALLOWED_COLUMNS[table].includes(k));
            if (keys.length === 0) continue;
            const placeholders = keys.map(() => "?").join(", ");
            const setClause = keys
              .map((k) => `${k} = excluded.${k}`)
              .join(", ");
            const values = keys.map((k) => (item as Record<string, unknown>)[k]);
            await dbManager.run(
              `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})
               ON CONFLICT(desk_id) DO UPDATE SET ${setClause}`,
              values,
            );
            count++;
          } catch (e) {
            console.error(`[SyncBatch] Failed to upsert into ${table}:`, e);
          }
        }
        return Response.json(
          { success: true, processed: count },
          { headers: corsHeaders },
        );
      }


      // POST /api/cloud/heartbeat — store fleet heartbeat per desk
      // ── Phase 51: Global Settings Propagation to Masters ──────────────
      // GET /api/cloud/sync/settings?hash=XXX — Masters pull global settings
      if (
        url.pathname === "/api/cloud/sync/settings" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const clientHash = url.searchParams.get("hash") || "";

        try {
          // Fetch all propagatable settings (website_*, global_*, currency_*, receipt_*)
          const rows = (await dbManager.query(
            `SELECT id, value FROM settings 
             WHERE id LIKE 'website_%' 
                OR id LIKE 'global_%'
                OR id LIKE 'currency_%'
                OR id LIKE 'receipt_%'
                OR id LIKE 'session_type_%'
             ORDER BY id`,
          )) as Array<{ id: string; value: string }>;

          // Compute hash of all settings for change detection
          const settingsPayload = JSON.stringify(rows);
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            encoder.encode(settingsPayload),
          );
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const serverHash = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
            .substring(0, 16);

          if (clientHash === serverHash) {
            return Response.json(
              { changed: false, hash: serverHash },
              { headers: corsHeaders },
            );
          }

          return Response.json(
            { changed: true, hash: serverHash, settings: rows },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          console.error("[SyncSettings] Error:", e);
          return sendInternalError(e, "Settings Sync");
        }
      }


      // POST /api/cloud/heartbeat — store fleet heartbeat per desk
      if (
        url.pathname === "/api/cloud/heartbeat" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const hb = (await request.json()) as any;
        const deskId = hb.desk_id || (payload as any).desk_id || "unknown";

        let commandsToDispatch: string[] = [];
        try {
          const deskData = (await dbManager.get(
            "SELECT pending_commands FROM desks WHERE id = ?",
            [deskId],
          )) as { pending_commands: string } | null;
          if (deskData && deskData.pending_commands) {
            const parsed = JSON.parse(deskData.pending_commands);
            if (Array.isArray(parsed) && parsed.length > 0) {
              commandsToDispatch = parsed;
              // Clear the queue so we don't send them twice
              await dbManager.run(
                "UPDATE desks SET pending_commands = '[]' WHERE id = ?",
                [deskId],
              );
            }
          }
        } catch (err) {
          console.error(
            `[Heartbeat] Failed to read pending commands for ${deskId}:`,
            err,
          );
        }

        await dbManager.run(
          `INSERT INTO fleet_heartbeats (desk_id, last_seen, metrics, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(desk_id) DO UPDATE SET last_seen = excluded.last_seen, metrics = excluded.metrics, updated_at = CURRENT_TIMESTAMP`,
          [
            deskId,
            hb.timestamp || new Date().toISOString(),
            JSON.stringify(hb.metrics || {}),
          ],
        );

        return Response.json(
          { success: true, commands: commandsToDispatch },
          { headers: corsHeaders },
        );
      }


      // POST /api/cloud/poll-orders — return paid orders for a requesting desk's fulfillment queue
      if (
        url.pathname === "/api/cloud/poll-orders" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        const deskId = (payload as any).desk_id || "";
        const rows = await dbManager.query(
          `SELECT id, orderNumber, items, status, clientName, email, albumId, totalAmount, deskId
           FROM orders
           WHERE status = 'paid' AND (deskId = ? OR desk_id = ?)
           ORDER BY created_at ASC LIMIT 20`,
          [deskId, deskId],
        );
        return Response.json(
          { success: true, items: rows || [] },
          { headers: corsHeaders },
        );
      }


      // POST /api/cloud/sync/photo — sync a photo metadata and optionally upload file
      if (
        url.pathname === "/api/cloud/sync/photo" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const form = await request.formData();
          const deskId = form.get("desk_id") as string || (payload as any).desk_id;
          const photoStr = form.get("photo") as string;
          
          if (!photoStr) {
            return createErrorResponse(400, "Bad Request", "Missing photo metadata");
          }
          
          const photo = JSON.parse(photoStr);
          const file = form.get("file") as File | null;
          
          // Upsert metadata into D1
          await dbManager.run(
            `INSERT INTO photos (
              id, albumId, url, originalFilename, fileSize, mimeType, 
              manualEdits, autoEnhanced, desk_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET 
              manualEdits = excluded.manualEdits,
              autoEnhanced = excluded.autoEnhanced,
              updated_at = CURRENT_TIMESTAMP`,
            [
              photo.id, photo.albumId, photo.url, photo.originalName, photo.size, 
              photo.mimeType, 
              photo.manualEdits ? JSON.stringify(photo.manualEdits) : null, 
              photo.autoEnhanced || 0,
              deskId,
              photo.created_at || new Date().toISOString()
            ]
          );

          // Upload file to R2 if provided
          if (file) {
            const r2Key = `${deskId}/${photo.albumId}/${photo.url || photo.id}`;
            const buf = await file.arrayBuffer();
            await env.GALLERY_BUCKET.put(r2Key, buf, {
              httpMetadata: { contentType: file.type || photo.mimeType || "image/jpeg" },
              customMetadata: {
                deskId,
                albumId: photo.albumId,
                photoId: photo.id,
              },
            });
            console.log(`[SyncPhoto] Stored in R2: ${r2Key} (${buf.byteLength} bytes)`);
          }
          
          return Response.json(
            { success: true, id: photo.id },
            { headers: corsHeaders }
          );
        } catch (e: any) {
          console.error("[SyncPhoto] Error:", e);
          return createErrorResponse(500, "Sync Error", e.message);
        }
      }


      // POST /api/cloud/upload-photo/chunk — chunked R2 upload
      // R2 key format: {deskId}/{albumId}/{originalName} — prevents cross-master collision
      if (
        url.pathname === "/api/cloud/upload-photo/chunk" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const form = await request.formData();
          const deskId =
            (form.get("deskId") as string) ||
            (payload as any).desk_id ||
            "unknown";
          const albumId = (form.get("albumId") as string) || "unscoped";
          const photoId = form.get("photoId") as string;
          const orderId = form.get("orderId") as string;
          const originalName = (form.get("originalName") as string) || photoId;
          const chunkIndex = parseInt(form.get("chunkIndex") as string, 10);
          const totalChunks = parseInt(form.get("totalChunks") as string, 10);
          const file = form.get("file") as File | null;

          if (!file)
            return createErrorResponse(
              400,
              "Bad Request",
              "Missing file chunk",
            );

          // Build scoped R2 key — desk_id namespace prevents any cross-master collision
          const r2Key = `${deskId}/${albumId}/${originalName}`;

          if (totalChunks === 1 || chunkIndex === totalChunks - 1) {
            // Single chunk or final chunk — simple put
            const buf = await file.arrayBuffer();
            await env.GALLERY_BUCKET.put(r2Key, buf, {
              httpMetadata: { contentType: file.type || "image/webp" },
              customMetadata: {
                deskId,
                albumId,
                photoId,
                orderId: orderId || "",
              },
            });
            console.log(
              `[R2 Upload] Stored: ${r2Key} (${buf.byteLength} bytes)`,
            );
            return Response.json(
              { success: true, key: r2Key },
              { headers: corsHeaders },
            );
          }

          // Multi-chunk: store chunk temporarily with index suffix
          const chunkKey = `chunks/${r2Key}.chunk${chunkIndex}`;
          const buf = await file.arrayBuffer();
          await env.GALLERY_BUCKET.put(chunkKey, buf);
          return Response.json(
            { success: true, chunkKey },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          console.error("[R2 Upload] Error:", e);
          return createErrorResponse(500, "Upload Error", e.message);
        }
      }


      // ── Phase 6: Automated SQLite-to-D1 Incremental Backups ──────────────
      // POST /api/cloud/backup/incremental (or /api/cloud/backup/snapshot or upload)
      if (
        (url.pathname === "/api/cloud/backup/incremental" ||
          url.pathname === "/api/cloud/backup/snapshot" ||
          url.pathname === "/api/cloud/backup/upload") &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const contentType = request.headers.get("content-type") || "";
          let deskId = (payload as any).desk_id || "unknown";
          let checksum = "";
          let since = "";
          let type = "incremental";
          let buf: ArrayBuffer;

          if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
            const form = await request.formData();
            if (form.get("deskId")) deskId = form.get("deskId") as string;
            if (form.get("checksum")) checksum = form.get("checksum") as string;
            if (form.get("since")) since = form.get("since") as string;
            if (form.get("type")) type = form.get("type") as string;
            const file = form.get("file") as File | null;
            if (!file) {
              return createErrorResponse(400, "Bad Request", "Missing backup file payload");
            }
            buf = await file.arrayBuffer();
          } else {
            // Raw binary stream upload
            checksum = request.headers.get("x-backup-checksum") || "";
            since = request.headers.get("x-backup-since") || "";
            type = request.headers.get("x-backup-type") || "incremental";
            if (request.headers.get("x-desk-id")) deskId = request.headers.get("x-desk-id")!;
            buf = await request.arrayBuffer();
            if (!buf || buf.byteLength === 0) {
              return createErrorResponse(400, "Bad Request", "Empty backup payload");
            }
          }

          // Checksum verification (SHA-256)
          if (checksum) {
            const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const calculatedHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
            if (calculatedHex.toLowerCase() !== checksum.toLowerCase()) {
              return createErrorResponse(400, "Bad Request", `Checksum verification failed (expected ${checksum}, got ${calculatedHex})`);
            }
          }

          const backupId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const r2Key = `backups/${deskId}/${backupId}-${type}.zip`;

          // Store in R2 if bucket binding is present
          if (env.BACKUP_BUCKET) {
            await env.BACKUP_BUCKET.put(r2Key, buf, {
              httpMetadata: { contentType: "application/zip" },
              customMetadata: { deskId, backupId, type, since: since || "", checksum: checksum || "" },
            });
          }

          // Record metadata in D1
          await dbManager.run(
            `INSERT INTO cloud_backups (id, desk_id, r2_key, type, since, checksum, size_bytes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [backupId, deskId, r2Key, type, since || null, checksum || null, buf.byteLength],
          );

          // Retention policy: keep last 20 backups per desk
          try {
            const oldBackups = await dbManager.query(
              `SELECT id, r2_key FROM cloud_backups WHERE desk_id = ? ORDER BY created_at DESC OFFSET 20`,
              [deskId],
            );
            if (oldBackups && oldBackups.length > 0) {
              for (const old of oldBackups) {
                try {
                  if (env.BACKUP_BUCKET) await env.BACKUP_BUCKET.delete(old.r2_key);
                  await dbManager.run(`DELETE FROM cloud_backups WHERE id = ?`, [old.id]);
                } catch (_) {}
              }
            }
          } catch (retentionErr) {
            console.warn("[Backup Retention] Cleanup non-fatal error:", retentionErr);
          }

          console.log(`[Backup Ingestion] Stored ${type} backup for desk ${deskId}: ${r2Key} (${buf.byteLength} bytes)`);
          return Response.json(
            { success: true, backupId, key: r2Key, checksum, sizeBytes: buf.byteLength },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          console.error("[Backup Ingestion] Error:", e);
          return createErrorResponse(500, "Backup Error", e.message);
        }
      }

      // GET /api/cloud/backup/incremental (or /api/cloud/backup/list) — retrieve backup history
      if (
        (url.pathname === "/api/cloud/backup/incremental" ||
          url.pathname === "/api/cloud/backup/list" ||
          url.pathname === "/api/cloud/backup/snapshot" ||
          url.pathname === "/api/cloud/backup/upload") &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const deskId = url.searchParams.get("deskId") || (payload as any).desk_id || "";
          const limit = parseInt(url.searchParams.get("limit") || "20", 10);
          const rows = await dbManager.query(
            `SELECT * FROM cloud_backups WHERE desk_id = ? ORDER BY created_at DESC LIMIT ?`,
            [deskId, limit],
          );
          return Response.json(
            { success: true, backups: rows || [] },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          console.error("[Backup List] Error:", e);
          return createErrorResponse(500, "Database Error", e.message);
        }
      }


      // ── Phase 45: Global Configuration Push ──────────────────────────────
      // GET /api/cloud/sync/settings — Master nodes poll this for global settings
      if (
        url.pathname === "/api/cloud/sync/settings" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const clientHash = url.searchParams.get("hash") || "";

          // Fetch propagatable settings
          const rows = await dbManager.query(
            `SELECT id, value FROM settings
             WHERE id LIKE 'global_%'
                OR id LIKE 'currency_%'
                OR id LIKE 'session_type_%'
                OR id LIKE 'receipt_%'
                OR id LIKE 'website_%'
             ORDER BY id`,
          );

          if (!rows || rows.length === 0) {
            return Response.json(
              { changed: false, hash: "" },
              { headers: corsHeaders },
            );
          }

          // Generate simple SHA-1 hash to avoid sending unchanged payloads
          const payloadString = JSON.stringify(rows);
          const encoder = new TextEncoder();
          const data = encoder.encode(payloadString);
          const hashBuffer = await crypto.subtle.digest("SHA-1", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const currentHash = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          if (clientHash === currentHash) {
            return Response.json(
              { changed: false, hash: currentHash },
              { headers: corsHeaders },
            );
          }

          return Response.json(
            { changed: true, hash: currentHash, settings: rows },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "Sync Settings GET");
        }
      }


      // GET /api/cloud/global-config — list all propagatable settings for admin UI
      if (
        url.pathname === "/api/cloud/global-config" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const rows = await dbManager.query(
            `SELECT id, value, updated_at FROM settings
             WHERE id LIKE 'global_%'
                OR id LIKE 'currency_%'
                OR id LIKE 'session_type_%'
             ORDER BY id`,
          );
          return Response.json(
            { success: true, settings: rows || [] },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "GlobalConfig GET");
        }
      }


      // PUT /api/cloud/global-config — admin writes a single key/value to D1
      // Masters will pick it up on their next heartbeat via GET /api/cloud/sync/settings
      if (
        url.pathname === "/api/cloud/global-config" &&
        request.method === "PUT"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const body = (await request.json()) as { key: string; value: string };
          const { key, value } = body;
          if (!key || value === undefined)
            return createErrorResponse(
              400,
              "Bad Request",
              "key and value are required",
            );

          // Allowlist: only global_*, currency_*, session_type_* keys
          const ALLOWED_PREFIXES = [
            "global_",
            "currency_",
            "session_type_",
            "receipt_",
            "website_",
          ];
          if (!ALLOWED_PREFIXES.some((p) => key.startsWith(p)))
            return createErrorResponse(
              400,
              "Bad Request",
              `Key '${key}' not allowed for global config push`,
            );

          await dbManager.run(
            `INSERT INTO settings (id, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
            [key, String(value)],
          );

          console.log(
            `[GlobalConfig] Set ${key} by desk ${(payload as any).desk_id || "admin"}`,
          );
          return Response.json(
            { success: true, key, value },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "GlobalConfig PUT");
        }
      }


      // ── Phase 45: Maintenance Command Queue ──────────────────────────────
      // POST /api/cloud/maintenance/command — hub admin queues a command for a specific Master
      if (
        url.pathname === "/api/cloud/maintenance/command" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const body = (await request.json()) as {
            desk_id: string;
            command: string;
            args?: Record<string, unknown>;
          };
          const { desk_id, command, args } = body;
          if (!desk_id || !command)
            return createErrorResponse(
              400,
              "Bad Request",
              "desk_id and command are required",
            );

          // Allowlist — only these commands can be queued
          const ALLOWED_COMMANDS = [
            "restart_backend",
            "clear_temp",
            "force_sync",
            "reindex_faces",
            "push_to_kiosk",
            "log_report",
          ];
          if (!ALLOWED_COMMANDS.includes(command))
            return createErrorResponse(
              400,
              "Bad Request",
              `Command '${command}' is not in the allowlist`,
            );

          const id = crypto.randomUUID();
          await dbManager.run(
            `INSERT INTO maintenance_commands (id, desk_id, command, args, status, created_at)
             VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [id, desk_id, command, JSON.stringify(args || {})],
          );

          return Response.json(
            { success: true, id, desk_id, command },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "Maintenance Command");
        }
      }


      // GET /api/cloud/maintenance/next?desk_id=X — Master polls for its pending commands
      if (
        url.pathname === "/api/cloud/maintenance/next" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const deskId =
            url.searchParams.get("desk_id") || (payload as any).desk_id || "";
          if (!deskId)
            return createErrorResponse(400, "Bad Request", "desk_id required");

          const row = await dbManager.get(
            `SELECT id, command, args FROM maintenance_commands
             WHERE desk_id = ? AND status = 'pending'
             ORDER BY created_at ASC LIMIT 1`,
            [deskId],
          );

          return Response.json(
            { success: true, command: row || null },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "Maintenance Next");
        }
      }


      // POST /api/cloud/maintenance/ack — Master reports result of executed command
      if (
        url.pathname === "/api/cloud/maintenance/ack" &&
        request.method === "POST"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const body = (await request.json()) as { id: string; result: string };
          const { id, result } = body;
          if (!id)
            return createErrorResponse(400, "Bad Request", "id required");

          await dbManager.run(
            `UPDATE maintenance_commands
             SET status = 'acked', result = ?, acked_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [result || "ok", id],
          );

          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (e: any) {
          return sendInternalError(e, "Maintenance Ack");
        }
      }


      // ── Phase 46: AI Sales Forecasting Endpoint ──────────────────────────
      // GET /api/cloud/analytics/forecast
      if (
        url.pathname === "/api/cloud/analytics/forecast" &&
        request.method === "GET"
      ) {
        if (!payload) return sendAuthError("Auth required");
        try {
          const today = new Date().toISOString().split("T")[0];

          // 1. Today's aggregated metrics
          const todayRow = (await dbManager.get(
            `SELECT
              COUNT(*) as orders_today,
              COALESCE(SUM(total), 0) as revenue_today
             FROM orders
             WHERE date(created_at) = ?`,
            [today],
          )) as { orders_today: number; revenue_today: number } | null;

          const ordersToday = todayRow?.orders_today ?? 0;
          const revenueToday = todayRow?.revenue_today ?? 0;

          // 2. Rolling 7-day history for conversion baseline
          const historyRows = (await dbManager.query(
            `SELECT
              date(created_at) as day,
              COUNT(*) as orders,
              COALESCE(SUM(total), 0) as revenue
             FROM orders
             WHERE date(created_at) >= date('now', '-7 days')
               AND date(created_at) < date('now')
             GROUP BY day
             ORDER BY day DESC`,
          )) as { day: string; orders: number; revenue: number }[];

          // 3. Average Order Value from last 7 days
          const totalHistoricOrders = historyRows.reduce(
            (s, r) => s + r.orders,
            0,
          );
          const totalHistoricRevenue = historyRows.reduce(
            (s, r) => s + r.revenue,
            0,
          );
          const aov =
            totalHistoricOrders > 0
              ? totalHistoricRevenue / totalHistoricOrders
              : 0;

          // 4. Conversion rate = orders / day (7-day average)
          const avgDailyOrders =
            historyRows.length > 0
              ? totalHistoricOrders / historyRows.length
              : ordersToday;

          // 5. Hour-of-day extrapolation
          const nowHour = new Date().getUTCHours();
          const elapsedFraction = Math.max(nowHour / 24, 0.05); // avoid div by 0
          const projectedDailyOrders = Math.round(
            ordersToday / elapsedFraction,
          );
          const projectedDailyRevenue = projectedDailyOrders * aov;

          // 6. End-of-week projection (remaining days × avg)
          const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat
          const remainingDays = Math.max(0, 7 - dayOfWeek);
          const projectedWeekRevenue =
            revenueToday + remainingDays * avgDailyOrders * aov;

          // 7. Trend direction vs yesterday
          const yesterdayRow = historyRows.find((r) => {
            const yesterday = new Date(Date.now() - 86400000)
              .toISOString()
              .split("T")[0];
            return r.day === yesterday;
          });
          const trendVsYesterday = yesterdayRow
            ? ((revenueToday - yesterdayRow.revenue) /
                Math.max(yesterdayRow.revenue, 1)) *
              100
            : 0;

          return Response.json(
            {
              success: true,
              today: {
                date: today,
                orders: ordersToday,
                revenue: revenueToday,
              },
              projections: {
                end_of_day_revenue:
                  Math.round(projectedDailyRevenue * 100) / 100,
                end_of_week_revenue:
                  Math.round(projectedWeekRevenue * 100) / 100,
                trend_vs_yesterday_pct: Math.round(trendVsYesterday * 10) / 10,
              },
              meta: {
                aov: Math.round(aov * 100) / 100,
                avg_daily_orders_7d: Math.round(avgDailyOrders * 10) / 10,
                history: historyRows,
              },
            },
            { headers: corsHeaders },
          );
        } catch (e: any) {
          return sendInternalError(e, "AI Forecast GET");
        }
      }
  return null;
};
