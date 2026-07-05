import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  KeyRound,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield,
// @ts-ignore
  Database,
  HardDrive,
  Eye,
  EyeOff,
} from "lucide-react";
import Card from "../common/Card";
import { logger } from "../../utils/logger";

interface EncryptionStatus {
  enabled: boolean;
  cipher: string | null;
  keyRotationDate: string | null;
}

interface BackupStatus {
  lastBackupPath: string | null;
  encrypted: boolean | null;
  lastBackupAgeHours: number | null;
}

const EncryptionSettings: React.FC = () => {
  const [status, setStatus] = useState<EncryptionStatus | null>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showRotateForm, setShowRotateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [encRes, backupRes] = await Promise.all([
        fetch("/api/encryption/status").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/encryption/backup-status").then((r) => (r.ok ? r.json() : null)),
      ]);
      setStatus(encRes);
      setBackupStatus(backupRes);
    } catch (err) {
      logger.error("[EncryptionSettings] Failed to fetch status", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleEnableEncryption = async () => {
    clearMessages();
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setIsEnabling(true);
    try {
      const res = await fetch("/api/encryption/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to enable encryption");
      }
      setSuccess("Encryption enabled successfully. The database is now encrypted at rest.");
      setPassword("");
      setConfirmPassword("");
      fetchStatus();
    } catch (err: any) {
      logger.error("[EncryptionSettings] Enable encryption failed", err);
      setError(err.message || "Failed to enable encryption.");
    } finally {
      setIsEnabling(false);
    }
  };

  const handleRotateKey = async () => {
    clearMessages();
    if (!oldPassword || !newPassword) {
      setError("Both old and new passwords are required.");
      return;
    }
    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }

    setIsRotating(true);
    try {
      const res = await fetch("/api/encryption/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to rotate key");
      }
      setSuccess("Encryption key rotated successfully.");
      setOldPassword("");
      setNewPassword("");
      setShowRotateForm(false);
      fetchStatus();
    } catch (err: any) {
      logger.error("[EncryptionSettings] Key rotation failed", err);
      setError(err.message || "Failed to rotate encryption key.");
    } finally {
      setIsRotating(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
        Loading encryption status...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-indigo-500" />
// @ts-ignore
            Database Encryption
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Protect customer data at rest with SQLCipher encryption
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Status Card */}
      <Card
        className={`border-l-4 ${
          status?.enabled
            ? "border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900"
            : "border-l-amber-500 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${
              status?.enabled
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            }`}
          >
            {status?.enabled ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {status?.enabled ? "Encryption Enabled" : "Encryption Disabled"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {status?.enabled
// @ts-ignore
                ? `Database is protected with ${status.cipher || "SQLCipher"}. Customer photos and PII are encrypted at rest.`
// @ts-ignore
                : "Database is stored in plaintext. Enable encryption to protect customer data at rest."}
            </p>
          </div>
          <div className="hidden md:block">
            {status?.enabled ? (
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-bold rounded-lg flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Protected
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-bold rounded-lg flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                Unprotected
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
        </div>
      )}

      {/* Enable Encryption */}
      {!status?.enabled && (
        <Card>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-500" />
            Enable Encryption
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Important Warning</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Encryption cannot be disabled without a full data export and re-import. If you lose the password, your data will be unrecoverable. Store the password in your password manager.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Encryption Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 12 characters"
                  className="w-full px-4 py-2 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-2 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
                <button
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleEnableEncryption}
              disabled={isEnabling}
              className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {isEnabling ? "Enabling Encryption..." : "Enable Encryption"}
            </button>
          </div>
        </Card>
      )}

      {/* Rotate Key */}
      {status?.enabled && (
        <Card>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            Rotate Encryption Key
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Change the encryption password. The database will be re-encrypted with the new key. This operation may take a moment depending on database size.
          </p>

          {!showRotateForm ? (
            <button
              onClick={() => setShowRotateForm(true)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              Rotate Encryption Key
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current encryption password"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 12 characters"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRotateForm(false);
                    setOldPassword("");
                    setNewPassword("");
                    clearMessages();
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRotateKey}
                  disabled={isRotating}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRotating ? "animate-spin" : ""}`} />
                  {isRotating ? "Rotating..." : "Confirm Rotation"}
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Backup Encryption Status */}
      <Card>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-slate-500" />
          Backup Encryption Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <p className="text-sm text-slate-500 dark:text-slate-400">Last Backup</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {backupStatus?.lastBackupAgeHours !== null
                ? `${backupStatus?.lastBackupAgeHours} hours ago`
                : "No backups found"}
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <p className="text-sm text-slate-500 dark:text-slate-400">Backup Encryption</p>
            <div className="flex items-center gap-2 mt-1">
              {backupStatus?.encrypted === true ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">Encrypted</span>
                </>
              ) : backupStatus?.encrypted === false ? (
                <>
                  <XCircle className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-amber-700 dark:text-amber-300">Not Encrypted</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 text-slate-400" />
                  <span className="font-bold text-slate-600 dark:text-slate-400">Unknown</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Security Info */}
      <div className="p-6 bg-slate-100 dark:bg-slate-800/40 rounded-2xl">
        <div className="flex items-start gap-4">
          <Shield className="w-8 h-8 text-slate-400 shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-2">Security Details</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                AES-256 encryption at rest via SQLCipher (better-sqlite3-multiple-ciphers)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                PBKDF2 key derivation with 100,000 iterations and SHA-256
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                Backup files encrypted with AES-256-GCM and authenticated tags
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                Encryption keys are never stored in plaintext — use OS keychain or password manager
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptionSettings;
