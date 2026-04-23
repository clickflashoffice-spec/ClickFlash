import React, { useCallback } from "react";
import { ManualEdits } from "../../../../types/shared";
import { FilterPanel } from "../components/FilterPanel";
import { SliderControl } from "./SliderControl";

interface AdjustTabProps {
  edits: ManualEdits;
  onUpdate: (updates: Partial<ManualEdits>) => void;
  onStraightenStart?: () => void;
  onStraightenEnd?: () => void;
  isStraightening?: boolean;
  // Batch props
  onCopyEdits?: () => void;
  onPasteEdits?: () => void;
  hasCopiedEdits?: boolean;
  selectedCount?: number;
  // Undo/Redo (passed down from parent for FilterPanel)
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onResetActiveEdit?: () => void;
  activePhotoUrl?: string; // For live preset previews
}

export const AdjustTab: React.FC<AdjustTabProps> = ({
  edits,
  onUpdate,
  onStraightenStart,
  onStraightenEnd,
  isStraightening,
  onCopyEdits,
  onPasteEdits,
  hasCopiedEdits,
  selectedCount,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onResetActiveEdit,
  activePhotoUrl,
}) => {
  const handleFilterChange = useCallback(
    (changes: Partial<ManualEdits>) => {
      onUpdate(changes);
    },
    [onUpdate],
  );

  const handleFilterReset = useCallback(() => {
    onUpdate({
      exposure: 0,
      contrast: 0,
      saturate: 0,
      highlights: 0,
      shadows: 0,
      temperature: 0,
      tint: 0,
      vibrance: 0,
      sharpen: 0,
      whites: 0,
      blacks: 0,
      soften: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0,
    });
  }, [onUpdate]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-none">
        <FilterPanel
          filters={edits}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
          undo={onUndo}
          redo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          activePhotoUrl={activePhotoUrl}
        />

        {/* Geometry (Keeping separate as it's not in FilterPanel) */}
        <div className="px-4 py-3 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-y border-gray-200 flex justify-between items-center">
          <span>Geometry</span>
          {edits.straighten !== 0 && (
            <button
              onClick={() => onUpdate({ straighten: 0 })}
              className="text-red-500 hover:text-red-600 text-[10px] lowercase font-normal"
            >
              Reset
            </button>
          )}
        </div>
        <div className="py-2">
          <SliderControl
            label="Straighten"
            value={edits.straighten || 0}
            min={-45}
            max={45}
            onChange={(v) => onUpdate({ straighten: v })}
            onStart={onStraightenStart}
            onEnd={onStraightenEnd}
            className={
              isStraightening
                ? "bg-blue-500/10 ring-1 ring-blue-500/50 rounded-md transition-all"
                : ""
            }
          />
        </div>

        {/* Batch Edits */}
        <div className="px-4 py-3 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-y border-gray-200 flex justify-between items-center">
          <span>Batch & Single Actions</span>
          {selectedCount ? (
            <span className="text-blue-600 lowercase font-normal">
              {selectedCount} selected
            </span>
          ) : (
            <span className="text-gray-400 lowercase font-normal italic">
              single photo mode
            </span>
          )}
        </div>

        <div className="p-4 space-y-3 mb-10">
          <button
            onClick={onCopyEdits}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded text-sm font-medium transition-colors border border-gray-200 flex items-center justify-center gap-2"
          >
            <span>📋</span> Copy Edits
          </button>

          <button
            onClick={onPasteEdits}
            disabled={!hasCopiedEdits}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 text-white rounded text-sm font-medium transition-all border border-blue-600 flex items-center justify-center gap-2"
          >
            <span>📥</span>{" "}
            {selectedCount
              ? `Paste to ${selectedCount} Selected`
              : "Paste to Current"}
          </button>

          <button
            onClick={onResetActiveEdit}
            className="w-full py-2 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 rounded text-sm font-medium transition-all border border-gray-200 hover:border-red-200 flex items-center justify-center gap-2"
          >
            <span>🔄</span> Reset to Original
          </button>

          {hasCopiedEdits && (
            <p className="text-[10px] text-gray-400 text-center italic">
              Edits copied and ready to paste
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
