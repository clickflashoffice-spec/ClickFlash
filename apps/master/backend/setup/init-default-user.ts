// backend/shared/init-default-user.ts
import fs from "fs";
import path from "path";
import { DatabaseManager } from '../database/db';
import { hashPassword } from '../utils/passwordUtils';
import { logger } from '../utils/logger';

export async function initDefaultUser(
  dbManagerOrPath?: DatabaseManager | string,
): Promise<void> {
  const DEFAULT_USER = {
    name: process.env.DEFAULT_ADMIN_NAME || "Admin",
    email: process.env.DEFAULT_ADMIN_EMAIL || "admin@clickflash.local",
    password: process.env.DEFAULT_ADMIN_PASSWORD || "ClickFlash2025!",
    role: "Admin" as const,
    password_must_change: 1,
  };

  // Only fall through to one-time password generation if both vars are explicitly
  // cleared to empty strings (i.e. operator wants fully custom first-run flow).
  if (!DEFAULT_USER.email || !DEFAULT_USER.password) {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "pb_data");
    const credFile = path.join(dataDir, "FIRST_RUN_CREDENTIALS.txt");

    // Only auto-generate if credentials file doesn't already exist
    if (!fs.existsSync(credFile)) {
      const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
      const pw = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      DEFAULT_USER.email = "admin@clickflash.local";
      DEFAULT_USER.password = pw;
      DEFAULT_USER.name = "Admin";
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(
          credFile,
          [
            "ClickFlash Master OS — First Run Credentials",
            "=============================================",
            `Email:    ${DEFAULT_USER.email}`,
            `Password: ${DEFAULT_USER.password}`,
            "",
            "Delete this file after logging in and changing your password.",
            `Generated: ${new Date().toISOString()}`,
          ].join("\n"),
          "utf8",
        );
        logger.warn(`[Init] First-run credentials written to: ${credFile}`);
      } catch (e) {
        logger.error("[Init] Failed to write first-run credentials file:", e instanceof Error ? e.message : String(e));
        return;
      }
    } else {
      // Credentials file exists — parse it to get the password for this boot
      try {
        const lines = fs.readFileSync(credFile, "utf8").split("\n");
        const emailLine = lines.find((l) => l.startsWith("Email:"));
        const pwLine = lines.find((l) => l.startsWith("Password:"));
        if (emailLine && pwLine) {
          DEFAULT_USER.email = emailLine.replace("Email:", "").trim();
          DEFAULT_USER.password = pwLine.replace("Password:", "").trim();
        } else {
          return; // malformed file — skip
        }
      } catch {
        return;
      }
    }
  }

  let dbManager: DatabaseManager;

  if (
    dbManagerOrPath &&
    typeof dbManagerOrPath !== "string" &&
    "get" in dbManagerOrPath
  ) {
    dbManager = dbManagerOrPath as DatabaseManager;
  } else {
    const dbPath =
      typeof dbManagerOrPath === "string"
        ? path.join(dbManagerOrPath, "data.db")
        : path.join(process.cwd(), "pb_data", "data.db");
    if (!fs.existsSync(dbPath)) return;
    dbManager = new DatabaseManager(dbPath);
    dbManager.connect();
  }

  try {
    const existingUsers = dbManager.query<{ count: number }>(
      "SELECT COUNT(*) as count FROM users",
    );
    const userCount = existingUsers[0]?.count || 0;

    const ALL_PERMISSIONS = [
      "viewDashboard",
      "viewAlbums",
      "manageOwnAlbums",
      "manageAllAlbums",
      "viewOrders",
      "viewOwnOrders",
      "viewAllOrders",
      "viewPhotographers",
      "managePhotographers",
      "viewBookings",
      "manageBookings",
      "viewSettings",
      "manageLocalSettings",
      "manageSystemInfrastructure",
      "manageSessionTypes",
      "viewProducts",
      "manageProducts",
      "viewManagementDashboard",
      "viewDestinations",
      "viewReports",
      "viewExpenses",
      "viewCapital",
      "viewAdjustments",
      "manageAdjustments",
      "viewPerformance",
      "viewWarehouse",
      "manageEquipmentCategories",
      "viewPayroll",
      "runPayroll",
      "viewEcommerceSettings",
      "viewGlobalSettings",
      "manageGlobalSettings",
      "viewDocumentation",
      "manageExpenseCategories",
      "viewMoneyTrash",
      "viewClients",
      "viewMarketing",
      "viewGrowth",
    ];

    const PERMISSIONS: Record<string, string[]> = {
      Photographer: [
        "viewDashboard",
        "viewAlbums",
        "manageOwnAlbums",
        "viewOrders",
        "viewOwnOrders",
        "viewBookings",
        "viewDocumentation",
        "viewProducts",
      ],
      "Team Leader": [
        "viewDashboard",
        "viewAlbums",
        "manageAllAlbums",
        "viewOrders",
        "viewAllOrders",
        "viewPhotographers",
        "viewBookings",
        "manageBookings",
        "viewSettings",
        "manageLocalSettings",
        "manageSessionTypes",
        "viewDocumentation",
        "viewProducts",
        "manageProducts",
        "viewClients",
        "viewGrowth",
      ],
      Admin: [
        "viewDashboard",
        "viewAlbums",
        "manageOwnAlbums",
        "manageAllAlbums",
        "viewOrders",
        "viewOwnOrders",
        "viewAllOrders",
        "viewPhotographers",
        "managePhotographers",
        "viewBookings",
        "manageBookings",
        "viewSettings",
        "manageLocalSettings",
        "manageSystemInfrastructure",
        "manageSessionTypes",
        "viewDocumentation",
        "viewProducts",
        "manageProducts",
        "viewManagementDashboard",
        "viewDestinations",
        "viewReports",
        "viewExpenses",
        "viewCapital",
        "viewAdjustments",
        "viewPerformance",
        "viewWarehouse",
        "viewPayroll",
        "viewEcommerceSettings",
        "viewGlobalSettings",
        "viewMoneyTrash",
        "viewClients",
        "viewMarketing",
        "viewGrowth",
      ],
      Manager: [
        "viewManagementDashboard",
        "viewDestinations",
        "viewReports",
        "viewExpenses",
        "viewCapital",
        "viewAdjustments",
        "manageAdjustments",
        "viewPerformance",
        "viewWarehouse",
        "viewPayroll",
        "runPayroll",
        "viewEcommerceSettings",
        "viewGlobalSettings",
        "manageGlobalSettings",
        "manageExpenseCategories",
        "manageEquipmentCategories",
        "manageSessionTypes",
        "viewDocumentation",
        "viewDashboard",
        "viewAlbums",
        "viewOrders",
        "viewPhotographers",
        "viewBookings",
        "viewSettings",
        "manageLocalSettings",
        "manageSystemInfrastructure",
        "viewProducts",
        "manageProducts",
        "viewMoneyTrash",
        "viewClients",
        "viewMarketing",
      ],
      CEO: ALL_PERMISSIONS,
    };

    try {
      const tableCheck = dbManager.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='role_permissions'",
      );
      if (tableCheck.length > 0) {
        const permCount = dbManager.query<{ count: number }>(
          "SELECT COUNT(*) as count FROM role_permissions",
        );
        if (permCount[0]?.count === 0) {
          dbManager.transaction(() => {
            const insert = dbManager
              .getDb()
              .prepare(
                "INSERT INTO role_permissions (role, permission) VALUES (?, ?)",
              );
            Object.entries(PERMISSIONS).forEach(([role, perms]) => {
              perms.forEach((perm) => insert.run(role, perm));
            });
          });
        }
      }
    } catch (e) {
      logger.warn(
        "[Init] Failed to initialize role permissions:",
        e instanceof Error ? e.message : String(e),
      );
    }

    const defaultUser = dbManager.get<{ role: string }>(
      "SELECT * FROM users WHERE email = ?",
      [DEFAULT_USER.email],
    );
    if (userCount === 0 || !defaultUser) {
      const hashedPassword = await hashPassword(DEFAULT_USER.password);
      let columns = ["name", "email", "password", "role"];
      let placeholders = ["?", "?", "?", "?"];
      let values: any[] = [
        DEFAULT_USER.name,
        DEFAULT_USER.email,
        hashedPassword,
        DEFAULT_USER.role,
      ];

      try {
        const schemaInfo = dbManager.query<{ name: string }>(
          "PRAGMA table_info(users)",
        );
        if (schemaInfo.some((col) => col.name === "password_must_change")) {
          columns.push("password_must_change");
          placeholders.push("?");
          values.push(DEFAULT_USER.password_must_change);
        }
      } catch (e) {
        logger.warn(
          "[Init] Failed to check users schema:",
          e instanceof Error ? e.message : String(e),
        );
      }

      const insertSql = `INSERT INTO users (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
      dbManager.run(insertSql, values);
    }
  } catch (error) {
    logger.error(
      "[Init] Critical error initializing default user:",
      error instanceof Error ? error.message : String(error),
    );
    throw error; // Re-throw to prevent silent failures
  }
}
