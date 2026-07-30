import React, { memo, useCallback, useEffect, useState } from "react";
import { Copy, RefreshCw, ShieldCheck, Smartphone, Unplug } from "lucide-react";

import {
  mobileCaptureService,
  type MobileCaptureDevice,
  type MobileCapturePairingCode,
} from "@/services/api/mobileCaptureService";
import { logger } from "@/utils/logger";

const MobilePhotographerPairing: React.FC = memo(() => {
  const [pairing, setPairing] = useState<MobileCapturePairingCode | null>(null);
  const [devices, setDevices] = useState<MobileCaptureDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      setDevices(await mobileCaptureService.listDevices());
    } catch (refreshError) {
      logger.error("[MobilePairing] Device refresh failed", refreshError);
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const createCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPairing(await mobileCaptureService.createPairingCode());
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : String(createError);
      setError(message);
      logger.error("[MobilePairing] Code creation failed", createError);
    } finally {
      setLoading(false);
    }
  }, []);

  const revoke = useCallback(
    async (deviceId: string) => {
      if (!window.confirm(`Revoke mobile photographer ${deviceId}?`)) return;
      try {
        await mobileCaptureService.revokeDevice(deviceId);
        await refreshDevices();
      } catch (revokeError) {
        const message =
          revokeError instanceof Error ? revokeError.message : String(revokeError);
        setError(message);
      }
    },
    [refreshDevices]
  );

  const copyToken = useCallback(async () => {
    if (!pairing) return;
    await navigator.clipboard.writeText(pairing.token);
  }, [pairing]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Smartphone className="h-5 w-5 text-cyan-500" />
            Android Photographer Pairing
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create a one-use five-minute code. The code authenticates an ephemeral
            key exchange; it is never stored on disk.
          </p>
        </div>
        <button
          type="button"
          onClick={createCode}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Generate Pairing Code
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {pairing && pairing.expiresAt > Date.now() && (
        <div className="rounded-xl border border-cyan-300 bg-cyan-50 p-4 dark:border-cyan-800 dark:bg-cyan-950/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-800 dark:text-cyan-200">
            <ShieldCheck className="h-4 w-4" />
            One-time code for {pairing.masterId}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-950 px-3 py-3 text-xs text-cyan-200">
              {pairing.token}
            </code>
            <button
              type="button"
              onClick={copyToken}
              className="rounded-lg border border-cyan-300 p-3 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-900/40"
              aria-label="Copy mobile pairing code"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-cyan-700 dark:text-cyan-300">
            Expires {new Date(pairing.expiresAt).toLocaleTimeString()}.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="p-3">Device</th>
              <th className="p-3">Last Seen</th>
              <th className="p-3">Trust</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500">
                  No Android photographer devices paired.
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr
                  key={device.deviceId}
                  className="border-t border-slate-200 dark:border-slate-700"
                >
                  <td className="p-3">
                    <div className="font-semibold">{device.displayName}</div>
                    <code className="text-xs text-slate-500">{device.deviceId}</code>
                  </td>
                  <td className="p-3 text-slate-500">
                    {device.lastSeenAt
                      ? new Date(device.lastSeenAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        device.revokedAt
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {device.revokedAt ? "Revoked" : "Paired"}
                    </span>
                  </td>
                  <td className="p-3">
                    {!device.revokedAt && (
                      <button
                        type="button"
                        onClick={() => revoke(device.deviceId)}
                        className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Unplug className="h-4 w-4" />
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
});

MobilePhotographerPairing.displayName = "MobilePhotographerPairing";

export default MobilePhotographerPairing;

