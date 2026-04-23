import React, { useState } from "react";
import Modal from "../common/Modal";
import { EcommerceExtension } from "../../types";

interface ExtensionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (extension: EcommerceExtension) => void;
}

const PRESETS = [
  {
    name: "AliExpress Dropshipping",
    type: "wholesaler",
    description:
      "Connect with AliExpress for automated order fulfillment and dropshipping.",
    icon: "🛒",
    configKeys: "App Key, Secret, Tracking Webhook",
  },
  {
    name: "Alibaba Sourcing",
    type: "wholesaler",
    description: "Source products directly from Alibaba manufacturers.",
    icon: "🏷️",
    configKeys: "Account ID, API Token",
  },
  {
    name: "eBay Connect",
    type: "marketplace",
    description: "Sync your products and orders directly with your eBay store.",
    icon: "🛍️",
    configKeys: "Client ID, Client Secret, Dev ID",
  },
  {
    name: "Automation Bot (Generic)",
    type: "automation",
    description:
      "Generic webhook-based bot for automated workflows and notifications.",
    icon: "🤖",
    configKeys: "Bot Webhook URL, Secret Token, Trigger Events",
  },
];

const ExtensionCreateModal: React.FC<ExtensionCreateModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "other",
    description: "",
    icon: "🔌",
    configKeys: "", // Comma separated keys
  });

  const handleLoadPreset = (presetName: string) => {
    const preset = PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setFormData({
        name: preset.name,
        type: preset.type,
        description: preset.description,
        icon: preset.icon,
        configKeys: preset.configKeys,
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Transform configKeys string into initial config object
    const config: Record<string, string> = {};
    if (formData.configKeys.trim()) {
      formData.configKeys
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k)
        .forEach((key) => {
          config[key] = "";
        });
    }

    const newExtension: EcommerceExtension = {
      id: `ext_custom_${Date.now()}`,
      name: formData.name,
      status: "inactive",
      description: formData.description,
      icon: formData.icon,
      config,
    };

    onSave(newExtension);
    onClose();
    // Reset form
    setFormData({
      name: "",
      type: "other",
      description: "",
      icon: "🔌",
      configKeys: "",
    });
  };

  const inputClasses =
    "w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors";
  const labelClasses =
    "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Custom Extension">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800/50 mb-6">
          <label
            className={`${labelClasses} text-purple-700 dark:text-purple-300`}
          >
            Quick Load Preset
          </label>
          <select
            onChange={(e) => handleLoadPreset(e.target.value)}
            className={`${inputClasses} border-purple-200 dark:border-purple-800 focus:ring-purple-500`}
            defaultValue=""
          >
            <option value="" disabled>
              Select a platform preset...
            </option>
            {PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-medium">
            Select a preset to auto-fill common configuration fields.
          </p>
        </div>

        <div>
          <label className={labelClasses}>Extension Name</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className={inputClasses}
            placeholder="e.g., My Wholesaler Integration"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Type</label>
            <input
              type="text"
              name="type"
              required
              value={formData.type}
              onChange={handleChange}
              className={inputClasses}
              list="extension-types"
            />
            <datalist id="extension-types">
              <option value="payment" />
              <option value="shipping" />
              <option value="marketing" />
              <option value="analytics" />
              <option value="wholesaler" />
              <option value="other" />
            </datalist>
          </div>
          <div>
            <label className={labelClasses}>Icon (Emoji)</label>
            <input
              type="text"
              name="icon"
              required
              value={formData.icon}
              onChange={handleChange}
              className={inputClasses}
              placeholder="e.g., 🔌"
            />
          </div>
        </div>

        <div>
          <label className={labelClasses}>Description</label>
          <textarea
            name="description"
            required
            value={formData.description}
            onChange={handleChange}
            className={inputClasses}
            rows={2}
            placeholder="Briefly describe what this extension does..."
          />
        </div>

        <div>
          <label className={labelClasses}>Configuration Fields</label>
          <input
            type="text"
            name="configKeys"
            value={formData.configKeys}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Comma separated keys, e.g., API Key, Secret Token, Region"
          />
          <p className="text-xs text-slate-500 mt-1">
            These will become the input fields in the configuration modal.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Create Extension
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ExtensionCreateModal;
