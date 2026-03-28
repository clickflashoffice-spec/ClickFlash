import React, { useState, useEffect } from "react";
import Card from "../common/Card.tsx";
import { KioskSettings } from "../../types.ts";

const KIOSK_SETTINGS_KEY = "kioskSettingsV2";
const DEFAULT_LOGO = "/gallery/logo.png";
const DEFAULT_MESSAGE = "Welcome";

interface KioskAppearanceSettingsProps {
  showToast: (msg: string) => void;
}

const KioskAppearanceSettings: React.FC<KioskAppearanceSettingsProps> = ({
  showToast,
}) => {
  const [settings, setSettings] = useState<Partial<KioskSettings>>({
    logoUrl: DEFAULT_LOGO,
    welcomeMessage: DEFAULT_MESSAGE,
  });
  const [logoPreview, setLogoPreview] = useState<string>(DEFAULT_LOGO);

  useEffect(() => {
    const savedSettings = localStorage.getItem(KIOSK_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const fullSettings = {
          logoUrl: DEFAULT_LOGO,
          welcomeMessage: DEFAULT_MESSAGE,
          ...parsed,
        };
        setSettings(fullSettings);
        setLogoPreview(fullSettings.logoUrl);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({ ...prev, welcomeMessage: e.target.value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic size check (limit to ~2MB to be safe for LocalStorage)
      if (file.size > 2 * 1024 * 1024) {
        showToast("Error: Image is too large. Please use an image under 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setSettings((prev) => ({ ...prev, logoUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    try {
      const currentSettings = JSON.parse(
        localStorage.getItem(KIOSK_SETTINGS_KEY) || "{}",
      );
      const newSettings = { ...currentSettings, ...settings };

      // Attempt to save
      localStorage.setItem(KIOSK_SETTINGS_KEY, JSON.stringify(newSettings));
      showToast("Kiosk appearance settings saved successfully!");
    } catch (e: any) {
      console.error("Save failed:", e);
      if (e.name === "QuotaExceededError" || e.code === 22) {
        alert(
          "Storage Limit Exceeded: The logo image is too large to save locally. Please compress the image or use a smaller file.",
        );
      } else {
        showToast(`Error saving settings: ${e.message}`);
      }
    }
  };

  const handleReset = () => {
    if (!window.confirm("Reset appearance to default settings?")) return;

    const defaultSettings = {
      logoUrl: DEFAULT_LOGO,
      welcomeMessage: DEFAULT_MESSAGE,
    };
    setSettings(defaultSettings);
    setLogoPreview(DEFAULT_LOGO);

    try {
      const currentSettings = JSON.parse(
        localStorage.getItem(KIOSK_SETTINGS_KEY) || "{}",
      );
      const newSettings = { ...currentSettings, ...defaultSettings };
      localStorage.setItem(KIOSK_SETTINGS_KEY, JSON.stringify(newSettings));
      showToast("Kiosk appearance reset to defaults.");
    } catch (e) {
      console.error(e);
    }
  };

  const inputStyles =
    "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const labelStyles =
    "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-4">Kiosk Welcome Screen</h2>
      <div className="space-y-6">
        <div>
          <label className={labelStyles + " mb-2"}>Company Logo</label>
          <div className="flex items-center space-x-4">
            <img
              src={logoPreview}
              alt="Logo Preview"
              className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 object-cover border-2 border-slate-200 dark:border-slate-600"
            />
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-slate-500 dark:text-slate-400
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-100 file:text-blue-700 dark:file:bg-blue-900/50 dark:file:text-blue-300
                                    hover:file:bg-blue-200 dark:hover:file:bg-blue-800/50 cursor-pointer"
              />
              <p className="text-xs text-slate-400 mt-1">
                Max size: 2MB (PNG/JPG recommended)
              </p>
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="welcomeMessage" className={labelStyles}>
            Welcome Message
          </label>
          <input
            type="text"
            id="welcomeMessage"
            value={settings.welcomeMessage}
            onChange={handleMessageChange}
            className={inputStyles}
            placeholder="e.g. Welcome to Paradise Resort"
          />
        </div>
        <div className="pt-4 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleReset}
            className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm"
          >
            Save Appearance Settings
          </button>
        </div>
      </div>
    </Card>
  );
};

export default KioskAppearanceSettings;
