import React, { useState, useEffect } from "react";
import { useSystemSetting } from "../../../hooks/useSystemSetting";
import {
  FileText,
  Image as ImageIcon,
  Briefcase,
  MapPin,
  Percent,
  MessageSquare,
  Save,
  RefreshCw,
} from "lucide-react";

interface ReceiptConfig {
  logoUrl: string;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  taxName: string;
  taxRate: number;
  registrationNumber: string;
  thankYouMessage: string;
  loginInstructions: string;
  galleryUrl: string;
  footerText: string;
}

const DEFAULT_SETTINGS: ReceiptConfig = {
  logoUrl: "/logo.png",
  companyName: "Star Master Photography",
  addressLine1: "123 Hotel Avenue",
  addressLine2: "Sousse, Tunisia",
  taxName: "VAT",
  taxRate: 19,
  registrationNumber: "RC: 12345678",
  thankYouMessage:
    "Thank you for your purchase! We hope you enjoy your photos.",
  loginInstructions:
    "To access your digital gallery, please visit our website and log in using the credentials below.",
  galleryUrl: "https://starmaster.photo/gallery",
  footerText: "For support, contact us at photos@example.com",
};

const ReceiptTemplateSettings: React.FC = () => {
  const {
    value: settings,
    update: setSettings,
    isLoading,
  } = useSystemSetting<ReceiptConfig>("receipt_config", DEFAULT_SETTINGS);

  const [logoPreview, setLogoPreview] = useState(settings.logoUrl);

  useEffect(() => {
    setLogoPreview(settings.logoUrl);
  }, [settings.logoUrl]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setSettings({
      ...settings,
      [name]: type === "number" ? parseFloat(value) : value,
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setSettings({ ...settings, logoUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="w-6 h-6 text-cyan-600 animate-spin" />
      </div>
    );
  }

  const inputStyles =
    "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all";
  const labelStyles =
    "block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 px-1";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-600" />
            Receipt <span className="text-cyan-600">Branding</span>
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            Global template for customer invoices and digital access
            instructions.
          </p>
        </div>
        <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full uppercase tracking-widest border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Auto-Sync Active
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column: Core Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
            <label className={labelStyles}>Company Logo</label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden group relative">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                )}
                <label className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    Update
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Best with transparent PNG.
                  <br />
                  Recommended size: 500x500px.
                </p>
                {logoPreview && (
                  <button
                    onClick={() => {
                      setLogoPreview("");
                      setSettings({ ...settings, logoUrl: "" });
                    }}
                    className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-600"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <label className={labelStyles}>
                <Briefcase className="inline w-3 h-3 mr-1 mb-0.5" /> Company
                Name
              </label>
              <input
                type="text"
                name="companyName"
                value={settings.companyName}
                onChange={handleChange}
                className={inputStyles}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyles}>
                  <MapPin className="inline w-3 h-3 mr-1 mb-0.5" /> Address Line
                  1
                </label>
                <input
                  type="text"
                  name="addressLine1"
                  value={settings.addressLine1}
                  onChange={handleChange}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className={labelStyles}>Address Line 2</label>
                <input
                  type="text"
                  name="addressLine2"
                  value={settings.addressLine2}
                  onChange={handleChange}
                  className={inputStyles}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className={labelStyles}>
                  <Percent className="inline w-3 h-3 mr-1 mb-0.5" /> Tax Name
                </label>
                <input
                  type="text"
                  name="taxName"
                  value={settings.taxName}
                  onChange={handleChange}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className={labelStyles}>Tax Rate (%)</label>
                <input
                  type="number"
                  name="taxRate"
                  value={settings.taxRate}
                  onChange={handleChange}
                  className={inputStyles}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className={labelStyles}>Registration #</label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={settings.registrationNumber}
                  onChange={handleChange}
                  className={inputStyles}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Messaging & Footer */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <label className={labelStyles}>
                <MessageSquare className="inline w-3 h-3 mr-1 mb-0.5" /> Thank
                You Message
              </label>
              <textarea
                name="thankYouMessage"
                value={settings.thankYouMessage}
                onChange={handleChange}
                className={inputStyles + " h-24 resize-none"}
              />
            </div>
            <div>
              <label className={labelStyles}>Login Instructions</label>
              <textarea
                name="loginInstructions"
                value={settings.loginInstructions}
                onChange={handleChange}
                className={inputStyles + " h-24 resize-none"}
              />
            </div>
            <div>
              <label className={labelStyles}>
                <Save className="inline w-3 h-3 mr-1 mb-0.5" /> Gallery Base URL
              </label>
              <input
                type="text"
                name="galleryUrl"
                value={settings.galleryUrl}
                onChange={handleChange}
                className={inputStyles}
              />
            </div>
            <div>
              <label className={labelStyles}>Footer / Support Info</label>
              <input
                type="text"
                name="footerText"
                value={settings.footerText}
                onChange={handleChange}
                className={inputStyles}
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-cyan-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Configuration Status
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Changes saved here will propagate to all Master stations during
              their next sync cycle. Ensure tax rates comply with local
              destination laws.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptTemplateSettings;
