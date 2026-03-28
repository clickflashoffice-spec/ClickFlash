import React, { useState, useEffect } from "react";
import Card from "../common/Card.tsx";

interface DataManagementSettingsProps {
  masterImportRetentionDays: number;
  touchKioskRetentionDays: number;
  backupSoldOrders: boolean;
  backupLocation: string;
  autoDeleteEnabled: boolean;
}

import { apiService } from "../../services/apiService";
import { safeStorage } from "../../utils/safeStorage";

const DataManagementSettings: React.FC = () => {
  const [settings, setSettings] = useState<DataManagementSettingsProps>({
    masterImportRetentionDays: 30,
    touchKioskRetentionDays: 7,
    backupSoldOrders: true,
    backupLocation: "pb_data/backup/orders",
    autoDeleteEnabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try to load from backend settings first
        const backendSettings = await apiService.getSetting(
          "data_management_settings",
        );
        if (
          backendSettings &&
          typeof backendSettings === "object" &&
          Object.keys(backendSettings).length > 0
        ) {
          setSettings(backendSettings as DataManagementSettingsProps);
        } else {
          // Fallback to legacy localStorage if backend is empty
          const savedSettings = safeStorage.getItem("dataManagementSettings");
          if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
          }
        }
      } catch (e) {
        console.error("Failed to load data management settings:", e);
        // Last ditch fallback
        const savedSettings = safeStorage.getItem("dataManagementSettings");
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      }
    };

    loadSettings();

    // Load last cleanup timestamp (keep in localStorage as it's purely UI metadata)
    const lastCleanupTime = safeStorage.getItem("lastDataCleanup");
    if (lastCleanupTime) {
      setLastCleanup(lastCleanupTime);
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to backend SQLite
      await apiService.setSetting("data_management_settings", settings as any);

      // Backup save to localStorage for offline redundancy
      safeStorage.setItem("dataManagementSettings", JSON.stringify(settings));

      setIsSaving(false);
      alert("Data management settings saved to database successfully!");
    } catch (e) {
      console.error("Failed to save settings:", e);
      alert("Failed to save settings to server. Please check connection.");
      setIsSaving(false);
    }
  };

  const handleRunCleanup = async () => {
    if (
      !confirm(
        "This will delete old photos from the import folder based on your retention settings. Continue?",
      )
    ) {
      return;
    }

    try {
      const result = await apiService.cleanup(settings as any);
      const now = new Date().toISOString();
      safeStorage.setItem("lastDataCleanup", now);
      setLastCleanup(now);
      alert(result.message || "Cleanup completed successfully!");
    } catch (e) {
      console.error("Cleanup failed:", e);
      alert("Cleanup failed. Please check logs.");
    }
  };

  const handlePruneSessions = async () => {
    if (
      !confirm("This will delete kiosk sessions older than 24 hours. Continue?")
    )
      return;
    try {
      const res = await apiService.pruneSessions(1);
      alert(res.message);
    } catch (e: any) {
      alert("Failed to prune sessions: " + e.message);
    }
  };

  const handleExportDb = () => {
    try {
      apiService.exportDb();
    } catch (e: any) {
      alert("Failed to start download");
    }
  };

  const handleFactoryReset = async () => {
    if (
      !confirm(
        "DANGER: This will delete ALL photos, orders, and albums. This actions cannot be undone. \n\nAre you ABSOLUTELY sure?",
      )
    )
      return;
    if (!confirm('Final Confirmation: Type "YES" to proceed?')) return; // Simplified for now, just double confirm

    try {
      await apiService.resetDb();
      alert("Factory Reset Complete. The application will now reload.");
      window.location.reload();
    } catch (e: any) {
      alert("Reset Failed: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full mr-3"></span>
          Import Folder Retention
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Configure how long photos stay in the Master Portal's import folder
          before automatic deletion.
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="masterImportRetentionDays"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Master Import Folder Retention (Days)
            </label>
            <div className="flex items-center gap-4">
              <input
                id="masterImportRetentionDays"
                type="number"
                min="1"
                max="365"
                value={settings.masterImportRetentionDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    masterImportRetentionDays: parseInt(e.target.value) || 30,
                  })
                }
                className="w-32 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Photos older than {settings.masterImportRetentionDays} days will
                be deleted from the import folder
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              ⚠️ Photos in active albums or with orders will NOT be deleted
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <input
              type="checkbox"
              id="autoDeleteEnabled"
              checked={settings.autoDeleteEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoDeleteEnabled: e.target.checked,
                })
              }
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label
              htmlFor="autoDeleteEnabled"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Enable automatic deletion of old import files
            </label>
          </div>

          {lastCleanup && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Last cleanup: {new Date(lastCleanup).toLocaleString()}
            </div>
          )}

          <button
            onClick={handleRunCleanup}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
          >
            Run Cleanup Now
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <span className="w-1.5 h-6 bg-purple-500 rounded-full mr-3"></span>
          Touch Kiosk Retention
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Configure how long photos stay on Touch Kiosks before automatic
          deletion.
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="touchKioskRetentionDays"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Touch Kiosk Retention (Days)
            </label>
            <div className="flex items-center gap-4">
              <input
                id="touchKioskRetentionDays"
                type="number"
                min="1"
                max="90"
                value={settings.touchKioskRetentionDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    touchKioskRetentionDays: parseInt(e.target.value) || 7,
                  })
                }
                className="w-32 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Photos older than {settings.touchKioskRetentionDays} days will
                be deleted from Touch Kiosks
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              💡 Recommended: 7-14 days to keep kiosk storage manageable
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Photos with active orders or in the cart
              will be preserved regardless of age.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Session Management
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Clear stuck or old kiosk sessions that may be cluttering the
              dashboard.
            </p>
            <button
              onClick={handlePruneSessions}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              Prune Old Sessions
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <span className="w-1.5 h-6 bg-green-500 rounded-full mr-3"></span>
          Order Photo Backup
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Automatically backup photos when orders are completed to prevent data
          loss.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <input
              type="checkbox"
              id="backupSoldOrders"
              checked={settings.backupSoldOrders}
              onChange={(e) =>
                setSettings({ ...settings, backupSoldOrders: e.target.checked })
              }
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label
              htmlFor="backupSoldOrders"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Automatically backup photos when orders are completed
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Backup Location
            </label>
            <input
              type="text"
              value={settings.backupLocation}
              onChange={(e) =>
                setSettings({ ...settings, backupLocation: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm"
              placeholder="pb_data/backup/orders"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Photos will be saved to:{" "}
              <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">
                {settings.backupLocation}/[order-id]/
              </code>
            </p>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>✓ Recommended:</strong> Keep this enabled to ensure sold
              photos are never lost, even if originals are deleted.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <span className="w-1.5 h-6 bg-slate-500 rounded-full mr-3"></span>
          Database Management
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-2">
              Export Database
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Download a raw copy of the SQLite database (`master.db`) for
              external backup or troubleshooting.
            </p>
            <button
              onClick={handleExportDb}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export Database
            </button>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <h4 className="font-bold text-red-800 dark:text-red-200 mb-2">
              Factory Reset
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              Warning: This will permanently delete ALL photos, albums, and
              orders. Configuration settings (Users, Kiosks) will be preserved.
            </p>
            <button
              onClick={handleFactoryReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors w-full"
            >
              Factory Reset
            </button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors shadow-lg"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-2">
          ⚠️ Important Notes
        </h4>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
          <li>Automatic cleanup runs daily at midnight</li>
          <li>Photos in active albums are never deleted</li>
          <li>Photos with orders (pending or completed) are preserved</li>
          <li>
            Backed up order photos are stored separately and not affected by
            retention settings
          </li>
          <li>
            Factory Reset is irreversible. Please export database before
            resetting.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DataManagementSettings;
