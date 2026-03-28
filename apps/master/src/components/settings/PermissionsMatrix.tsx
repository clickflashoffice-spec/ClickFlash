import React, { useState, useEffect } from "react";
import {
  PERMISSIONS as STATIC_PERMISSIONS,
  ALL_PERMISSIONS,
} from "../../permissions";
import { AppRole, Permission } from "../../types";
import Card from "../common/Card";
import { apiService } from "../../services/apiService";
import { logger } from "../../utils/logger";

const MASTER_PORTAL_ROLES: AppRole[] = ["Admin", "Team Leader", "Photographer"];

const PERMISSION_GROUPS: {
  title: string;
  filter: (p: string) => boolean;
  description?: string;
}[] = [
  {
    title: "Core Access & Navigation",
    filter: (p) => ["viewDashboard", "viewDocumentation"].includes(p),
    description: "Basic access to the portal dashboard and help resources.",
  },
  {
    title: "Albums & Photos",
    filter: (p) => p.includes("Albums"),
    description: "Control over viewing and managing photo albums.",
  },
  {
    title: "Orders & Sales",
    filter: (p) => p.includes("Orders"),
    description: "Access to customer orders and sales data.",
  },
  {
    title: "Team & Bookings",
    filter: (p) => p.includes("Photographers") || p.includes("Bookings"),
    description: "Manage photographer accounts and photo session bookings.",
  },
  {
    title: "Growth & Marketing",
    filter: (p) =>
      ["viewGrowth", "viewMarketing", "viewMoneyTrash"].includes(p),
    description:
      "Access to marketing campaigns, retention stats, and growth tools.",
  },
  {
    title: "People & CRM",
    filter: (p) => ["viewClients"].includes(p),
    description: "Access to client database and customer relationships.",
  },
  {
    title: "System Configuration",
    filter: (p) =>
      p.includes("Settings") ||
      p.includes("SessionTypes") ||
      p.includes("Products"),
    description:
      "Administrative controls for system settings, pricing, and products.",
  },
];

const PermissionsMatrix: React.FC = () => {
  const [permissions, setPermissions] =
    useState<Record<AppRole, Permission[]>>(STATIC_PERMISSIONS);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out permissions that strictly belong to the Management Portal or are too low-level/hidden
  const relevantPermissions = ALL_PERMISSIONS.filter(
    (p) =>
      !p.startsWith("viewManagement") &&
      p !== "manageAdjustments" &&
      p !== "manageEquipmentCategories" &&
      p !== "manageExpenseCategories" &&
      p !== "manageGlobalSettings" &&
      p !== "runPayroll" &&
      p !== "viewDestinations" &&
      p !== "viewReports" &&
      p !== "viewExpenses" &&
      p !== "viewCapital" &&
      p !== "viewAdjustments" &&
      p !== "viewPerformance" &&
      p !== "viewWarehouse" &&
      p !== "viewPayroll" &&
      p !== "viewEcommerceSettings" &&
      p !== "viewGlobalSettings",
  );

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const perms = await apiService.getPermissions();
      setPermissions(perms);
      setError(null);
    } catch (err) {
      logger.error(
        "Failed to load permissions",
        err instanceof Error ? err : new Error(String(err)),
      );
      setError("Failed to load permissions. Using defaults.");
      // Fallback to static permissions (already set)
    }
  };

  const handleTogglePermission = (role: AppRole, permission: Permission) => {
    setPermissions((prev) => {
      const rolePerms = prev[role] || [];
      const hasPerm = rolePerms.includes(permission);

      let newRolePerms;
      if (hasPerm) {
        newRolePerms = rolePerms.filter((p) => p !== permission);
      } else {
        newRolePerms = [...rolePerms, permission];
      }

      return {
        ...prev,
        [role]: newRolePerms,
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Save each role's permissions
      await Promise.all(
        MASTER_PORTAL_ROLES.map((role) =>
          apiService.updatePermissions(role, permissions[role] || []),
        ),
      );

      setHasChanges(false);
      alert("Permissions saved successfully!");

      // Reload to ensure sync (and trigger any listeners in usePermissions)
      await loadPermissions();
      window.location.reload(); // Simple way to ensure all hooks update
    } catch (err) {
      console.error("Failed to save permissions:", err);
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold">Role Capability Matrix</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage access rights for each role within the Master Portal.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {error && <span className="text-red-500 text-sm">{error}</span>}
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-white font-semibold shadow-md transition-colors
                                ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
              <th className="p-4 border-b border-r border-slate-200 dark:border-slate-700 font-bold w-1/3">
                Permission
              </th>
              {MASTER_PORTAL_ROLES.map((role) => (
                <th
                  key={role}
                  className="p-4 border-b border-slate-200 dark:border-slate-700 text-center font-bold w-1/6"
                >
                  <span
                    className={`px-2 py-1 rounded-md text-xs uppercase tracking-wide
                                        ${
                                          role === "Admin"
                                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                                            : role === "Team Leader"
                                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                        }`}
                  >
                    {role}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => {
              const groupPerms = relevantPermissions.filter(group.filter);
              if (groupPerms.length === 0) return null;

              return (
                <React.Fragment key={group.title}>
                  <tr className="bg-slate-100 dark:bg-slate-900/50">
                    <td
                      colSpan={MASTER_PORTAL_ROLES.length + 1}
                      className="p-3 px-4 border-b border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          {group.title}
                        </span>
                        {group.description && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                            {group.description}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {groupPerms.map((permission) => (
                    <tr
                      key={permission}
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-3 px-4 border-r border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {formatPermissionName(permission)}
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {permission}
                        </div>
                      </td>
                      {MASTER_PORTAL_ROLES.map((role) => {
                        const hasPerm =
                          permissions[role]?.includes(
                            permission as Permission,
                          ) || false;
                        return (
                          <td
                            key={`${role}-${permission}`}
                            className="p-3 text-center"
                          >
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              onChange={() =>
                                handleTogglePermission(
                                  role,
                                  permission as Permission,
                                )
                              }
                              className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                              aria-label={`Toggle ${permission} for ${role}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

function formatPermissionName(perm: string): string {
  return perm
    .replace(/([A-Z])/g, " $1") // Insert space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .replace("Own", " Own")
    .replace("All", " All");
}

export default PermissionsMatrix;
