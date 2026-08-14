import React, { useState } from 'react';
import { useSystemSetting } from "../../../hooks/useSystemSetting";
import { Droplets, RefreshCw, Shield, Image as ImageIcon } from "lucide-react";

export interface WatermarkSettingsType {
  enabled: boolean;
  imageUrl: string;
  opacity: number;
  scale: number;
  position:
    | "top-left"
    | "top-center"
    | "top-right"
    | "center-left"
    | "center"
    | "center-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  dynamicProtection: boolean;
  autoWatermark: boolean;
}

const DEFAULT_SETTINGS: WatermarkSettingsType = {
  enabled: true,
  imageUrl: "",
  opacity: 50,
  scale: 30,
  position: "center",
  dynamicProtection: true,
  autoWatermark: true,
};

export const WatermarkSettings: React.FC = () => {
  const {
    value: settings,
    update: setSettings,
    isLoading,
  } = useSystemSetting<WatermarkSettingsType>(
    "watermarkSettings",
    DEFAULT_SETTINGS,
  );
  const [previewImage] = useState("https://picsum.photos/id/1015/600/400");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setSettings({ ...settings, imageUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const getPositionStyle = (pos: string): React.CSSProperties => {
    const base: React.CSSProperties = { position: "absolute" };
    switch (pos) {
      case "top-left":
        return { ...base, top: "10px", left: "10px" };
      case "top-center":
        return {
          ...base,
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
        };
      case "top-right":
        return { ...base, top: "10px", right: "10px" };
      case "center-left":
        return {
          ...base,
          top: "50%",
          left: "10px",
          transform: "translateY(-50%)",
        };
      case "center":
        return {
          ...base,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
      case "center-right":
        return {
          ...base,
          top: "50%",
          right: "10px",
          transform: "translateY(-50%)",
        };
      case "bottom-left":
        return { ...base, bottom: "10px", left: "10px" };
      case "bottom-center":
        return {
          ...base,
          bottom: "10px",
          left: "50%",
          transform: "translateX(-50%)",
        };
      case "bottom-right":
        return { ...base, bottom: "10px", right: "10px" };
      default:
        return {
          ...base,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
    }
  };

  const resetToDefaults = () => setSettings(DEFAULT_SETTINGS);

  const positions: WatermarkSettingsType["position"][] = [
    "top-left",
    "top-center",
    "top-right",
    "center-left",
    "center",
    "center-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ];

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
            <Droplets className="w-6 h-6 text-cyan-600" />
            Watermark <span className="text-cyan-600">Protection</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Configure global watermark settings for customer galleries
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) =>
              setSettings({ ...settings, enabled: e.target.checked })
            }
            className="sr-only peer"
          />
          <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-600 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-cyan-500"></div>
          <span className="ml-3 text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
            {settings.enabled ? "Enabled" : "Disabled"}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
              <ImageIcon className="w-4 h-4 text-cyan-600" />
              Watermark Logo
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer group">
                <div className="border-2 border-dashed border-slate-700 group-hover:border-cyan-500/50 rounded-xl p-6 text-center transition-all">
                  <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-2 group-hover:text-cyan-400 transition-colors" />
                  <span className="text-sm text-slate-500 group-hover:text-slate-300">
                    Click to upload watermark image
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {settings.imageUrl && (
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-700">
                  <img
                    src={settings.imageUrl}
                    alt="Watermark"
                    className="w-full h-full object-contain bg-slate-900"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between mb-4">
              <label className="text-sm font-black text-slate-400 uppercase tracking-widest">
                Opacity
              </label>
              <span className="text-sm text-cyan-600 font-black">
                {settings.opacity}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={settings.opacity}
              onChange={(e) =>
                setSettings({ ...settings, opacity: Number(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Scale Slider */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between mb-4">
              <label className="text-sm font-black text-slate-400 uppercase tracking-widest">
                Scale
              </label>
              <span className="text-sm text-cyan-600 font-black">
                {settings.scale}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={settings.scale}
              onChange={(e) =>
                setSettings({ ...settings, scale: Number(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Position Grid */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 block">
              Position
            </label>
            <div className="grid grid-cols-3 gap-2 w-44 mx-auto">
              {positions.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setSettings({ ...settings, position: pos })}
                  title={`Position: ${pos}`}
                  className={`w-12 h-12 rounded-xl border transition-all flex items-center justify-center ${
                    settings.position === pos
                      ? "bg-cyan-50 border-cyan-500 text-cyan-600 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-300 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${settings.position === pos ? "bg-cyan-600" : "bg-current"}`}
                  ></div>
                </button>
              ))}
            </div>
          </div>

          {/* Protection Options */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-cyan-100 rounded-lg text-cyan-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Dynamic Anti-Theft
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Randomly shift watermark
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.dynamicProtection}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dynamicProtection: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded-lg border-slate-300 bg-white text-cyan-600 focus:ring-cyan-500/20"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Auto-Apply
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Watermark new uploads
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoWatermark}
                onChange={(e) =>
                  setSettings({ ...settings, autoWatermark: e.target.checked })
                }
                className="w-5 h-5 rounded-lg border-slate-300 bg-white text-cyan-600 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>

        {/* Preview Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 block text-center">
            Live Preview
          </h3>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner p-1">
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-auto block"
              />
              {settings.enabled && settings.imageUrl && (
                <img
                  src={settings.imageUrl}
                  alt="Watermark"
                  className={`absolute pointer-events-none ${settings.dynamicProtection ? "animate-pulse" : ""}`}
                  style={
                    {
                      ...getPositionStyle(settings.position),
                      opacity: settings.opacity / 100,
                      width: `${settings.scale}%`,
                      height: "auto",
                    } as React.CSSProperties
                  }
                />
              )}
              {settings.enabled && !settings.imageUrl && (
                <div
                  className="absolute pointer-events-none bg-white/80 text-slate-900 px-4 py-2 rounded-lg shadow-lg font-black text-base uppercase tracking-tighter"
                  style={
                    {
                      ...getPositionStyle(settings.position),
                      opacity: settings.opacity / 100,
                    } as React.CSSProperties
                  }
                >
                  CLICKFLASH
                </div>
              )}
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 text-center">
            Preview shows how watermarks appear on galleries
          </p>
        </div>
      </div>
    </div>
  );
};

export default WatermarkSettings;
