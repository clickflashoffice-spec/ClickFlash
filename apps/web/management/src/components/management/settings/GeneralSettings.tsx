import React from "react";
import { useSystemSetting } from "../../../hooks/useSystemSetting";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Camera,
  Save,
} from "lucide-react";

interface GeneralSettingsType {
  studioName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
  businessHours: {
    start: string;
    end: string;
  };
}

const DEFAULT_SETTINGS: GeneralSettingsType = {
  studioName: "ClickFlash Photography",
  email: "contact@clickflash.app",
  phone: "+216 12 345 678",
  website: "https://clickflash.app",
  address: "123 Photography Street",
  city: "Djerba",
  country: "Tunisia",
  timezone: "Africa/Tunis",
  currency: "TND",
  businessHours: {
    start: "09:00",
    end: "18:00",
  },
};

const GeneralSettings: React.FC = () => {
  const {
    value: settings,
    update: setSettings,
    isLoading,
  } = useSystemSetting<GeneralSettingsType>(
    "generalSettings",
    DEFAULT_SETTINGS,
  );

  const handleChange = (field: keyof GeneralSettingsType, value: GeneralSettingsType[keyof GeneralSettingsType]) => {
    setSettings({ ...settings, [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
          <Building2 className="w-6 h-6 text-cyan-600" />
          Studio <span className="text-cyan-600">Information</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Manage your studio's basic information and contact details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Studio Info */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-600" />
            Studio Details
          </h3>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Studio Name
            </label>
            <input
              type="text"
              value={settings.studioName}
              onChange={(e) => handleChange("studioName", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold cursor-pointer"
              >
                <option value="Africa/Tunis">Africa/Tunis (GMT+1)</option>
                <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold cursor-pointer"
              >
                <option value="TND">TND (Tunisian Dinar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="GBP">GBP (British Pound)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-4 h-4 text-cyan-600" />
            Contact Information
          </h3>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Website
            </label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url"
                value={settings.website}
                onChange={(e) => handleChange("website", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold text-sm"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-600" />
            Location
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Street Address
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  City
                </label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Country
                </label>
                <input
                  type="text"
                  value={settings.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            Studio Operating Hours
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Opening Time
              </label>
              <input
                type="time"
                value={settings.businessHours.start}
                onChange={(e) =>
                  handleChange("businessHours", {
                    ...settings.businessHours,
                    start: e.target.value,
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Closing Time
              </label>
              <input
                type="time"
                value={settings.businessHours.end}
                onChange={(e) =>
                  handleChange("businessHours", {
                    ...settings.businessHours,
                    end: e.target.value,
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Indicator */}
      <div className="flex items-center gap-2 text-sm text-cyan-600 font-bold border-t border-slate-100 pt-6">
        <div className="p-1 px-3 bg-cyan-50 rounded-full flex items-center gap-2">
          <Save className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-widest">
            Settings are automatically synchronized
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
