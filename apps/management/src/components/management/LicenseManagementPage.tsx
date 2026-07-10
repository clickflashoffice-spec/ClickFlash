import React, { useState, useMemo } from "react";
import { Key, ShieldCheck, Cpu, AlertTriangle, Search, Copy, Check, Download, RefreshCw } from "lucide-react";

export interface EnterpriseLicenseRecord {
  id: string;
  resortName: string;
  destinationId: string;
  licenseKey: string;
  tier: "ENTERPRISE" | "PRO" | "RESORT";
  hardwareUuid: string;
  issuedAt: string;
  expiresAt: string;
  status: "ACTIVE" | "WARNING" | "EXPIRED";
  signatureValid: boolean;
}

const INITIAL_LICENSES: EnterpriseLicenseRecord[] = [
  {
    id: "lic-001",
    resortName: "Grand Riviera Beach & Casino",
    destinationId: "DEST-RIV-01",
    licenseKey: "CF-LIVE-eyJyZXNvcnQiOiJHcmFuZCBSaXZpZXJhIiwidGllciI6IkVOVEVSUFJJU0UiLCJleHAiOiIyMDI4LTEyLTMxIn0=.SIG-8F93A4B2C1E7D001",
    tier: "ENTERPRISE",
    hardwareUuid: "49AE-99B1-82C4-FA11",
    issuedAt: "2026-01-15",
    expiresAt: "2028-12-31",
    status: "ACTIVE",
    signatureValid: true,
  },
  {
    id: "lic-002",
    resortName: "Alamo Alpine Ski Resort",
    destinationId: "DEST-ALP-04",
    licenseKey: "CF-LIVE-eyJyZXNvcnQiOiJBbHBpbmUgU2tpIiwidGllciI6IlBSTyIsImV4cCI6IjIwMjctMDYtMzAifQ==.SIG-71B83C29AA41E902",
    tier: "PRO",
    hardwareUuid: "B821-44A0-91C3-11D9",
    issuedAt: "2026-02-01",
    expiresAt: "2027-06-30",
    status: "ACTIVE",
    signatureValid: true,
  },
  {
    id: "lic-003",
    resortName: "Sunset Palms Island Club",
    destinationId: "DEST-SUN-09",
    licenseKey: "CF-LIVE-eyJyZXNvcnQiOiJTdW5zZXQgUGFsbXMiLCJ0aWVyIjoiUkVTT1JUIiwiZXhwIjoiMjAyNi0wNy0xNSJ9.SIG-00A1F3C4B892D110",
    tier: "RESORT",
    hardwareUuid: "009F-11C2-77AA-55EE",
    issuedAt: "2025-07-15",
    expiresAt: "2026-07-15",
    status: "WARNING",
    signatureValid: true,
  },
];

export const LicenseManagementPage: React.FC = () => {
  const [licenses, setLicenses] = useState<EnterpriseLicenseRecord[]>(INITIAL_LICENSES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLicenses = useMemo(() => {
    return licenses.filter((item) => {
      const matchSearch =
        item.resortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.destinationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.hardwareUuid.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTier = selectedTier === "ALL" || item.tier === selectedTier;
      return matchSearch && matchTier;
    });
  }, [licenses, searchQuery, selectedTier]);

  const handleExportCSV = () => {
    const headers = ["ID", "Resort", "Destination ID", "Tier", "Hardware UUID", "Issued At", "Expires At", "Status"];
    const rows = filteredLicenses.map((l) => [
      l.id,
      l.resortName,
      l.destinationId,
      l.tier,
      l.hardwareUuid,
      l.issuedAt,
      l.expiresAt,
      l.status,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "clickflash_enterprise_licenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold uppercase tracking-wider">
            <Key className="w-4 h-4" />
            <span>Cryptographic Fleet Licensing</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Enterprise License Administration</h1>
          <p className="text-slate-400 text-sm mt-1">
            Audit Ed25519 asymmetric CF-LIVE license keys, hardware machine fingerprints, and resort expirations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Active Licenses</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-extrabold text-emerald-400">{licenses.filter((l) => l.status === "ACTIVE").length}</span>
            <ShieldCheck className="w-8 h-8 text-emerald-500/30" />
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Hardware Locked Resorts</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-extrabold text-cyan-400">{licenses.length}</span>
            <Cpu className="w-8 h-8 text-cyan-500/30" />
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Renewals Required (30 Days)</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-3xl font-extrabold text-amber-400">{licenses.filter((l) => l.status === "WARNING").length}</span>
            <AlertTriangle className="w-8 h-8 text-amber-500/30" />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search resort, destination ID or hardware UUID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          {["ALL", "ENTERPRISE", "PRO", "RESORT"].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTier === tier
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Licenses Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Resort / Destination</th>
              <th className="px-6 py-4">Tier</th>
              <th className="px-6 py-4">Hardware UUID Lock</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">CF-LIVE Key</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLicenses.map((lic) => (
              <tr key={lic.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-100">{lic.resortName}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{lic.destinationId}</div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                      lic.tier === "ENTERPRISE"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : lic.tier === "PRO"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-slate-700/50 text-slate-300 border border-slate-600/40"
                    }`}
                  >
                    {lic.tier}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{lic.hardwareUuid}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      lic.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${lic.status === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {lic.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400 truncate max-w-[200px]" title={lic.licenseKey}>
                      {lic.licenseKey}
                    </span>
                    <button
                      onClick={() => handleCopyKey(lic.id, lic.licenseKey)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                      title="Copy full CF-LIVE license key"
                    >
                      {copiedId === lic.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LicenseManagementPage;
