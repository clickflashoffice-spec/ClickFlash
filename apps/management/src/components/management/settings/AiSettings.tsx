import React, { useState } from "react";
import { useSystemSetting } from "../../../hooks/useSystemSetting";
import {
  BrainCircuit,
  Save,
  Key,
  Settings2,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

interface AiSettingsType {
  provider: "openai" | "anthropic" | "gemini";
  apiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
}

const DEFAULT_SETTINGS: AiSettingsType = {
  provider: "gemini",
  apiKey: "",
  defaultModel: "gemini-2.5-flash",
  maxTokens: 2048,
  temperature: 0.7,
  enabled: true,
};

const AiSettings: React.FC = () => {
  const {
    value: settings,
    update: setSettings,
    isLoading,
  } = useSystemSetting<AiSettingsType>("aiSettings", DEFAULT_SETTINGS);

  const [showApiKey, setShowApiKey] = useState(false);

  const handleChange = (field: keyof AiSettingsType, value: any) => {
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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <BrainCircuit className="w-6 h-6 text-cyan-600" />
            Ecosystem <span className="text-cyan-600">AI Central</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Configure the global AI API key and model preferences used across
            all Management, Master, and Kiosk instances.
          </p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 pr-4 rounded-full shadow-sm">
          <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              AI Features
            </span>
            <label className="relative inline-flex items-center cursor-pointer mt-1">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.enabled}
                onChange={(e) => handleChange("enabled", e.target.checked)}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity duration-300 ${!settings.enabled ? "opacity-50 pointer-events-none" : "opacity-100"}`}
      >
        {/* Connection Configuration */}
        <div className="bg-white border text-left border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-cyan-600" />
            API Credentials
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                AI Provider
              </label>
              <select
                value={settings.provider}
                onChange={(e) => handleChange("provider", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-bold cursor-pointer"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Global API Key (Secret)
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => handleChange("apiKey", e.target.value)}
                  placeholder="Enter your API Key starting with 'AIzaSy...' or 'sk-...'"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-mono text-sm"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-cyan-600 transition-colors rounded-lg hover:bg-cyan-50"
                  type="button"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 ml-1">
                This key will be securely synced to all Master stations for
                local AI generation tasks.
              </p>
            </div>
          </div>
        </div>

        {/* Inference Settings */}
        <div className="bg-white border text-left border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Settings2 className="w-4 h-4 text-cyan-600" />
            Inference Defaults
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Default Model
              </label>
              <input
                type="text"
                value={settings.defaultModel}
                onChange={(e) => handleChange("defaultModel", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-mono text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-1 ml-1">
                e.g., gemini-2.5-flash
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Max Output Tokens
              </label>
              <input
                type="number"
                value={settings.maxTokens}
                onChange={(e) =>
                  handleChange("maxTokens", parseInt(e.target.value) || 2048)
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                Temperature ({settings.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) =>
                  handleChange("temperature", parseFloat(e.target.value))
                }
                className="w-full mt-2 accent-cyan-500"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Indicator */}
      <div className="flex items-center gap-2 text-sm text-cyan-600 font-bold border-t border-slate-100 pt-6">
        <div className="p-1 px-3 bg-cyan-50 rounded-full flex items-center gap-2">
          <Save className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-widest">
            AI Settings are automatically synchronized across the ecosystem
          </span>
        </div>
      </div>
    </div>
  );
};

export default AiSettings;
