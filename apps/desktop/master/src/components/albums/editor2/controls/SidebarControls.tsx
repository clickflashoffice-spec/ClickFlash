import React, { memo, useCallback } from "react";
import { ManualEdits } from "../../../../types";
import { AdjustTab } from "./AdjustTab";
import { CropTab } from "./CropTab";
import { RetouchTab } from "./RetouchTab";
import { AITab } from "./AITab";

export type EditorTab = "adjust" | "crop" | "retouch" | "ai" | "analytics";

interface SidebarControlsProps {
  edits: ManualEdits;
  onUpdate: (updates: Partial<ManualEdits>) => void;
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  // Crop props
  isCropping?: boolean;
  onCropStart?: () => void;
  cropAspectRatio?: number;
  onCropAspectRatioChange?: (ratio: number | undefined) => void;
  // Retouch props
  retouchBrushSize?: number;
  onRetouchBrushSizeChange?: (size: number) => void;
  onRetouchDone?: () => void;
  isRetouchingProcessing?: boolean;
  // AI props
  onAutoEnhance?: () => void;
  isEnhancing?: boolean;
  onAnalyzeAlbum?: () => void;
  isAnalyzing?: boolean;
  onApplyCulling?: () => void;
  isApplyingCulling?: boolean;
  cullingStats?: {
    total: number;
    selected: number;
    rejected: number;
  };
  // Batch Auto Edits Props
  albumId?: string;
  photos?: any[];
  onBatchAutoEditsComplete?: () => void;
  activePhoto?: any;
  onReviewAutoEdits?: () => void;
  // Straighten props
  isStraightening?: boolean;
  onStraightenStart?: () => void;
  onStraightenEnd?: () => void;
  // Batch props
  onCopyEdits?: () => void;
  onPasteEdits?: () => void;
  hasCopiedEdits?: boolean;
  selectedCount?: number;
  // Undo/Redo (for FilterPanel sub-tab)
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onResetActiveEdit?: () => void;
  activePhotoUrl?: string; // For live preset previews
}

const TABS: { id: EditorTab; label: string; icon: string; ariaLabel: string }[] = [
  { id: "adjust", label: "Adjust", icon: "⚙️", ariaLabel: "Adjust photo settings" },
  { id: "crop", label: "Crop", icon: "✂️", ariaLabel: "Crop photo" },
  { id: "retouch", label: "Retouch", icon: "🖌️", ariaLabel: "Retouch photo" },
  { id: "ai", label: "AI", icon: "✨", ariaLabel: "AI photo enhancement" },
  { id: "analytics", label: "Stats", icon: "📊", ariaLabel: "View photo statistics" },
];

const SidebarControlsComponent: React.FC<SidebarControlsProps> = ({
  edits,
  onUpdate,
  activeTab,
  onTabChange,
  // Crop
  isCropping,
  onCropStart,
  cropAspectRatio,
  onCropAspectRatioChange,
  // Retouch
  retouchBrushSize = 20,
  onRetouchBrushSizeChange,
  onRetouchDone,
  isRetouchingProcessing,
  // AI
  onAutoEnhance,
  isEnhancing,
  onAnalyzeAlbum,
  isAnalyzing,
  onApplyCulling,
  isApplyingCulling,
  cullingStats,
  albumId,
  photos,
  onBatchAutoEditsComplete,
  activePhoto,
  onReviewAutoEdits,
  // Straighten
  isStraightening,
  onStraightenStart,
  onStraightenEnd,
  // Batch
  onCopyEdits,
  onPasteEdits,
  hasCopiedEdits,
  selectedCount,
  // Undo/Redo
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onResetActiveEdit,
  activePhotoUrl,
}) => {
  const [editMode, setEditMode] = React.useState<'manual' | 'automatic'>(activeTab === 'ai' ? 'automatic' : 'manual');

  const handleTabChange = useCallback((tabId: EditorTab) => {
    onTabChange(tabId);
    if (tabId === 'ai') {
      setEditMode('automatic');
    } else {
      setEditMode('manual');
    }
  }, [onTabChange]);

  const handleModeChange = useCallback((mode: 'manual' | 'automatic') => {
    setEditMode(mode);
    if (mode === 'automatic') {
      onTabChange('ai');
    } else if (activeTab === 'ai') {
      onTabChange('adjust');
    }
  }, [activeTab, onTabChange]);

  const manualTabs = TABS.filter(t => t.id !== 'ai');

  return (
    <div 
      className="flex flex-col h-full bg-white border-l border-gray-200"
      role="complementary"
      aria-label="Editor controls"
    >
      {/* Top-Level Mode Switcher */}
      <div className="p-2 border-b border-gray-200 bg-slate-50 flex items-center gap-1">
        <button
          onClick={() => handleModeChange('manual')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            editMode === 'manual'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
          }`}
        >
          <span>🛠️</span>
          <span>Manual Edit</span>
        </button>
        <button
          onClick={() => handleModeChange('automatic')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            editMode === 'automatic'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50/50'
          }`}
        >
          <span>⚡</span>
          <span>Automatic Edit</span>
        </button>
      </div>

      {/* Tab Bar (Only displayed in Manual Mode) */}
      {editMode === 'manual' && (
        <div 
          className="flex border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10"
          role="tablist"
          aria-label="Editor tool tabs"
        >
          {manualTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 px-1 py-4 text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 transition-all relative ${
                activeTab === tab.id
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              aria-label={tab.ariaLabel}
            >
              <span className="text-lg" aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "adjust" && (
          <AdjustTab
            edits={edits}
            onUpdate={onUpdate}
            onStraightenStart={onStraightenStart}
            onStraightenEnd={onStraightenEnd}
            onCopyEdits={onCopyEdits}
            onPasteEdits={onPasteEdits}
            hasCopiedEdits={hasCopiedEdits}
            selectedCount={selectedCount}
            isStraightening={isStraightening}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onResetActiveEdit={onResetActiveEdit}
            activePhotoUrl={activePhotoUrl}
          />
        )}
        {activeTab === "crop" && (
          <div
            role="tabpanel"
            id="crop-panel"
            aria-labelledby="crop-tab"
          >
            <CropTab
              isCropping={isCropping}
              onCropStart={onCropStart}
              cropAspectRatio={cropAspectRatio}
              onCropAspectRatioChange={onCropAspectRatioChange}
            />
          </div>
        )}
        {activeTab === "retouch" && (
          <div
            role="tabpanel"
            id="retouch-panel"
            aria-labelledby="retouch-tab"
          >
            <RetouchTab
              retouchBrushSize={retouchBrushSize}
              onRetouchBrushSizeChange={onRetouchBrushSizeChange}
              onRetouchDone={onRetouchDone}
              isProcessing={isRetouchingProcessing}
            />
          </div>
        )}
        {activeTab === "ai" && (
          <div
            role="tabpanel"
            id="ai-panel"
            aria-labelledby="ai-tab"
          >
            <AITab
              onAutoEnhance={onAutoEnhance}
              isEnhancing={isEnhancing}
              onAnalyzeAlbum={onAnalyzeAlbum}
              isAnalyzing={isAnalyzing}
              onApplyCulling={onApplyCulling}
              isApplyingCulling={isApplyingCulling}
              cullingStats={cullingStats}
              albumId={albumId}
              photos={photos}
              onBatchAutoEditsComplete={onBatchAutoEditsComplete}
              activePhoto={activePhoto}
              onReviewAutoEdits={onReviewAutoEdits}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const SidebarControls = memo(SidebarControlsComponent, (prev, next) => {
  return (
    prev.activeTab === next.activeTab &&
    prev.isCropping === next.isCropping &&
    prev.isEnhancing === next.isEnhancing &&
    prev.isAnalyzing === next.isAnalyzing &&
    prev.isApplyingCulling === next.isApplyingCulling &&
    prev.canUndo === next.canUndo &&
    prev.canRedo === next.canRedo &&
    prev.hasCopiedEdits === next.hasCopiedEdits &&
    prev.selectedCount === next.selectedCount &&
    prev.retouchBrushSize === next.retouchBrushSize &&
    JSON.stringify(prev.edits) === JSON.stringify(next.edits) &&
    JSON.stringify(prev.cullingStats) === JSON.stringify(next.cullingStats)
  );
});

SidebarControls.displayName = "SidebarControls";

export default SidebarControls;
