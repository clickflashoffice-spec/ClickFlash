/**
 * Update Notification Component
 * Displays update status and allows user to interact with updates
 */

import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react';
import { logger } from '@/utils/logger';

interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version?: string;
  releaseNotes?: string;
}

export const UpdateNotification: React.FC = () => {
  const [status, setStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    downloaded: false,
    error: null,
    progress: 0
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updater = window.electron?.updater;
    if (!updater) return;

    const cleanups = [
      updater.onChecking(() => {
        setStatus(prev => ({ ...prev, checking: true }));
      }),
      updater.onAvailable((info: any) => {
        setStatus(prev => ({
          ...prev,
          checking: false,
          available: true,
          version: info.version,
          releaseNotes: info.releaseNotes
        }));
        setIsVisible(true);
      }),
      updater.onProgress((progress: any) => {
        setStatus(prev => ({ ...prev, progress: progress.percent ?? 0 }));
      }),
      updater.onDownloaded(() => {
        setStatus(prev => ({ ...prev, downloaded: true, progress: 100 }));
      }),
      updater.onError((error: any) => {
        setStatus(prev => ({ ...prev, error: error.message ?? 'Update failed', checking: false }));
      }),
    ];

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  const handleCheckForUpdates = async () => {
    setStatus(prev => ({ ...prev, checking: true }));
    try {
      await window.electron?.updater.check();
    } catch (error) {
      logger.error('Failed to check for updates:', error);
    }
  };

  const handleDownload = async () => {
    try {
      await window.electron?.updater.download();
    } catch (error) {
      logger.error('Failed to download update:', error);
    }
  };

  const handleInstall = () => {
    void window.electron?.updater.install();
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return (
      <button
        onClick={handleCheckForUpdates}
        className="fixed bottom-4 right-4 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg transition-colors z-50"
        title="Check for updates"
      >
        <RefreshCw className={`w-5 h-5 ${status.checking ? 'animate-spin' : ''}`} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {status.error ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : status.downloaded ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <Download className="w-5 h-5 text-blue-500" />
          )}
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {status.error ? 'Update Error' : status.downloaded ? 'Update Ready' : 'Update Available'}
          </h3>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {status.error ? (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{status.error}</p>
      ) : (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            {status.downloaded
              ? `Version ${status.version} has been downloaded and is ready to install.`
              : `Version ${status.version} is available. Would you like to download it now?`}
          </p>

          {status.progress > 0 && status.progress < 100 && (
            <div className="mb-3">
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{status.progress.toFixed(0)}%</p>
            </div>
          )}

          <div className="flex gap-2">
            {status.downloaded ? (
              <button
                onClick={handleInstall}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Install & Restart
              </button>
            ) : (
              <button
                onClick={handleDownload}
                disabled={status.progress > 0}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {status.progress > 0 ? 'Downloading...' : 'Download'}
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Later
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UpdateNotification;
