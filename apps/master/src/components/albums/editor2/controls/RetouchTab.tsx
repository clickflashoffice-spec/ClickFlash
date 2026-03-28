import React from "react";
import { Loader2 } from "lucide-react";

interface RetouchTabProps {
  retouchBrushSize?: number;
  onRetouchBrushSizeChange?: (size: number) => void;
  onRetouchDone?: () => void;
  isProcessing?: boolean;
}

import styled from "@emotion/styled";

const BrushPreview = styled.div<{ size: number }>`
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
`;

export const RetouchTab: React.FC<RetouchTabProps> = ({
  retouchBrushSize = 20,
  onRetouchBrushSizeChange,
  onRetouchDone,
  isProcessing,
}) => {
  return (
    <div className="flex flex-col h-full p-4 space-y-6">
      {/* Brush Size */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 block">
          Brush Size: {retouchBrushSize}px
        </label>
        <input
          type="range"
          min={5}
          max={100}
          value={retouchBrushSize}
          onChange={(e) => onRetouchBrushSizeChange?.(Number(e.target.value))}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          aria-label="Brush Size"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-medium">
          <span>5px</span>
          <span>100px</span>
        </div>
      </div>

      <div className="flex justify-center py-6 bg-gray-50 rounded-2xl border border-gray-200 relative">
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl z-10">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        )}
        <BrushPreview
          size={retouchBrushSize}
          className="rounded-full bg-blue-500/20 border-2 border-blue-500 transition-all shadow-inner"
        />
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-[11px] text-gray-600 leading-relaxed space-y-2">
        <p className="flex items-center gap-2">
          ✨ <strong className="text-blue-600">Content-Aware Remove</strong>
        </p>
        <p>
          🖱️ <strong className="text-gray-800">Paint over</strong> objects to
          remove them from the scene.
        </p>
        <p>
          ⌨️ <strong className="text-gray-800">[ / ]</strong> to adjust brush
          size
        </p>
        <p>
          ⌨️ <strong className="text-gray-800">Z</strong> to toggle zoom
        </p>
      </div>

      {/* Done Button */}
      <button
        onClick={onRetouchDone}
        className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all mt-auto flex items-center justify-center gap-2 border border-gray-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Finish Retouching
      </button>
    </div>
  );
};
