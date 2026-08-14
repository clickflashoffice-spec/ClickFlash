import React from "react";
import { ManualEdits } from "../../../../types";
import { SliderControl as SharedSlider } from "./SliderControl";
import {
  Layers,
  Crop,
  Brush,
  Sun,
  Palette,
  Sparkles,
  Undo2,
  Redo2,
  RotateCcw,
} from "lucide-react";

type TabType = "transform" | "crop" | "retouch" | "light" | "color" | "effects";

interface FilterControlsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  edits: ManualEdits;
  originalEdits: ManualEdits;
  handleEditChange: (changes: Partial<ManualEdits>) => void;

  // Crop
  cropAspectRatio: number | undefined;
  handleCropAspectRatioChange: (ratio: number | undefined) => void;
  customW: number | "";
  setCustomW: (w: number | "") => void;
  customH: number | "";
  setCustomH: (h: number | "") => void;

  // Retouch
  retouchBrushSize: number;
  handleRetouchBrushSizeChange: (size: number) => void;
  handleRetouchDone: () => void;

  // Actions
  handleUndo: () => void;
  handleRedo: () => void;
  historyIndex: number;
  historyLength: number;
  handleReset: () => void;
  onClose: () => void;
  handleSave: () => void;
  isSaving: boolean;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  activeTab,
  setActiveTab,
  edits,
  originalEdits,
  handleEditChange,
  cropAspectRatio,
  handleCropAspectRatioChange,
  customW,
  setCustomW,
  customH,
  setCustomH,
  retouchBrushSize,
  handleRetouchBrushSizeChange,
  handleRetouchDone,
  handleUndo,
  handleRedo,
  historyIndex,
  historyLength,
  handleReset,
  onClose,
  handleSave,
  isSaving,
}) => {
  const isControlModified = (key: keyof ManualEdits) =>
    edits[key] !== originalEdits[key];
  const getModifiedCount = (keys: (keyof ManualEdits)[]) =>
    keys.filter((key) => isControlModified(key)).length;

  return (
    <div className="w-80 flex-shrink-0 bg-slate-900 border-l border-white/5 flex flex-col overflow-hidden z-20">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex p-1 bg-black/40 m-3 rounded-2xl border border-white/5">
          {(
            [
              "transform",
              "crop",
              "retouch",
              "light",
              "color",
              "effects",
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab;
            const modifiedCount =
              tab === "transform"
                ? getModifiedCount([
                    "rotate",
                    "straighten",
                    "perspectiveX",
                    "perspectiveY",
                  ])
                : tab === "crop"
                  ? edits.crop
                    ? 1
                    : 0
                  : tab === "retouch"
                    ? edits.retouchActions && edits.retouchActions.length > 0
                      ? edits.retouchActions.length
                      : 0
                    : tab === "light"
                      ? getModifiedCount([
                          "exposure",
                          "contrast",
                          "highlights",
                          "shadows",
                          "whites",
                          "blacks",
                        ])
                      : tab === "color"
                        ? getModifiedCount([
                            "saturate",
                            "vibrance",
                            "hueRotate",
                            "temperature",
                            "tint",
                          ])
                        : getModifiedCount([
                            "clarity",
                            "soften",
                            "sepia",
                            "grayscale",
                            "invert",
                            "dropShadow",
                          ]);

            const Icon =
              tab === "transform"
                ? Layers
                : tab === "crop"
                  ? Crop
                  : tab === "retouch"
                    ? Brush
                    : tab === "light"
                      ? Sun
                      : tab === "color"
                        ? Palette
                        : Sparkles;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-tighter rounded-xl transition-all relative group/tab ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <Icon
                    className={`h-3.5 w-3.5 transition-transform ${isActive ? "scale-110" : "group-hover/tab:scale-110"}`}
                  />
                  <span className="hidden md:block text-[8px]">
                    {tab === "transform"
                      ? "Trans"
                      : tab === "crop"
                        ? "Crop"
                        : tab === "retouch"
                          ? "Touch"
                          : tab}
                  </span>
                </div>
                {modifiedCount > 0 && (
                  <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] border border-blue-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Controls */}
        <div className="flex-1 overflow-y-auto px-5 py-2 custom-scrollbar space-y-6">
          {/* Transform Tab */}
          {activeTab === "transform" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() =>
                      handleEditChange({ rotate: (edits.rotate || 0) - 90 })
                    }
                    className="bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold py-3 rounded-lg transition-all text-slate-300"
                  >
                    Rotate Left
                  </button>
                  <button
                    onClick={() =>
                      handleEditChange({ rotate: (edits.rotate || 0) + 90 })
                    }
                    className="bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold py-3 rounded-lg transition-all text-slate-300"
                  >
                    Rotate Right
                  </button>
                </div>
                <SharedSlider
                  label="Straighten"
                  value={edits.straighten || 0}
                  onChange={(v) => handleEditChange({ straighten: v })}
                  min={-15}
                  max={15}
                  step={0.1}
                />
                <SharedSlider
                  label="Vertical Tilt"
                  value={edits.perspectiveY || 0}
                  onChange={(v) => handleEditChange({ perspectiveY: v })}
                  min={-50}
                  max={50}
                />
                <SharedSlider
                  label="Horizontal Tilt"
                  value={edits.perspectiveX || 0}
                  onChange={(v) => handleEditChange({ perspectiveX: v })}
                  min={-50}
                  max={50}
                />
              </div>
            </div>
          )}

          {/* Crop Tab */}
          {activeTab === "crop" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Free", value: undefined },
                    { label: "1:1", value: 1 },
                    { label: "4:3", value: 4 / 3 },
                    { label: "16:9", value: 16 / 9 },
                    { label: "3:2", value: 3 / 2 },
                    { label: "2:3", value: 2 / 3 },
                  ].map((ratio) => (
                    <button
                      key={ratio.label}
                      onClick={() => handleCropAspectRatioChange(ratio.value)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        cropAspectRatio === ratio.value
                          ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                          : "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Custom Ratio
                  </label>
                  <button
                    onClick={() => {
                      const w = Number(customW) || 0;
                      const h = Number(customH) || 0;
                      setCustomW(h);
                      setCustomH(w);
                      if (h && w) {
                        handleCropAspectRatioChange(h / w);
                      }
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest transition-colors"
                  >
                    ⇄ Swap
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={customW}
                      onChange={(e) => {
                        const val =
                          e.target.value === "" ? "" : Number(e.target.value);
                        setCustomW(val);
                        if (val && customH) {
                          handleCropAspectRatioChange(val / Number(customH));
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:border-blue-500 outline-none transition-all"
                      placeholder="W"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-mono">
                      W
                    </span>
                  </div>
                  <span className="text-slate-500 font-bold">:</span>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={customH}
                      onChange={(e) => {
                        const val =
                          e.target.value === "" ? "" : Number(e.target.value);
                        setCustomH(val);
                        if (customW && val) {
                          handleCropAspectRatioChange(Number(customW) / val);
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:border-blue-500 outline-none transition-all"
                      placeholder="H"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-mono">
                      H
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-[11px] text-slate-400 leading-relaxed space-y-2">
                <p>🖱️ Drag to move crop area</p>
                <p>↔️ Drag handles to resize</p>
                <p>⌨️ ESC to cancel cropping</p>
              </div>
            </div>
          )}

          {/* Retouch Tab */}
          {activeTab === "retouch" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">
                  Brush Size: {retouchBrushSize}px
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={retouchBrushSize}
                  onChange={(e) =>
                    handleRetouchBrushSizeChange(Number(e.target.value))
                  }
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  aria-label="Brush Size"
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-2 font-mono">
                  <span>5px</span>
                  <span>100px</span>
                </div>
              </div>

              <div className="flex justify-center py-8 bg-white/5 rounded-2xl border border-white/5 relative">
                <div
                  style={{
                    width: `${retouchBrushSize}px`,
                    height: `${retouchBrushSize}px`,
                    maxHeight: "100px",
                    maxWidth: "100px",
                  }}
                  className="rounded-full bg-blue-500/20 border border-blue-500 transition-all shadow-[inset_0_0_8px_rgba(59,130,246,0.5)]"
                />
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-[11px] text-slate-400 leading-relaxed space-y-2">
                <p className="flex items-center gap-1.5 text-blue-400 font-bold">
                  ✨ Spot Healing (Content-Aware)
                </p>
                <p>1. Click/tap on the blemish on the image (Target).</p>
                <p>2. Click/tap on a clean area nearby to clone from (Source).</p>
                <p>3. The blemish will be seamlessly blended away!</p>
                <p>⌨️ Press [ or ] to adjust brush size.</p>
                <p>⌨️ Hold Z key to show a magnifier loupe.</p>
              </div>

              <button
                onClick={handleRetouchDone}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[11px] font-black text-slate-300 uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Finish Retouching
              </button>
            </div>
          )}

          {/* Light Tab */}
          {activeTab === "light" && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <SharedSlider
                label="Exposure"
                value={edits.exposure || 0}
                onChange={(v) => handleEditChange({ exposure: v })}
              />
              <SharedSlider
                label="Contrast"
                value={edits.contrast || 0}
                onChange={(v) => handleEditChange({ contrast: v })}
              />
              <SharedSlider
                label="Highlights"
                value={edits.highlights || 0}
                onChange={(v) => handleEditChange({ highlights: v })}
              />
              <SharedSlider
                label="Shadows"
                value={edits.shadows || 0}
                onChange={(v) => handleEditChange({ shadows: v })}
              />
              <SharedSlider
                label="Whites"
                value={edits.whites || 0}
                onChange={(v) => handleEditChange({ whites: v })}
                min={0}
                max={100}
              />
              <SharedSlider
                label="Blacks"
                value={edits.blacks || 0}
                onChange={(v) => handleEditChange({ blacks: v })}
                min={0}
                max={100}
              />
            </div>
          )}

          {/* Color Tab */}
          {activeTab === "color" && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <SharedSlider
                label="Saturation"
                value={edits.saturate || 0}
                onChange={(v) => handleEditChange({ saturate: v })}
              />
              <SharedSlider
                label="Vibrance"
                value={edits.vibrance || 0}
                onChange={(v) => handleEditChange({ vibrance: v })}
              />
              <SharedSlider
                label="Hue"
                value={edits.hueRotate || 0}
                onChange={(v) => handleEditChange({ hueRotate: v })}
                min={0}
                max={360}
              />
              <SharedSlider
                label="Temperature"
                value={edits.temperature || 0}
                onChange={(v) => handleEditChange({ temperature: v })}
              />
              <SharedSlider
                label="Tint"
                value={edits.tint || 0}
                onChange={(v) => handleEditChange({ tint: v })}
              />
            </div>
          )}

          {/* Effects Tab */}
          {activeTab === "effects" && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <SharedSlider
                label="Clarity"
                value={edits.clarity || 0}
                onChange={(v) => handleEditChange({ clarity: v })}
                min={0}
                max={100}
              />
              <SharedSlider
                label="Soften"
                value={edits.soften || 0}
                onChange={(v) => handleEditChange({ soften: v })}
                min={0}
                max={20}
              />
              <SharedSlider
                label="Sepia"
                value={edits.sepia || 0}
                onChange={(v) => handleEditChange({ sepia: v })}
                min={0}
                max={100}
              />
              <SharedSlider
                label="B&W"
                value={edits.grayscale || 0}
                onChange={(v) => handleEditChange({ grayscale: v })}
                min={0}
                max={100}
              />
            </div>
          )}
        </div>

        {/* Action Bar (Save/Cancel) */}
        <div className="p-5 border-t border-white/10 bg-black/40 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex gap-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all border border-white/5"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-5 h-5 text-slate-300" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= historyLength - 1}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all border border-white/5"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-5 h-5 text-slate-300" />
              </button>
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-red-400 transition-colors group"
            >
              <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform" />
              Reset All
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[11px] font-black text-slate-300 uppercase tracking-widest transition-all active:scale-95"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-[1.5] py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[11px] font-black text-white uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:bg-slate-700 disabled:opacity-50"
            >
              {isSaving ? "Finalizing..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
