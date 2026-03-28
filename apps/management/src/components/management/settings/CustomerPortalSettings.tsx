import React, { useState, useEffect } from "react";
import useLocalStorage from "../../../hooks/useLocalStorage";

const DEFAULT_LOGO = "/logo.png";

const CustomerPortalSettings: React.FC = () => {
  const [settings, setSettings] = useLocalStorage("customerPortalSettings", {
    companyName: "Star Master Photography",
    logoUrl: DEFAULT_LOGO,
    customDomain: "",
  });
  const [logoPreview, setLogoPreview] = useState(settings.logoUrl);

  useEffect(() => {
    setLogoPreview(settings.logoUrl);
  }, [settings.logoUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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

  const handleSave = () => {
    alert("Customer Portal settings saved!");
  };

  const inputStyles =
    "w-full max-w-sm bg-slate-100 border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const labelStyles = "block text-sm font-medium text-slate-600 mb-1";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Customer Portal Branding</h2>
      <p className="text-slate-500 mb-6 max-w-2xl">
        Manage the global branding for the customer-facing photo gallery. These
        settings will apply to all customer galleries.
      </p>
      <div className="space-y-6">
        <div>
          <label htmlFor="companyName" className={labelStyles}>
            Company Name
          </label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={settings.companyName}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>
        <div>
          <label className={labelStyles}>Company Logo</label>
          <div className="flex items-center space-x-4">
            <img
              src={logoPreview}
              alt="Logo Preview"
              className="w-20 h-20 rounded-full bg-slate-200 object-cover"
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              title="Upload Company Logo"
              className="block w-full max-w-sm text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
            />
          </div>
        </div>
        <div>
          <label htmlFor="customDomain" className={labelStyles}>
            Custom Domain
          </label>
          <input
            type="text"
            id="customDomain"
            name="customDomain"
            value={settings.customDomain}
            onChange={handleChange}
            placeholder="e.g., gallery.myhotel.com"
            className={inputStyles}
          />
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Requires DNS configuration. Leave blank to use the default URL.
          </p>
        </div>
        <div className="flex justify-start pt-2">
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Save Branding Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortalSettings;
