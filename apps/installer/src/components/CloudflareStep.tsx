import React, { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Key, Globe, Server, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { InstallerState, CURRENCIES } from "../types/installer";

interface CloudflareStepProps {
  state: InstallerState;
  onTestToken: (token: string) => Promise<{ success: boolean; accounts?: Array<{ id: string; name: string }>; error?: string }>;
  onRegister: (
    studioName: string,
    location: string,
    country: string,
    timezone: string,
    currency: string,
    cloudApiUrl: string
  ) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  onNext: () => void;
  onPrev: () => void;
}

const CloudflareStep: React.FC<CloudflareStepProps> = ({
  state,
  onTestToken,
  onRegister,
  onNext,
  onPrev,
}) => {
  const [token, setToken] = useState("");
  const [cloudApiUrl, setCloudApiUrl] = useState("https://management.clickflash.app");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [registrationAttempted, setRegistrationAttempted] = useState(false);

  // Auto-fill from state
  useEffect(() => {
    if (state.cloudflareToken) setToken(state.cloudflareToken);
    if (state.cloudflareAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(state.cloudflareAccounts[0].id);
    }
  }, [state.cloudflareToken, state.cloudflareAccounts, selectedAccount]);

  const handleTest = async () => {
    if (!token.trim()) return;
    await onTestToken(token.trim());
  };

  const handleRegister = async () => {
    setRegistrationAttempted(true);
    const result = await onRegister(
      state.studioProfile.studioName || "New Studio",
      state.studioProfile.location || "Unknown",
      "US",
      state.studioProfile.timezone,
      state.studioProfile.currency,
      cloudApiUrl
    );
    if (result.success) {
      // Auto-advance after short delay
      setTimeout(onNext, 1500);
    }
  };

  return (
    <div className="step-card max-w-2xl mx-auto mt-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Cloudflare Account</h2>
      <p className="text-sm text-slate-400 mb-4">
        Connect to your Cloudflare account to enable global sync and fleet management.
      </p>

      {/* API Token Input */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Cloudflare API Token
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your Cloudflare API token..."
              className="input-field flex-1"
            />
            <button
              onClick={handleTest}
              disabled={state.isLoading || !token.trim()}
              className="btn-secondary flex items-center gap-2 shrink-0"
            >
              {state.isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              Test
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Create a token at{" "}
            <a
              href="https://dash.cloudflare.com/profile/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              dash.cloudflare.com
            </a>{" "}
            with D1, R2, Workers, and Pages edit permissions.
          </p>
        </div>

        {/* Account Selector */}
        {state.cloudflareAccounts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Select Account
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="input-field"
            >
              {state.cloudflareAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.id.slice(0, 8)}...)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Management Hub URL */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Management Hub URL
          </label>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            <input
              type="url"
              value={cloudApiUrl}
              onChange={(e) => setCloudApiUrl(e.target.value)}
              className="input-field flex-1"
            />
          </div>
        </div>
      </div>

      {/* Fleet Registration Status */}
      {state.fleetRegistered && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">Fleet Registered</span>
          </div>
          <p className="text-xs text-emerald-200/80">
            Desk ID: <span className="font-mono">{state.deskId}</span>
          </p>
          {state.fleetResponse?.peers && state.fleetResponse.peers.length > 0 && (
            <p className="text-xs text-emerald-200/80 mt-1">
              Connected to {state.fleetResponse.peers.length} peer studio(s).
            </p>
          )}
        </div>
      )}

      {registrationAttempted && !state.fleetRegistered && state.error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span className="text-sm text-rose-300">Registration failed. Check logs below.</span>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onPrev} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {!state.fleetRegistered ? (
            <button
              onClick={handleRegister}
              disabled={state.isLoading || !state.cloudflareToken}
              className="btn-primary flex items-center gap-2"
            >
              <Server className="w-4 h-4" />
              {state.isLoading ? "Registering..." : "Register Fleet"}
            </button>
          ) : (
            <button onClick={onNext} className="btn-primary flex items-center gap-2">
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudflareStep;
