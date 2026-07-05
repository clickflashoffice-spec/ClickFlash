// apps/master/backend/services/gdprService.ts
/**
 * GDPR Compliance Service
 *
 * Handles customer data consent, export, deletion, retention, DPA generation,
 * and breach logging per GDPR Articles 7, 17, 20, 28, 33, and 34.
 *
 * All operations are irreversibly logged to audit_logs.
 */

import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import crypto from "crypto";

export interface ConsentRecord {
  id: number;
  customer_id: string;
  photo_id: string | null;
  consent_type: string;
  granted_at: string;
  withdrawn_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: string | null;
}

export interface ExportRequest {
  id: number;
  customer_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  format: "json" | "csv";
  created_at: string;
  completed_at: string | null;
  download_url: string | null;
}

export interface DeletionLog {
  id: number;
  customer_id: string;
  deleted_by: string | null;
  deleted_at: string;
  tables_affected: string;
  reason: string | null;
}

export interface BreachIncident {
  id: number;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  discovered_at: string;
  notified_at: string | null;
  affected_count: number;
  status: "open" | "notified" | "resolved" | "closed";
}

export interface RetentionPolicy {
  customerDataYears: number;
  unsoldPhotoDays: number;
  autoPurgeEnabled: boolean;
}

export interface CustomerDataExport {
  customerId: string;
  photos: any[];
  orders: any[];
  consentRecords: ConsentRecord[];
  contactInfo: any;
  exportedAt: string;
}

export class GdprService {
  constructor(
    private db: DatabaseManager,
    private logger: Logger,
  ) {}

  // ── Audit Helper ──────────────────────────────────────────────────────

  private audit(eventType: string, actor: string, targetCustomerId: string, details: Record<string, any>): void {
    try {
      this.db.run(
        `INSERT INTO audit_logs (event_type, actor, target_customer_id, details, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [eventType, actor, targetCustomerId, JSON.stringify(details), new Date().toISOString()],
      );
    } catch (err: any) {
      this.logger.error("[GDPR] Audit log failed", { error: err.message, eventType });
    }
  }

  // ── Consent Management ────────────────────────────────────────────────

  /**
   * Record customer consent for photo usage.
   */
  captureConsent(
    customerId: string,
    photoId: string | null,
    consentType: string,
    metadata: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string,
  ): ConsentRecord {
    const grantedAt = new Date().toISOString();

    const result = this.db.run(
      `INSERT INTO consent_records (customer_id, photo_id, consent_type, granted_at, ip_address, user_agent, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customerId, photoId, consentType, grantedAt, ipAddress || null, userAgent || null, JSON.stringify(metadata)],
    );

    if (photoId) {
      this.db.run(`UPDATE photos SET consent_status = ? WHERE id = ?`, ["granted", photoId]);
    }
    this.db.run(`UPDATE orders SET gdpr_consent = ? WHERE customer_id = ?`, ["granted", customerId]);

    this.audit("CONSENT_CAPTURED", "system", customerId, { photoId, consentType, metadata });
    this.logger.info(`[GDPR] Consent captured`, { customerId, photoId, consentType });

    return {
      id: Number(result.lastInsertRowid),
      customer_id: customerId,
      photo_id: photoId,
      consent_type: consentType,
      granted_at: grantedAt,
      withdrawn_at: null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      metadata: JSON.stringify(metadata),
    };
  }

  /**
   * Withdraw previously granted consent.
   */
  withdrawConsent(customerId: string, photoId: string | null, actor: string = "customer"): ConsentRecord | null {
    const withdrawnAt = new Date().toISOString();

    // Mark the most recent active consent as withdrawn
    const existing = this.db.get<ConsentRecord>(
      `SELECT * FROM consent_records
       WHERE customer_id = ? AND photo_id = ? AND withdrawn_at IS NULL
       ORDER BY granted_at DESC LIMIT 1`,
      [customerId, photoId],
    );

    if (!existing) {
      this.logger.warn(`[GDPR] No active consent to withdraw`, { customerId, photoId });
      return null;
    }

    this.db.run(
      `UPDATE consent_records SET withdrawn_at = ? WHERE id = ?`,
      [withdrawnAt, existing.id],
    );

    if (photoId) {
      this.db.run(`UPDATE photos SET consent_status = ? WHERE id = ?`, ["withdrawn", photoId]);
    }

    this.audit("CONSENT_WITHDRAWN", actor, customerId, { photoId, consentRecordId: existing.id });
    this.logger.info(`[GDPR] Consent withdrawn`, { customerId, photoId, actor });

    return { ...existing, withdrawn_at: withdrawnAt };
  }

  /**
   * Get all consent records for a customer.
   */
  getConsentRecords(customerId: string): ConsentRecord[] {
    return this.db.query<ConsentRecord>(
      `SELECT * FROM consent_records WHERE customer_id = ? ORDER BY granted_at DESC`,
      [customerId],
    );
  }

  // ── Data Export (Article 20) ───────────────────────────────────────────

  /**
   * Export all customer data as a structured JSON object.
   */
  exportCustomerData(customerId: string): CustomerDataExport {
    const photos = this.db.query(
      `SELECT id, filename, path, created, metadata, consent_status FROM photos WHERE customer_id = ?`,
      [customerId],
    );

    const orders = this.db.query(
      `SELECT id, total, status, created, items, gdpr_consent FROM orders WHERE customer_id = ?`,
      [customerId],
    );

    const consentRecords = this.getConsentRecords(customerId);

    const contactInfo = this.db.get(
      `SELECT id, email, phone, name, address, created FROM customers WHERE id = ?`,
      [customerId],
    );

    const exportData: CustomerDataExport = {
      customerId,
      photos,
      orders,
      consentRecords,
      contactInfo,
      exportedAt: new Date().toISOString(),
    };

    this.audit("DATA_EXPORTED", "system", customerId, { photoCount: photos.length, orderCount: orders.length });
    this.logger.info(`[GDPR] Customer data exported`, { customerId, photoCount: photos.length });

    return exportData;
  }

  /**
   * Create an export request record and return the request ID.
   */
  requestDataExport(customerId: string, format: "json" | "csv" = "json"): ExportRequest {
    const result = this.db.run(
      `INSERT INTO data_export_requests (customer_id, status, format, created_at)
       VALUES (?, ?, ?, ?)`,
      [customerId, "pending", format, new Date().toISOString()],
    );

    this.audit("EXPORT_REQUESTED", "system", customerId, { format, requestId: result.lastInsertRowid });
    this.logger.info(`[GDPR] Data export requested`, { customerId, format });

    return {
      id: Number(result.lastInsertRowid),
      customer_id: customerId,
      status: "pending",
      format,
      created_at: new Date().toISOString(),
      completed_at: null,
      download_url: null,
    };
  }

  /**
   * Mark an export request as completed with a download URL.
   */
  completeExportRequest(requestId: number, downloadUrl: string): void {
    this.db.run(
      `UPDATE data_export_requests SET status = ?, completed_at = ?, download_url = ? WHERE id = ?`,
      ["completed", new Date().toISOString(), downloadUrl, requestId],
    );
    this.logger.info(`[GDPR] Export request completed`, { requestId, downloadUrl });
  }

  /**
   * Get pending export requests.
   */
  getPendingExports(): ExportRequest[] {
    return this.db.query<ExportRequest>(
      `SELECT * FROM data_export_requests WHERE status = 'pending' ORDER BY created_at`,
    );
  }

  // ── Data Deletion (Article 17) ───────────────────────────────────────

  /**
   * Irreversibly delete all customer data. No soft-delete.
   */
  deleteCustomerData(customerId: string, deletedBy: string, reason: string = "GDPR erasure request"): DeletionLog {
    const tablesAffected: string[] = [];

    this.db.transaction(() => {
      // Delete photos (physical files should be handled by caller or cascade)
      const photoResult = this.db.run(`DELETE FROM photos WHERE customer_id = ?`, [customerId]);
      if (photoResult.changes > 0) tablesAffected.push("photos");

      // Delete orders
      const orderResult = this.db.run(`DELETE FROM orders WHERE customer_id = ?`, [customerId]);
      if (orderResult.changes > 0) tablesAffected.push("orders");

      // Delete consent records
      const consentResult = this.db.run(`DELETE FROM consent_records WHERE customer_id = ?`, [customerId]);
      if (consentResult.changes > 0) tablesAffected.push("consent_records");

      // Delete export requests
      const exportResult = this.db.run(`DELETE FROM data_export_requests WHERE customer_id = ?`, [customerId]);
      if (exportResult.changes > 0) tablesAffected.push("data_export_requests");

      // Delete customer record
      const customerResult = this.db.run(`DELETE FROM customers WHERE id = ?`, [customerId]);
      if (customerResult.changes > 0) tablesAffected.push("customers");
    });

    const deletionLog = this.db.run(
      `INSERT INTO data_deletion_logs (customer_id, deleted_by, deleted_at, tables_affected, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [customerId, deletedBy, new Date().toISOString(), tablesAffected.join(","), reason],
    );

    this.audit("DATA_DELETED", deletedBy, customerId, { tablesAffected, reason });
    this.logger.warn(`[GDPR] Customer data permanently deleted`, { customerId, deletedBy, tablesAffected });

    return {
      id: Number(deletionLog.lastInsertRowid),
      customer_id: customerId,
      deleted_by: deletedBy,
      deleted_at: new Date().toISOString(),
      tables_affected: tablesAffected.join(","),
      reason,
    };
  }

  // ── Retention Policy ─────────────────────────────────────────────────

  /**
   * Get current retention policy settings.
   */
  getRetentionPolicy(): RetentionPolicy {
    const yearsRow = this.db.get<{ value: string }>(`SELECT value FROM settings WHERE key = 'gdpr_retention_years'`);
    const daysRow = this.db.get<{ value: string }>(`SELECT value FROM settings WHERE key = 'gdpr_unsold_photo_days'`);
    const autoRow = this.db.get<{ value: string }>(`SELECT value FROM settings WHERE key = 'gdpr_auto_purge_enabled'`);

    return {
      customerDataYears: parseInt(yearsRow?.value || "2", 10),
      unsoldPhotoDays: parseInt(daysRow?.value || "30", 10),
      autoPurgeEnabled: (autoRow?.value || "false") === "true",
    };
  }

  /**
   * Apply retention policy: auto-delete data past retention period.
   * Returns summary of deletions.
   */
  applyRetentionPolicy(): { customersDeleted: number; photosDeleted: number; ordersDeleted: number } {
    const policy = this.getRetentionPolicy();
    const now = new Date();
    const cutoffCustomer = new Date(now.getTime() - policy.customerDataYears * 365 * 24 * 60 * 60 * 1000).toISOString();
    const cutoffPhoto = new Date(now.getTime() - policy.unsoldPhotoDays * 24 * 60 * 60 * 1000).toISOString();

    let customersDeleted = 0;
    let photosDeleted = 0;
    let ordersDeleted = 0;

    this.db.transaction(() => {
      // Delete old unsold photos (photos not linked to any order)
      const photoResult = this.db.run(
        `DELETE FROM photos
         WHERE created < ?
           AND id NOT IN (SELECT DISTINCT photo_id FROM order_items WHERE photo_id IS NOT NULL)`,
        [cutoffPhoto],
      );
      photosDeleted = photoResult.changes;

      // Delete old customer data
      const oldCustomers = this.db.query<{ id: string }>(
        `SELECT id FROM customers WHERE created < ?`,
        [cutoffCustomer],
      );

      for (const customer of oldCustomers) {
        this.deleteCustomerData(customer.id, "system", "Retention policy auto-purge");
        customersDeleted++;
      }

      // Delete orphaned orders (no customer)
      const orderResult = this.db.run(
        `DELETE FROM orders WHERE customer_id NOT IN (SELECT id FROM customers)`,
      );
      ordersDeleted = orderResult.changes;
    });

    this.audit("RETENTION_APPLIED", "system", "ALL", {
      customersDeleted,
      photosDeleted,
      ordersDeleted,
      policy,
    });
    this.logger.info(`[GDPR] Retention policy applied`, { customersDeleted, photosDeleted, ordersDeleted });

    return { customersDeleted, photosDeleted, ordersDeleted };
  }

  // ── DPA Generation ────────────────────────────────────────────────────

  /**
   * Generate a Data Processing Agreement document.
   */
  generateDpaDocument(studioName: string, date: string = new Date().toISOString().split("T")[0]): string {
    const hash = crypto.createHash("sha256").update(`${studioName}:${date}`).digest("hex");

    const dpa = `
DATA PROCESSING AGREEMENT
========================

Studio: ${studioName}
Date: ${date}
Version: 1.0
Hash: ${hash}

1. SUBJECT MATTER
   This Agreement governs the processing of personal data (including customer
   photographs and contact information) by ClickFlash software on behalf of
   ${studioName}.

2. DURATION
   Processing shall continue for the duration of the studio's use of the
   ClickFlash platform, subject to the retention policy configured in the
   system (default: 2 years for customer data, 30 days for unsold photos).

3. NATURE AND PURPOSE
   The personal data processed includes:
   - Customer names, email addresses, and phone numbers
   - Photographs captured during photography sessions
   - Order and payment metadata
   The purpose is to provide photography sales, fulfillment, and customer
   relationship management services.

4. TYPES OF PERSONAL DATA
   - Identity data (name, contact details)
   - Image data (photographs, thumbnails, edited versions)
   - Transaction data (orders, payments, refunds)
   - Technical data (IP addresses, device identifiers for consent logging)

5. CATEGORIES OF DATA SUBJECTS
   - Customers (end subjects of photographs)
   - Studio staff and photographers

6. OBLIGATIONS OF THE PROCESSOR (ClickFlash)
   a) Process personal data only on documented instructions from ${studioName}.
   b) Ensure persons authorized to process data are bound by confidentiality.
   c) Implement appropriate technical and organizational measures (TOMs)
      including SQLite encryption, access controls, and audit logging.
   d) Not engage sub-processors without prior specific or general authorization.
   e) Assist the Controller in responding to data subject requests.
   f) Delete or return all personal data at the end of provision of services.
   g) Make available all information necessary to demonstrate compliance.
   h) Allow for and contribute to audits and inspections.

7. SUB-PROCESSORS
   Current sub-processors: Stripe (payments), Cloud Sync provider (optional
   backup), DNP/Thermal printers (on-premise fulfillment).

8. SECURITY MEASURES
   - AES-256 encryption at rest (SQLCipher via better-sqlite3-multiple-ciphers)
   - PBKDF2 key derivation (100,000 iterations)
   - OS keychain integration for encryption keys
   - Audit logging of all data access and modifications
   - Role-based access control (RBAC) with permission matrix

9. DATA BREACH NOTIFICATION
   The Processor shall notify the Controller without undue delay after becoming
   aware of a personal data breach, and in any case within 72 hours.

10. SIGNATURE BLOCK
    This agreement is electronically generated and stored in the system.
    Studio: ${studioName}
    Generated: ${date}
    Document Hash: ${hash}

    By continuing to use ClickFlash, ${studioName} acknowledges acceptance
    of these terms.
`;

    this.audit("DPA_GENERATED", "system", studioName, { date, hash });
    this.logger.info(`[GDPR] DPA generated`, { studioName, date, hash });

    return dpa.trim();
  }

  /**
   * Store a DPA signature record.
   */
  signDpa(studioName: string, signedBy: string, version: string = "1.0"): void {
    const hash = crypto.createHash("sha256").update(`${studioName}:${signedBy}:${new Date().toISOString()}`).digest("hex");
    this.db.run(
      `INSERT INTO dpa_signatures (studio_name, signed_by, signed_at, version, hash)
       VALUES (?, ?, ?, ?, ?)`,
      [studioName, signedBy, new Date().toISOString(), version, hash],
    );
    this.audit("DPA_SIGNED", signedBy, studioName, { version, hash });
  }

  // ── Breach Logging ────────────────────────────────────────────────────

  /**
   * Log a data breach incident for notification tracking.
   */
  logDataBreach(
    description: string,
    severity: "low" | "medium" | "high" | "critical",
    affectedCustomers: string[],
  ): BreachIncident {
    const result = this.db.run(
      `INSERT INTO breach_incidents (description, severity, discovered_at, affected_count, status)
       VALUES (?, ?, ?, ?, ?)`,
      [description, severity, new Date().toISOString(), affectedCustomers.length, "open"],
    );

    this.audit("BREACH_LOGGED", "system", "ALL", {
      description,
      severity,
      affectedCount: affectedCustomers.length,
      affectedCustomers,
    });
    this.logger.error(`[GDPR] Data breach logged`, { severity, affectedCount: affectedCustomers.length, description });

    return {
      id: Number(result.lastInsertRowid),
      description,
      severity,
      discovered_at: new Date().toISOString(),
      notified_at: null,
      affected_count: affectedCustomers.length,
      status: "open",
    };
  }

  /**
   * Mark a breach as notified to supervisory authority.
   */
  markBreachNotified(breachId: number): void {
    this.db.run(
      `UPDATE breach_incidents SET status = ?, notified_at = ? WHERE id = ?`,
      ["notified", new Date().toISOString(), breachId],
    );
    this.audit("BREACH_NOTIFIED", "system", "ALL", { breachId });
  }

  /**
   * Get all breach incidents.
   */
  getBreachIncidents(): BreachIncident[] {
    return this.db.query<BreachIncident>(`SELECT * FROM breach_incidents ORDER BY discovered_at DESC`);
  }

  // ── Statistics ────────────────────────────────────────────────────────

  /**
   * Get GDPR dashboard statistics.
   */
  getStatistics(): {
    totalConsents: number;
    activeConsents: number;
    withdrawnConsents: number;
    pendingExports: number;
    totalDeletions: number;
    openBreaches: number;
  } {
    const totalConsents = this.db.get<{ c: number }>(`SELECT COUNT(*) as c FROM consent_records`)?.c || 0;
    const activeConsents = this.db.get<{ c: number }>(`SELECT COUNT(*) as c FROM consent_records WHERE withdrawn_at IS NULL`)?.c || 0;
    const withdrawnConsents = this.db.get<{ c: number }>(`SELECT COUNT(*) as c FROM consent_records WHERE withdrawn_at IS NOT NULL`)?.c || 0;
    const pendingExports = this.db.get<{ c: number }>(`SELECT COUNT(*) as c FROM data_export_requests WHERE status = 'pending'`)?.c || 0;
    const totalDeletions = this.db.get<{ c: number }>(`SELECT COUNT(*) as c FROM data_deletion_logs`)?.c || 0;
    const openBreaches = this.db.get<{ c: number }>(`SELECT COUNT(*) as c FROM breach_incidents WHERE status = 'open'`)?.c || 0;

    return { totalConsents, activeConsents, withdrawnConsents, pendingExports, totalDeletions, openBreaches };
  }
}

export default GdprService;
