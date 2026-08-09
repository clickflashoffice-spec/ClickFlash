import React, { useState, useEffect } from "react";



import { Modal } from '@clickflash/ui';
import { KioskSettings } from "../../types.ts";
import { useCurrency } from "../CurrencyContext.tsx";
import { configureConnection } from "../../services/pb.ts";
import { apiService } from "../../services/apiService";

import { logger } from "../../utils/logger";
import { DEFAULT_MASTER_PORT, LEGACY_KIOSK_ID } from "../../constants";
import { ConnectionSettings } from "./settings/ConnectionSettings";
import { SecuritySettings } from "./settings/SecuritySettings";
import { AccessSettings } from "./settings/AccessSettings";
import { IdentitySettings } from "./settings/IdentitySettings";

const KIOSK_SETTINGS_KEY = "kioskSettingsV2";
const DEFAULT_LOGO = "https://i.imgur.com/3Y2j2s2.png";
const DEFAULT_MESSAGE = "Welcome";
const DEVICE_ROLE_KEY = "star_master_device_role";

interface KioskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: KioskSettings) => void;
  kioskConnectionStatus: "Connected" | "Disconnected";
}

type ConnectionTestStatus = "idle" | "testing" | "success" | "error";
type ConnectionType = "local" | "cloud";
type ViewState = "settings";

const KioskSettingsModal: React.FC<KioskSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  kioskConnectionStatus,
}) => {
  const { currency, setCurrency } = useCurrency();
  const [settings, setSettings] = useState<KioskSettings>({
    logoUrl: DEFAULT_LOGO,
    welcomeMessage: DEFAULT_MESSAGE,
    kioskId: "",
    serverUrl: window.location.origin,
    screensaverTimeout: 60,
    enableRFID: true,
    enableFaceLogin: true,
    enableFaceSearch: true,
    sharedFolderPath: "",
    touchOrdersFolder: "",
  });
  const [logoPreview, setLogoPreview] = useState<string>(DEFAULT_LOGO);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [connectionTestStatus, setConnectionTestStatus] =
    useState<ConnectionTestStatus>("idle");
  const [view, setView] = useState<ViewState>("settings");
  const [connectionType, setConnectionType] = useState<ConnectionType>("local");

  const generateNewKioskId = () =>
    `kiosk-${Math.random().toString(36).slice(2, 11)}`;

  useEffect(() => {
    if (isOpen) {
      const savedSettingsRaw = localStorage.getItem(KIOSK_SETTINGS_KEY);
      const initialSettings: KioskSettings = {
        logoUrl: DEFAULT_LOGO,
        welcomeMessage: DEFAULT_MESSAGE,
        kioskId: "",
        serverUrl: window.location.origin,
        screensaverTimeout: 60,
        enableRFID: true,
        enableFaceLogin: true,
        enableFaceSearch: true,
        sharedFolderPath: "",
        touchOrdersFolder: "",
      };

      if (savedSettingsRaw) {
        try {
          const parsed = JSON.parse(savedSettingsRaw);

          // PURGE "123" Logic in Modal as well
          if (parsed.kioskId === LEGACY_KIOSK_ID) {
            parsed.kioskId = generateNewKioskId();
            // Update storage immediately to fix the persistent bad value
            localStorage.setItem(
              KIOSK_SETTINGS_KEY,
              JSON.stringify({ ...initialSettings, ...parsed }),
            );
          }

          if (!parsed.kioskId) parsed.kioskId = generateNewKioskId();

          const merged = { ...initialSettings, ...parsed };
          setSettings(merged);
          setLogoPreview(merged.logoUrl);
          if (merged.currencyCode) setCurrency(merged.currencyCode);

          if (
            merged.serverUrl &&
            merged.serverUrl.includes("http") &&
            !merged.serverUrl.includes("192.168") &&
            !merged.serverUrl.includes("localhost") &&
            !merged.serverUrl.includes("127.0.0.1")
          ) {
            setConnectionType("cloud");
          } else {
            setConnectionType("local");
          }
        } catch (e) {
          logger.error(
            "Failed to load kiosk settings",
            e instanceof Error ? e : undefined,
          );
          setSettings(initialSettings);
        }
      } else {
        initialSettings.kioskId = generateNewKioskId();
        setSettings(initialSettings);
      }
      setNewPassword("");
      setConfirmPassword("");
      setConnectionTestStatus("idle");
      setView("settings");
    }
  }, [isOpen, setCurrency]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
    if (name === "serverUrl") setConnectionTestStatus("idle");
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setSettings((prev) => ({ ...prev, logoUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAndReload = () => {
    const settingsToSave = { ...settings, currencyCode: currency.code };

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }
      settingsToSave.password = newPassword;
    }

    // Final safeguard against legacy kiosk ID
    if (settingsToSave.kioskId === LEGACY_KIOSK_ID) {
      settingsToSave.kioskId = generateNewKioskId();
    }

    // Phase 36: Disable face recognition features for customers
    settingsToSave.enableFaceLogin = false;
    settingsToSave.enableFaceSearch = false;

    if (settingsToSave.screensaverTimeout) {
      settingsToSave.screensaverTimeout = Number(
        settingsToSave.screensaverTimeout,
      );
    }

    localStorage.setItem(KIOSK_SETTINGS_KEY, JSON.stringify(settingsToSave));

    // Persist to backend
    apiService
      .saveSettings({
        sharedFolderPath: settingsToSave.sharedFolderPath,
        touchOrdersFolder: settingsToSave.touchOrdersFolder,
        // Keep photoImportFolder synced for backend logic consistency
        photoImportFolder: JSON.stringify({
          path: settingsToSave.sharedFolderPath,
        }),
      })
      .catch((err) =>
        logger.error("Failed to persist settings to backend", err),
      );

    configureConnection();

    onSave(settingsToSave);
    onClose();
    setTimeout(() => window.location.reload(), 500);
  };

  const handleResetDeviceRole = () => {
    if (window.confirm("Reset device role?")) {
      localStorage.removeItem(DEVICE_ROLE_KEY);
      window.location.reload();
    }
  };

  const performConnectionTest = async (url: string) => {
    setConnectionTestStatus("testing");
    const normalizedUrl = url.startsWith("http") ? url : `http://${url}`;

    try {
      const response = await fetch(`${normalizedUrl}/api/health`, {
        method: "GET",
        mode: "cors",
      });
      if (response.ok) setConnectionTestStatus("success");
      else setConnectionTestStatus("error");
    } catch (e) {
      setConnectionTestStatus("error");
    }
  };

  const handleTestConnection = () => {
    performConnectionTest(settings.serverUrl || window.location.origin);
  };

  const handleCopyKioskId = async () => {
    try {
      await navigator.clipboard.writeText(settings.kioskId);
      alert("Kiosk ID copied to clipboard!");
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = settings.kioskId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Kiosk ID copied to clipboard!");
    }
  };

  const startConnectionTypeChange = (type: ConnectionType) => {
    setConnectionType(type);
    setSettings((prev) => ({
      ...prev,
      serverUrl:
        type === "local"
          ? `http://192.168.1.100:${DEFAULT_MASTER_PORT}`
          : "https://api.starmaster.cloud",
    }));
  };

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authPassword, setAuthPassword] = useState("");

  const handleAuthorize = () => {
    const savedPassword = settings.password || "1234";
    if (authPassword === savedPassword) {
      setIsAuthorized(true);
    } else {
      alert("Incorrect password.");
    }
  };

  if (!isAuthorized && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Admin Authorization">
        <div className="p-6 space-y-4 text-center">
          <p className="text-slate-600 dark:text-slate-400">Please enter the admin password to access settings.</p>
          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuthorize()}
            data-testid="settings-password-input"
            className="w-full p-3 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-center text-xl tracking-widest"
            autoFocus
            placeholder="••••"
          />
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-200 py-3 rounded-lg font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAuthorize}
              data-testid="settings-authorize-button"
              className="flex-1 bg-blue-600 py-3 rounded-lg font-bold text-white"
            >
              Authorize
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kiosk Settings">

        <div className="space-y-6 no-print">
          <ConnectionSettings
            settings={settings}
            setSettings={setSettings}
            connectionType={connectionType}
            setConnectionType={startConnectionTypeChange}
            connectionTestStatus={connectionTestStatus}
            onTestConnection={handleTestConnection}
            kioskConnectionStatus={kioskConnectionStatus}
            handleChange={handleChange}
            handleCopyKioskId={handleCopyKioskId}
          />

          {/* Quick Regenerate ID (Manual Fix) */}
          <div className="flex justify-end -mt-4 px-6 no-print">
            <button
              type="button"
              onClick={() => {
                const newId = generateNewKioskId();
                setSettings((prev) => ({ ...prev, kioskId: newId }));
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Regenerate ID
            </button>
          </div>

          <SecuritySettings
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
          />

          <AccessSettings
            settings={settings}
            handleCheckboxChange={handleCheckboxChange}
          />

          {/* Section 4: Gallery Features - REMOVED for Customers (Phase 36) */}
          {/* <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <h3 className="text-lg font-bold mb-4">Gallery Features</h3>
                        <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                            <div>
                                <span className="font-bold block text-slate-700 dark:text-slate-200">AI Face Search</span>
                                <span className="text-xs text-slate-500">Enable "Find Me" button.</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer" aria-label="Enable AI Face Search">
                                <input type="checkbox" name="enableFaceSearch" checked={!!settings.enableFaceSearch} onChange={handleCheckboxChange} className="sr-only peer" aria-label="Enable AI Face Search" title="Enable AI Face Search" />
                                <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-600 peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            </label>
                        </div>
                    </div> */}

          <IdentitySettings
            settings={settings}
            handleChange={handleChange}
            handleLogoChange={handleLogoChange}
            logoPreview={logoPreview}
          />

          {/* Section 6: Reset & Exit */}
          <div className="flex gap-4">
            <div className="flex-1 p-4 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-lg flex justify-between items-center">
              <div>
                <h4 className="font-bold text-red-700 dark:text-red-400">
                  System Reset
                </h4>
                <p className="text-xs text-red-600 dark:text-red-300">
                  Switch back to Master.
                </p>
              </div>
              <button
                onClick={handleResetDeviceRole}
                className="text-xs bg-red-100 text-red-600 px-3 py-2 rounded-lg font-bold"
              >
                RESET
              </button>
            </div>

            <div className="flex-1 p-4 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 rounded-lg flex justify-between items-center">
              <div>
                <h4 className="font-bold text-amber-700 dark:text-amber-400">
                  Exit Kiosk
                </h4>
                <p className="text-xs text-amber-600 dark:text-amber-300">
                  Return to OS.
                </p>
              </div>
              <button
                onClick={async () => {
                  const password = prompt("Enter Admin Password to Exit:");
                  if (password === null) return; // User cancelled

                  if (window.electron && window.electron.exitKiosk) {
                    const success = await window.electron.exitKiosk(password);

                    if (!success) {
                      alert("Incorrect password.");
                    }
                  } else {
                    alert("API Unavailable");
                  }
                }}
                className="text-xs bg-amber-100 text-amber-600 px-3 py-2 rounded-lg font-bold"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>

      <div className="pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndReload}
            data-testid="settings-save-button"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Save & Reload
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default KioskSettingsModal;
