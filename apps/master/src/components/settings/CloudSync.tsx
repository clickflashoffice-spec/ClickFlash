import React, { useState } from "react";
import Card from "../common/Card.tsx";
import { apiService } from "../../services/apiService.ts";
import { cloudConfigService } from "../../services/api/cloudConfigService.ts";
import PageHeader from "../common/PageHeader";

interface SyncDataSummary {
  albums: number;
  photos: number;
  orders: number;
  users: number;
  totalSizeMB: number;
}

interface CloudSyncProps {
  showToast: (message: string) => void;
}

/**
 * CloudSync — Manual sync wizard.
 * Hub URL and credentials now come from the unified cloudConfigService (SQLite-backed).
 * The duplicate URL/API Key input fields have been removed — configure in CloudSettings.
 */
const CloudSync: React.FC<CloudSyncProps> = ({ showToast }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncDataSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusMessage, setUploadStatusMessage] =
    useState("Initializing...");
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(() =>
    localStorage.getItem("lastCloudSyncTime"),
  );

  const handlePrepareSync = async () => {
    setIsLoading(true);
    setError(null);
    setSyncSummary(null);
    try {
      const data = await apiService.exportDataForSync();
      setSyncSummary(data.summary);
    } catch (err) {
      console.error("Failed to prepare sync data:", err);
      setError("Could not gather data from the local database.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartUpload = async () => {
    // Load the hub URL from unified config — no more localStorage dependency
    const config = await cloudConfigService.load();
    const { hubUrl, hubEmail: _hubEmail, hubPassword } = config;

    if (!hubUrl) {
      showToast(
        "Hub URL not configured. Go to Settings → Cloud & Hub Configuration.",
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusMessage("Connecting...");
    setError(null);

    try {
      // Use the Hub URL from the unified config
      const { pbManagement } = await import("../../services/pbManagement.ts");
      await pbManagement.syncLocalToCloud(
        hubUrl,
        hubPassword, // key = password in this context
        (msg: string, percent: number) => {
          setUploadStatusMessage(msg);
          setUploadProgress(percent);
        },
        "",
      );

      const nowISO = new Date().toISOString();
      setLastCloudSync(nowISO);
      localStorage.setItem("lastCloudSyncTime", nowISO);
      showToast("Cloud Sync Successful!");
      setTimeout(() => {
        setIsUploading(false);
        setSyncSummary(null);
      }, 2000);
    } catch (err: any) {
      console.error("Sync failed:", err);
      setError(`Sync failed: ${err.message || "Unknown error"}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cloud Synchronization"
        subtitle="Manual data transmission for online backup and management."
        actions={
          lastCloudSync && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800 text-xs font-medium">
              <span>Last Sync: {new Date(lastCloudSync).toLocaleString()}</span>
            </div>
          )
        }
      />

      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-1">
          Offline-First Architecture
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          This Master Portal operates completely offline. Cloud synchronization
          is <strong>optional and manual</strong>. Hub URL and credentials are
          configured in{" "}
          <span className="font-semibold">
            Settings → Cloud & Hub Configuration
          </span>
          .
        </p>
      </div>

      {/* Sync Package */}
      <Card>
        <div className="flex items-start space-x-3 mb-6">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold">Cloud Sync (Manual)</h2>
              {lastCloudSync && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Last Successful Sync</p>
                  <p className="font-mono font-bold text-green-600 dark:text-green-400">
                    {new Date(lastCloudSync).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Push your local sales, albums, and customer data to the global
              Management Hub.
            </p>
          </div>
        </div>

        {isUploading ? (
          <div className="my-8 space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>{uploadStatusMessage}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={
                  {
                    "--bg-width": `${uploadProgress}%`,
                    width: "var(--bg-width)",
                  } as React.CSSProperties
                }
              ></div>
            </div>
            <p className="text-xs text-slate-500 text-center mt-2">
              Sending data securely to Hub…
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={handlePrepareSync}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-slate-400 shadow-md transition-colors flex items-center"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              )}
              {isLoading ? "Analyzing Database..." : "1. Prepare Data Package"}
            </button>

            {syncSummary && (
              <>
                <div className="hidden sm:block h-px w-8 bg-slate-300 dark:bg-slate-600" />
                <button
                  onClick={handleStartUpload}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors animate-pulse flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  2. Upload to Hub
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-8">
          {error && !syncSummary && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {syncSummary && !isUploading && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                Sync Package Summary
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">
                    Albums
                  </p>
                  <p className="text-xl font-mono">
                    {syncSummary.albums.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">
                    Photos
                  </p>
                  <p className="text-xl font-mono">
                    {syncSummary.photos.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">
                    Orders
                  </p>
                  <p className="text-xl font-mono">
                    {syncSummary.orders.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">
                    Est. Size
                  </p>
                  <p className="text-xl font-mono">
                    {syncSummary.totalSizeMB.toFixed(1)} MB
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CloudSync;
