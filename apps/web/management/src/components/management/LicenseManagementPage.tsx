import React, { useState, useMemo } from "react";
import { Key, ShieldCheck, Cpu, AlertTriangle, Search, Copy, Check, Download, RefreshCw, Plus, X } from "lucide-react";
import { pb } from "@/services/pb";
import { logger } from "@/utils/logger";

export interface EnterpriseLicenseRecord {
  id: string;
  resortName: string;
  destinationId: string;
  licenseKey: string;
  tier: "ENTERPRISE" | "PRO" | "STARTER";
  hardwareUuid: string;
  issuedAt: string;
  expiresAt: string;
  status: "ACTIVE" | "WARNING" | "EXPIRED";
  signatureValid: boolean;
}

const INITIAL_LICENSES: EnterpriseLicenseRecord[] = [];

export const LicenseManagementPage: React.FC = () => {
  const [licenses, setLicenses] = useState<EnterpriseLicenseRecord[]>(INITIAL_LICENSES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [newLicenseForm, setNewLicenseForm] = useState({
    resortName: "",
    destinationId: "",
    hardwareUuid: "",
    tier: "PRO",
    expiresAt: "",
  });

  const handleCopyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const response = await fetch(`${pb.baseUrl}/api/admin/licenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify(newLicenseForm)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "License generation failed");
      }
      
      if (data.success && data.license) {
        // Create a blob and download it
        const jsonStr = JSON.stringify(data.license, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `license-${newLicenseForm.hardwareUuid}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Add to UI
        const newRecord: EnterpriseLicenseRecord = {
          id: `lic-${Date.now()}`,
          resortName: newLicenseForm.resortName,
          destinationId: newLicenseForm.destinationId,
          licenseKey: data.license.key,
          tier: newLicenseForm.tier as "ENTERPRISE" | "PRO" | "STARTER",
          hardwareUuid: newLicenseForm.hardwareUuid,
          issuedAt: String(data.license.createdAt).split('T')[0],
          expiresAt: data.license.expiresAt || "Unknown",
          status: "ACTIVE",
          signatureValid: true
        };
        
        setLicenses([newRecord, ...licenses]);
        setIsModalOpen(false);
        setNewLicenseForm({ resortName: "", destinationId: "", hardwareUuid: "", tier: "PRO", expiresAt: "" });
      } else {
        alert("Failed to generate license: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      logger.error("License generation failed", err);
      alert(err instanceof Error ? err.message : "Error contacting the management backend.");
    } finally {
      setIsGenerating(false);
    }
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
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold uppercase tracking-wider">
            <Key className="w-4 h-4" />
            <span>Cryptographic Fleet Licensing</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Enterprise License Administration</h1>
          <p className="text-slate-400 text-sm mt-1">
            Audit Ed25519 license tokens, hardware machine fingerprints, and resort expirations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            Issue New License
          </button>
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
          {["ALL", "ENTERPRISE", "PRO", "STARTER"].map((tier) => (
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
              <th className="px-6 py-4">RSA-4096 Token</th>
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
                      title="Copy full Ed25519 license token"
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

      {/* Issue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-lg font-bold">Issue Cryptographic License</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGenerateLicense} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Resort Name</label>
                  <input required value={newLicenseForm.resortName} onChange={e => setNewLicenseForm({...newLicenseForm, resortName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" placeholder="e.g. Grand Alpine" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Destination ID</label>
                  <input required value={newLicenseForm.destinationId} onChange={e => setNewLicenseForm({...newLicenseForm, destinationId: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" placeholder="e.g. DEST-01" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase">Hardware UUID (Target Machine)</label>
                <div className="flex items-center relative">
                  <Cpu className="w-4 h-4 absolute left-3 text-slate-500" />
                  <input required value={newLicenseForm.hardwareUuid} onChange={e => setNewLicenseForm({...newLicenseForm, hardwareUuid: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm font-mono focus:border-cyan-500 focus:outline-none" placeholder="XXXX-XXXX-XXXX-XXXX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">License Tier</label>
                  <select value={newLicenseForm.tier} onChange={e => setNewLicenseForm({...newLicenseForm, tier: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none">
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                    <option value="STARTER">STARTER</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Expiration Date (Optional)</label>
                  <input type="date" value={newLicenseForm.expiresAt} onChange={e => setNewLicenseForm({...newLicenseForm, expiresAt: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
                </div>
              </div>
              
              <div className="bg-cyan-900/20 border border-cyan-800/40 p-4 rounded-xl mt-4">
                <p className="text-xs text-cyan-300">
                  <ShieldCheck className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  License payload will be signed on the Cloud Backend using the RSA-4096 private key with PSS padding. This will output a `license.json` file to deploy to the kiosk.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">Cancel</button>
                <button disabled={isGenerating} type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                  {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Sign & Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenseManagementPage;
