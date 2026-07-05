import React, { useState, useEffect, useMemo } from "react";
import { ArrowRight, ArrowLeft, Monitor, Wifi, QrCode, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { InstallerState } from "../types/installer";
import QRCode from "qrcode";

interface TouchPairingStepProps {
  state: InstallerState;
  onPair: () => Promise<unknown>;
  onNext: () => void;
  onPrev: () => void;
}

const TouchPairingStep: React.FC<TouchPairingStepProps> = ({
  state,
  onPair,
  onNext,
  onPrev,
}) => {
  const result = state.pairingResult;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualIp, setManualIp] = useState("");

  const qrPayload = useMemo(() => {
    if (!result?.masterIp || !result?.kioskId) return null;
    return JSON.stringify({
      master_url: `http://${result.masterIp}:8090`,
      desk_id: result.kioskId,
      fp: result.hardwareFingerprint,
    });
  }, [result]);

  useEffect(() => {
    if (qrPayload) {
      QRCode.toDataURL(qrPayload, { width: 160, margin: 2 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [qrPayload]);

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Touch Kiosk Pairing</h2>
      <p className="text-sm text-slate-400 mb-4">
        Automatically discover and pair your Touch Kiosk to this Master station.
      </p>

      {!result && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/10 rounded-2xl mb-4">
            <Monitor className="w-8 h-8 text-cyan-400" />
          </div>
          <p className="text-slate-400 mb-4">
            The installer will search for Touch Kiosks on your local network via mDNS and LAN sweep.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onPair}
              disabled={state.isLoading}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${state.isLoading ? "animate-spin" : ""}`} />
              {state.isLoading ? "Searching..." : "Auto-Discover Kiosk"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4 mb-6">
          {result.paired ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">Touch Kiosk Paired</span>
              </div>
              <div className="space-y-1 text-xs text-emerald-200/80">
                <p>Master IP: <span className="font-mono">{result.masterIp}</span></p>
                <p>Latency: <span className="font-mono">{result.latencyMs}ms</span></p>
                <p>Kiosk ID: <span className="font-mono">{result.kioskId || "—"}</span></p>
                <p>HMAC Secret: <span className="font-mono">Exchanged ✓</span></p>
                {result.hardwareFingerprint && (
                  <p className="text-emerald-200/50">
                    HW Fingerprint: <span className="font-mono">{result.hardwareFingerprint}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">No Kiosk Found</span>
              </div>
              <p className="text-xs text-amber-200/80 mb-3">
                No Touch Kiosk detected on the local network. Use the QR code fallback below or enter the Master IP manually.
              </p>
            </div>
          )}

          {/* QR Fallback */}
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">QR Code Fallback</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              If automatic discovery fails, scan this QR code on the Touch Kiosk to pair manually.
            </p>
            {qrDataUrl ? (
              <div className="flex items-center gap-4">
                <img src={qrDataUrl} alt="Pairing QR Code" className="w-40 h-40 rounded border border-slate-700" />
                <div className="space-y-1 text-xs text-slate-400">
                  <p>Master URL: <span className="font-mono text-slate-300">http://{result.masterIp}:8090</span></p>
                  <p>Desk ID: <span className="font-mono text-slate-300">{result.kioskId}</span></p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="input-field flex-1 text-sm"
                />
                <button className="btn-secondary text-sm">Pair</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onPrev} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={onPair}
              disabled={state.isLoading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${state.isLoading ? "animate-spin" : ""}`} />
              Re-scan
            </button>
          )}
          <button onClick={onNext} className="btn-primary flex items-center gap-2">
            {result?.paired ? "Next" : "Skip"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TouchPairingStep;
