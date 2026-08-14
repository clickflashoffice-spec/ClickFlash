import React from "react";
import { useSystemSetting } from "../../../hooks/useSystemSetting";
import {
  Image,
  Maximize,
  Zap,
  HardDrive,
  FileImage,
  Palette,
} from "lucide-react";

interface PhotoSettingsType {
  maxUploadSize: number;
  thumbnailQuality: number;
  previewQuality: number;
  autoProcess: boolean;
  faceRecognition: boolean;
  compressionLevel: "low" | "medium" | "high";
  allowedFormats: string[];
  defaultCategory: string;
  autoEnhance: boolean;
  watermarkOnDownload: boolean;
}

const DEFAULT_SETTINGS: PhotoSettingsType = {
  maxUploadSize: 50,
  thumbnailQuality: 85,
  previewQuality: 90,
  autoProcess: true,
  faceRecognition: true,
  compressionLevel: "medium",
  allowedFormats: ["jpg", "jpeg", "png", "raw", "cr2", "nef"],
  defaultCategory: "general",
  autoEnhance: false,
  watermarkOnDownload: true,
};

const PhotoSettings: React.FC = () => {
  const {
    value: settings,
    update: setSettings,
    isLoading,
  } = useSystemSetting<PhotoSettingsType>("photoSettings", DEFAULT_SETTINGS);

  const handleChange = (field: keyof PhotoSettingsType, value: PhotoSettingsType[keyof PhotoSettingsType]) => {
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
          <Image className="w-6 h-6 text-cyan-600" />
          Photo <span className="text-cyan-600">Processing</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Configure image processing, compression, and storage settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Settings */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Maximize className="w-4 h-4 text-cyan-600" />
            Upload Configuration
          </h3>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-400">
                Max Upload Size (MB)
              </label>
              <span className="text-sm text-cyan-400 font-mono">
                {settings.maxUploadSize}MB
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              value={settings.maxUploadSize}
              onChange={(e) =>
                handleChange("maxUploadSize", Number(e.target.value))
              }
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Maximum file size per photo upload
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
              Allowed Formats
            </label>
            <div className="flex flex-wrap gap-2">
              {["jpg", "jpeg", "png", "raw", "cr2", "nef", "arw", "dng"].map(
                (format) => (
                  <button
                    key={format}
                    onClick={() => {
                      const newFormats = settings.allowedFormats.includes(
                        format,
                      )
                        ? settings.allowedFormats.filter((f) => f !== format)
                        : [...settings.allowedFormats, format];
                      handleChange("allowedFormats", newFormats);
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      settings.allowedFormats.includes(format)
                        ? "bg-cyan-50 text-cyan-600 border border-cyan-200 shadow-sm"
                        : "bg-slate-50 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Quality Settings */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-600" />
            Quality & Compression
          </h3>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-400">
                Thumbnail Quality
              </label>
              <span className="text-sm text-cyan-400 font-mono">
                {settings.thumbnailQuality}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={settings.thumbnailQuality}
              onChange={(e) =>
                handleChange("thumbnailQuality", Number(e.target.value))
              }
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-400">
                Preview Quality
              </label>
              <span className="text-sm text-cyan-400 font-mono">
                {settings.previewQuality}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={settings.previewQuality}
              onChange={(e) =>
                handleChange("previewQuality", Number(e.target.value))
              }
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
              Compression Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => handleChange("compressionLevel", level)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    settings.compressionLevel === level
                      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20 active:scale-95"
                      : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Processing Features */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-600" />
            Processing Features
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Zap className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Auto-Process Uploads
                  </h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Automatically generate thumbnails and previews
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoProcess}
                onChange={(e) => handleChange("autoProcess", e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
              />
            </div>

            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FileImage className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Face Recognition
                  </h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Enable AI-powered face grouping
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.faceRecognition}
                onChange={(e) =>
                  handleChange("faceRecognition", e.target.checked)
                }
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
              />
            </div>

            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Palette className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Auto-Enhance
                  </h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Apply automatic color correction
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoEnhance}
                onChange={(e) => handleChange("autoEnhance", e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
              />
            </div>

            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <HardDrive className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Watermark Downloads
                  </h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Apply watermark to customer downloads
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.watermarkOnDownload}
                onChange={(e) =>
                  handleChange("watermarkOnDownload", e.target.checked)
                }
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
              />
            </div>
          </div>
        </div>

        {/* Storage Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 lg:col-span-2 shadow-inner">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <HardDrive className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Storage <span className="text-cyan-600">Configuration</span>
              </h4>
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-0.5">
                Photos are securely stored in Cloudflare R2
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoSettings;
