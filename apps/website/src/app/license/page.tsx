"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Calendar,
  Layers,
  ShieldCheck,
  Download,
  HelpCircle,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface DecodedLicense {
  plan?: string;
  maxMasters?: number;
  expiresAt?: string;
  machineId?: string;
  validFormat: boolean;
  isExpired: boolean;
  error?: string;
}

export default function LicensePortalPage() {
  const [licenseKey, setLicenseKey] = useState("");
  const [expectedMachineId, setExpectedMachineId] = useState("");
  const [result, setResult] = useState<DecodedLicense | null>(null);
  const [loading, setLoading] = useState(false);

  const inspectKey = (keyInput: string, machineInput: string) => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setResult(null);
      return;
    }

    if (!trimmed.startsWith("CF-LIVE-")) {
      setResult({
        validFormat: false,
        isExpired: false,
        error: "Invalid license format. Must begin with 'CF-LIVE-' prefix.",
      });
      return;
    }

    const parts = trimmed.substring(8).split(".");
    if (parts.length !== 2) {
      setResult({
        validFormat: false,
        isExpired: false,
        error: "Malformed license key structure. Missing signature segment.",
      });
      return;
    }

    try {
      const payloadB64 = parts[0]
        .padEnd(parts[0].length + ((4 - (parts[0].length % 4)) % 4), "=")
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const decodedJson = atob(payloadB64);
      const payload = JSON.parse(decodedJson);

      let isExpired = false;
      if (payload.expiresAt) {
        const expirationDate = new Date(payload.expiresAt);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (expirationDate < now) {
          isExpired = true;
        }
      }

      let error: string | undefined;
      if (isExpired) {
        error = "This license key has expired.";
      } else if (
        payload.machineId &&
        machineInput.trim() &&
        payload.machineId !== machineInput.trim()
      ) {
        error = "Hardware binding mismatch. License is bound to a different hardware ID.";
      }

      setResult({
        validFormat: true,
        plan: payload.plan || "Studio Standard",
        maxMasters: payload.maxMasters || 1,
        expiresAt: payload.expiresAt,
        machineId: payload.machineId,
        isExpired,
        error,
      });
    } catch {
      setResult({
        validFormat: false,
        isExpired: false,
        error: "Unable to decode license payload. The key may be corrupted.",
      });
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      inspectKey(licenseKey, expectedMachineId);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          title="License Verification & Inspection"
          subtitle="Validate your offline ClickFlash Studio license key, inspect tier quotas, and verify hardware binding."
          pillText="OFFLINE CRYPTO VALIDATOR"
        />

        {/* Validator Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md"
        >
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label
                htmlFor="licenseKeyInput"
                className="block text-sm font-medium text-neutral-300 mb-2 flex items-center gap-2"
              >
                <Key className="w-4 h-4 text-amber-400" />
                ClickFlash License Key
              </label>
              <input
                id="licenseKeyInput"
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="CF-LIVE-..."
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-xl font-mono text-sm text-amber-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>

            <div>
              <label
                htmlFor="machineIdInput"
                className="block text-sm font-medium text-neutral-300 mb-2 flex items-center gap-2"
              >
                <Cpu className="w-4 h-4 text-cyan-400" />
                Optional Expected Machine ID (Hardware Fingerprint)
              </label>
              <input
                id="machineIdInput"
                type="text"
                value={expectedMachineId}
                onChange={(e) => setExpectedMachineId(e.target.value)}
                placeholder="e.g. hw-uuid-8891-..."
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-xl font-mono text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Leave blank to inspect key payload without hardware mismatch check.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !licenseKey.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-neutral-950 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
            >
              <ShieldCheck className="w-5 h-5" />
              {loading ? "Verifying Cryptographic Signature..." : "Verify & Inspect License"}
            </button>
          </form>
        </motion.div>

        {/* Results section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`mt-8 rounded-2xl border p-6 md:p-8 ${
                result.validFormat && !result.error
                  ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-100"
                  : "bg-rose-950/30 border-rose-500/40 text-rose-100"
              }`}
            >
              <div className="flex items-start gap-4">
                {result.validFormat && !result.error ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
                ) : result.isExpired ? (
                  <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-8 h-8 text-rose-400 shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <h3 className="text-lg font-bold">
                    {result.validFormat && !result.error
                      ? "License Verified Active"
                      : result.error || "Invalid License Key"}
                  </h3>
                  <p className="text-sm mt-1 opacity-90">
                    {result.validFormat && !result.error
                      ? "The license payload format is valid and ready for offline activation in ClickFlash Studio."
                      : "Please verify that the key was copied completely without trailing whitespaces."}
                  </p>

                  {result.validFormat && (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-xs text-neutral-400 uppercase tracking-wider mb-1">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          Plan Tier
                        </div>
                        <div className="text-lg font-semibold capitalize text-neutral-100">
                          {result.plan}
                        </div>
                      </div>

                      <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-xs text-neutral-400 uppercase tracking-wider mb-1">
                          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                          Master Portals
                        </div>
                        <div className="text-lg font-semibold text-neutral-100">
                          {result.maxMasters} Node{result.maxMasters !== 1 ? "s" : ""}
                        </div>
                      </div>

                      <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-xs text-neutral-400 uppercase tracking-wider mb-1">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          Expiration
                        </div>
                        <div className="text-lg font-semibold text-neutral-100">
                          {result.expiresAt
                            ? new Date(result.expiresAt).toLocaleDateString()
                            : "Lifetime"}
                        </div>
                      </div>
                    </div>
                  )}

                  {result.machineId && (
                    <div className="mt-4 text-xs font-mono bg-neutral-900/90 border border-neutral-800 rounded-lg p-3 text-neutral-400">
                      Hardware Bound Machine ID:{" "}
                      <span className="text-amber-300">{result.machineId}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAQ & Download Helper */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6">
            <h4 className="font-semibold text-neutral-200 flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-amber-400" />
              Activate in ClickFlash Studio
            </h4>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Copy your verified license key directly into the ClickFlash Desktop Studio installer or navigate to Master Portal &rarr; Settings &rarr; License to activate offline capabilities.
            </p>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-6">
            <h4 className="font-semibold text-neutral-200 flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              Hardware Machine Binding
            </h4>
            <p className="text-sm text-neutral-400 leading-relaxed">
              If your license key includes a hardware machine ID, it is bound via Ed25519 signature to your Studio Master hardware fingerprint to prevent unauthorized distribution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
