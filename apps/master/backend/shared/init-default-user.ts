// backend/shared/init-default-user.ts
import fs from "fs";
import path from "path";
import { DatabaseManager } from "./db";
import { hashPassword } from "./auth";

export async function initDefaultUser(
  dbManagerOrPath?: DatabaseManager | string,
): Promise<void> {
  const DEFAULT_USER = {
    name: process.env.DEFAULT_ADMIN_NAME || "Admin",
    email: process.env.DEFAULT_ADMIN_EMAIL || "",
    password: process.env.DEFAULT_ADMIN_PASSWORD || "",
    role: "Admin" as const,
    password_must_change: 1,
  };

  // SECURITY: Skip default user creation if credentials not configured
  if (!DEFAULT_USER.email || !DEFAULT_USER.password) {
    console.warn(
      "[Init] DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD must be set via environment variables",
    );
    console.warn("[Init] Skipping default user creation for security");
    return;
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

    const PERMISSIONS: PermissionMap = {
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
      console.warn(
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
        console.warn(
          "[Init] Failed to check users schema:",
          e instanceof Error ? e.message : String(e),
        );
      }

      const insertSql = `INSERT INTO users (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
      dbManager.run(insertSql, values);
    }
  } catch (error) {
    console.error(
      "[Init] Critical error initializing default user:",
      error instanceof Error ? error.message : String(error),
    );
    throw error; // Re-throw to prevent silent failures
  }
}
