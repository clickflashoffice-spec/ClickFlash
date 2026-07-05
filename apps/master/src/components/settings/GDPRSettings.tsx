import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  FileText,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle,
// @ts-ignore
  XCircle,
  Clock,
  RefreshCw,
  Users,
// @ts-ignore
  Database,
// @ts-ignore
  Lock,
// @ts-ignore
  Unlock,
  FileDown,
  Activity,
  Eye,
  Ban,
} from "lucide-react";
import Card from "../common/Card";
import { logger } from "../../utils/logger";

interface ConsentStats {
  totalConsents: number;
  activeConsents: number;
  withdrawnConsents: number;
}

interface ExportRequest {
  id: number;
  customer_id: string;
  status: string;
  format: string;
  created_at: string;
}

interface BreachIncident {
  id: number;
  description: string;
  severity: string;
  status: string;
  discovered_at: string;
  affected_count: number;
}

interface RetentionPolicy {
  customerDataYears: number;
  unsoldPhotoDays: number;
  autoPurgeEnabled: boolean;
}

interface GdprStats {
  consents: ConsentStats;
  pendingExports: number;
  totalDeletions: number;
  openBreaches: number;
  retention: RetentionPolicy;
}

const GDPRSettings: React.FC = () => {
  const [stats, setStats] = useState<GdprStats | null>(null);
  const [exports, setExports] = useState<ExportRequest[]>([]);
  const [breaches, setBreaches] = useState<BreachIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<
    "consent" | "retention" | "exports" | "dpa" | "breaches"
  >("consent");
  const [isApplyingRetention, setIsApplyingRetention] = useState(false);
  const [isGeneratingDpa, setIsGeneratingDpa] = useState(false);
  const [dpaText, setDpaText] = useState<string | null>(null);
  const [studioName, setStudioName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCustomerId, setDeleteCustomerId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, exportsRes, breachesRes] = await Promise.all([
        fetch("/api/gdpr/stats").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/gdpr/exports").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/gdpr/breaches").then((r) => (r.ok ? r.json() : null)),
      ]);
      setStats(statsRes);
      setExports(exportsRes?.exports || []);
      setBreaches(breachesRes?.breaches || []);
    } catch (err) {
      logger.error("[GDPRSettings] Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyRetention = async () => {
    if (!window.confirm("WARNING: This will permanently delete customer data past the retention period and unsold photos older than 30 days. This action is irreversible. Proceed?")) {
      return;
    }
    setIsApplyingRetention(true);
    try {
      const res = await fetch("/api/gdpr/retention/apply", { method: "POST" });
      if (!res.ok) throw new Error("Failed to apply retention policy");
      const data = await res.json();
      alert(`Retention policy applied:\n- Customers deleted: ${data.customersDeleted}\n- Photos deleted: ${data.photosDeleted}\n- Orders deleted: ${data.ordersDeleted}`);
      fetchData();
    } catch (err) {
      logger.error("[GDPRSettings] Retention apply failed", err);
      alert("Failed to apply retention policy.");
    } finally {
      setIsApplyingRetention(false);
    }
  };

  const handleGenerateDpa = async () => {
    if (!studioName.trim()) {
      alert("Please enter a studio name.");
      return;
    }
    setIsGeneratingDpa(true);
    try {
      const res = await fetch(`/api/gdpr/dpa?studioName=${encodeURIComponent(studioName)}`);
      if (!res.ok) throw new Error("Failed to generate DPA");
      const data = await res.json();
      setDpaText(data.dpa);
    } catch (err) {
      logger.error("[GDPRSettings] DPA generation failed", err);
      alert("Failed to generate DPA.");
    } finally {
      setIsGeneratingDpa(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const res = await fetch("/api/gdpr/export/all", { method: "POST" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-export-all-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error("[GDPRSettings] Export all failed", err);
      alert("Failed to export data.");
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerId.trim()) return;
    if (!window.confirm(`PERMANENTLY delete all data for customer ${deleteCustomerId}? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/gdpr/customers/${encodeURIComponent(deleteCustomerId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Deletion failed");
      alert(`Customer ${deleteCustomerId} data permanently deleted.`);
      setShowDeleteModal(false);
      setDeleteCustomerId("");
      fetchData();
    } catch (err) {
      logger.error("[GDPRSettings] Customer deletion failed", err);
      alert("Failed to delete customer data.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400";
      case "high":
        return "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400";
      case "medium":
        return "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400";
      default:
        return "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400";
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
        Loading GDPR compliance data...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-500" />
            GDPR Compliance
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Manage consent, data retention, exports, and breach notifications
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">Active Consents</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.consents.activeConsents || 0}</p>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-100 dark:border-amber-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">Pending Exports</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.pendingExports || 0}</p>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900 border-red-100 dark:border-red-900/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold uppercase text-red-600 dark:text-red-400">Open Breaches</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.openBreaches || 0}</p>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900 border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">Total Deletions</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.totalDeletions || 0}</p>
        </Card>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        {[
          { id: "consent" as const, label: "Consent Management", icon: Users },
          { id: "retention" as const, label: "Data Retention", icon: Clock },
          { id: "exports" as const, label: "Export Requests", icon: FileDown },
          { id: "dpa" as const, label: "DPA", icon: FileText },
          { id: "breaches" as const, label: "Breach Log", icon: AlertTriangle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === tab.id
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Consent Management */}
      {activeSection === "consent" && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-500" />
              Consent Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-500">Total Consents</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats?.consents.totalConsents || 0}</p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Active</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats?.consents.activeConsents || 0}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">Withdrawn</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats?.consents.withdrawnConsents || 0}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Right to Erasure
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Permanently delete all data for a specific customer. This action is irreversible and will remove photos, orders, consent records, and contact information.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Customer Data
            </button>
          </Card>
        </div>
      )}

      {/* Data Retention */}
      {activeSection === "retention" && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Retention Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">Customer Data</p>
                  <p className="text-sm text-slate-500">Personal information, orders, contact details</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-bold rounded-lg">
                  {stats?.retention.customerDataYears || 2} years
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">Unsold Photos</p>
                  <p className="text-sm text-slate-500">Photos not linked to any order</p>
                </div>
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-bold rounded-lg">
                  {stats?.retention.unsoldPhotoDays || 30} days
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">Auto-Purge</p>
                  <p className="text-sm text-slate-500">Automatically apply retention policy</p>
                </div>
                <span
                  className={`px-3 py-1 text-sm font-bold rounded-lg ${
                    stats?.retention.autoPurgeEnabled
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {stats?.retention.autoPurgeEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Warning</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Applying the retention policy will permanently delete data. This action cannot be undone and is logged for audit purposes.
              </p>
            </div>
          </div>

          <button
            onClick={handleApplyRetention}
            disabled={isApplyingRetention}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isApplyingRetention ? "animate-spin" : ""}`} />
            {isApplyingRetention ? "Applying Policy..." : "Apply Retention Policy"}
          </button>
        </div>
      )}

      {/* Export Requests */}
      {activeSection === "exports" && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <FileDown className="w-5 h-5 text-blue-500" />
              Pending Export Requests
            </h3>
            {exports.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No pending export requests.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Customer ID</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Format</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Status</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exports.map((req) => (
                      <tr key={req.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 px-3 font-mono text-slate-800 dark:text-slate-200">{req.customer_id}</td>
                        <td className="py-2 px-3 uppercase text-slate-600 dark:text-slate-400">{req.format}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              req.status === "pending"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : req.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{new Date(req.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <button
            onClick={handleExportAll}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export All Customer Data
          </button>
        </div>
      )}

      {/* DPA */}
      {activeSection === "dpa" && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              Data Processing Agreement
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Studio Name</label>
                <input
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  placeholder="Enter studio name..."
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>
              <button
                onClick={handleGenerateDpa}
                disabled={isGeneratingDpa}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {isGeneratingDpa ? "Generating..." : "Generate DPA"}
              </button>
            </div>
          </Card>

          {dpaText && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 dark:text-white">Generated DPA</h4>
                <button
                  onClick={() => {
                    const blob = new Blob([dpaText], { type: "text/plain" });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `DPA-${studioName}-${new Date().toISOString().split("T")[0]}.txt`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
              <pre className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                {dpaText}
              </pre>
            </Card>
          )}
        </div>
      )}

      {/* Breach Log */}
      {activeSection === "breaches" && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              Breach Incidents
            </h3>
            {breaches.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-500 dark:text-slate-400">
                <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                <p className="text-sm font-medium">No breach incidents recorded.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {breaches.map((breach) => (
                  <div
                    key={breach.id}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getSeverityColor(breach.severity)}`}>
                          {breach.severity.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            breach.status === "open"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {breach.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(breach.discovered_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">{breach.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Affected customers: <span className="font-bold">{breach.affected_count}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Delete Customer Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-800">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Customer Data
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Enter the customer ID to permanently delete all their data. This includes photos, orders, consent records, and contact information. This action is logged and cannot be undone.
            </p>
            <input
              type="text"
              value={deleteCustomerId}
              onChange={(e) => setDeleteCustomerId(e.target.value)}
              placeholder="Customer ID"
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteCustomerId("");
                }}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={isDeleting || !deleteCustomerId.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GDPRSettings;
