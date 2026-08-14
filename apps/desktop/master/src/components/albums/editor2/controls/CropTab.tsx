import React, { useState } from "react";

interface CropTabProps {
  isCropping?: boolean;
  onCropStart?: () => void;
  cropAspectRatio?: number;
  onCropAspectRatioChange?: (ratio: number | undefined) => void;
}

const ASPECT_RATIOS = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:2", value: 3 / 2 },
  { label: "2:3", value: 2 / 3 },
];

export const CropTab: React.FC<CropTabProps> = ({
  isCropping,
  onCropStart,
  cropAspectRatio,
  onCropAspectRatioChange,
}) => {
  const [customW, setCustomW] = useState<number | "">(
    cropAspectRatio && cropAspectRatio > 1 ? 4 : 3,
  );
  const [customH, setCustomH] = useState<number | "">(
    cropAspectRatio && cropAspectRatio > 1 ? 3 : 4,
  );

  const handleCustomChange = (w: number | "", h: number | "") => {
    if (typeof w === "number" && typeof h === "number" && h !== 0) {
      onCropAspectRatioChange?.(w / h);
    }
  };

  const handleSwap = () => {
    const oldW = customW;
    const oldH = customH;
    setCustomW(oldH);
    setCustomH(oldW);
    handleCustomChange(oldH, oldW);
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-6">
      {/* Aspect Ratio Selection */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">
          Aspect Ratio
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.label}
              onClick={() => onCropAspectRatioChange?.(ratio.value)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                cropAspectRatio === ratio.value
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Aspect Ratio */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex justify-between items-center mb-3">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
            Custom Ratio
          </label>
          <button
            onClick={handleSwap}
            className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-tighter"
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
                const val = e.target.value === "" ? "" : Number(e.target.value);
                setCustomW(val);
                handleCustomChange(val, customH);
              }}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs font-bold focus:border-blue-500 outline-none transition-all"
              placeholder="W"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-mono">
              W
            </span>
          </div>
          <span className="text-gray-400 font-bold">:</span>
          <div className="flex-1 relative">
            <input
              type="number"
              value={customH}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Number(e.target.value);
                setCustomH(val);
                handleCustomChange(customW, val);
              }}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs font-bold focus:border-blue-500 outline-none transition-all"
              placeholder="H"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-mono">
              H
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-[11px] text-gray-600 leading-relaxed">
        <p className="mb-2">
          🖱️ <strong className="text-gray-800">Drag</strong> to move crop area
        </p>
        <p className="mb-2">
          ↔️ <strong className="text-gray-800">Drag handles</strong> to resize
        </p>
        <p>
          ⌨️ <strong className="text-gray-800">Shift</strong> for freeform
        </p>
      </div>

      {/* Action Buttons */}
      {!isCropping && (
        <button
          onClick={onCropStart}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all mt-auto shadow-lg shadow-blue-500/25"
        >
          Start Cropping
        </button>
      )}
    </div>
  );
};
