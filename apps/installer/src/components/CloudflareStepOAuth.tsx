import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, ArrowLeft, Globe, CheckCircle, AlertCircle, RefreshCw, Link2 } from "lucide-react";
import { InstallerState } from "../types/installer";
import { generateQrDataUrl } from "../utils/qrCode";

interface CloudflareStepOAuthProps {
  state: InstallerState;
  onRequestDeviceCode: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  onPollForToken: (deviceCode: string, intervalMs: number) => Promise<{ success: boolean; data?: unknown; error?: string; status?: number }>;
  onNext: () => void;
  onPrev: () => void;
}

const CloudflareStepOAuth: React.FC<CloudflareStepOAuthProps> = ({
  state,
  onRequestDeviceCode,
  onPollForToken,
  onNext,
  onPrev,
}) => {
  const [phase, setPhase] = useState<"idle" | "pending" | "success" | "expired">("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(0);
  const [pollInterval, setPollInterval] = useState(5000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hub = state.hub;
  const userCode = hub?.user_code || "";
  const verificationUri = hub?.verification_uri || "";
  const deviceCode = hub?.device_code || "";

  useEffect(() => {
    if (hub?.access_token) {
      setPhase("success");
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [hub?.access_token]);

  useEffect(() => {
    if (phase === "pending" && verificationUri) {
      generateQrDataUrl(verificationUri).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }
  }, [phase, verificationUri]);

  useEffect(() => {
    if (phase === "pending" && hub?.expires_at) {
      setExpiresIn(Math.max(0, Math.ceil((hub.expires_at - Date.now()) / 1000)));
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((hub.expires_at - Date.now()) / 1000));
        setExpiresIn(remaining);
        if (remaining <= 0) {
          setPhase("expired");
          if (timerRef.current) clearInterval(timerRef.current);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, hub?.expires_at]);

  useEffect(() => {
    if (phase === "pending" && deviceCode) {
      pollRef.current = setInterval(async () => {
        const result = await onPollForToken(deviceCode, pollInterval);
        if (!result.success && result.data) {
          const data = result.data as Record<string, unknown>;
          const errorCode = String(data.error || "");
          if (errorCode === "slow_down") {
            setPollInterval((prev) => prev + 5000);
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = setInterval(async () => {
                await onPollForToken(deviceCode, pollInterval + 5000);
              }, pollInterval + 5000);
            }
          } else if (errorCode === "expired_token") {
            setPhase("expired");
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      }, pollInterval);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, deviceCode, pollInterval, onPollForToken]);

  const handleConnect = useCallback(async () => {
    setPhase("pending");
    const result = await onRequestDeviceCode();
    if (!result.success) {
      setPhase("idle");
    }
  }, [onRequestDeviceCode]);

  const handleRestart = useCallback(() => {
    setPhase("idle");
    setQrDataUrl(null);
    setExpiresIn(0);
    setPollInterval(5000);
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const openVerificationUrl = useCallback(() => {
    if (verificationUri) {
      window.open(verificationUri, "_blank");
    }
  }, [verificationUri]);

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Connect to ClickFlash Hub</h2>
      <p className="text-sm text-slate-400 mb-4">
        Authorize this studio with your ClickFlash Hub account via OAuth Device Code.
      </p>

      {phase === "idle" && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/10 rounded-2xl mb-4">
            <Globe className="w-8 h-8 text-cyan-400" />
          </div>
          <p className="text-slate-400 mb-4">
            Click the button below to generate a device code. Then authorize it in your Hub admin panel.
          </p>
          <button onClick={handleConnect} className="btn-primary flex items-center gap-2 mx-auto">
            <Link2 className="w-4 h-4" />
            Connect to Hub
          </button>
        </div>
      )}

      {phase === "pending" && (
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-center">
            <p className="text-sm text-cyan-300 mb-2">Your user code</p>
            <p className="text-3xl font-mono font-bold text-cyan-400 tracking-widest">{userCode}</p>
            <p className="text-xs text-cyan-200/60 mt-2">
              Expires in {Math.floor(expiresIn / 60)}:{String(expiresIn % 60).padStart(2, "0")}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            {qrDataUrl && (
              <div className="p-2 bg-white rounded-lg">
                <img src={qrDataUrl} alt="QR Code" className="w-32 h-32" />
              </div>
            )}
            <div className="space-y-2">
              <button onClick={openVerificationUrl} className="btn-secondary flex items-center gap-2 text-sm">
                <Link2 className="w-4 h-4" />
                Open verification URL
              </button>
              <p className="text-xs text-slate-500">
                Or visit: <span className="font-mono text-slate-300">{verificationUri}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Waiting for authorization...
          </div>
        </div>
      )}

      {phase === "success" && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">Hub Connected</span>
          </div>
          <div className="space-y-1 text-xs text-emerald-200/80">
            <p>Tenant: <span className="font-mono">{hub?.tenant_id || "—"}</span></p>
            <p>Access token: <span className="font-mono">Received ✓</span></p>
          </div>
        </div>
      )}

      {phase === "expired" && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span className="text-sm font-semibold text-rose-300">Code Expired</span>
          </div>
          <p className="text-xs text-rose-200/80 mb-3">The device code has expired. Click below to generate a new one.</p>
          <button onClick={handleRestart} className="btn-primary flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" />
            Restart
          </button>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onPrev} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button onClick={onNext} disabled={!hub?.access_token} className="btn-primary flex items-center gap-2">
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CloudflareStepOAuth;
