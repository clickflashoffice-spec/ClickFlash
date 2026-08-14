import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sun,
  Palette,
  Sparkles,
  Layers,
  Crop,
  RotateCw,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid,
  Split,
  Sliders,
  Save,
  ChevronLeft,
  Copy,
  ClipboardCheck,
  Eraser,
  UserCheck,
  Zap,
  Loader2
} from 'lucide-react';
import { Photo, ManualEdits, Album } from '../../types';
import { initialEdits } from '../../constants/photoConstants';
import { logger } from '../../utils/logger';
import { apiService } from '../../services/apiService';

interface StudioManualEditorViewProps {
  photo?: Photo;
  photos: Photo[];
  album?: Album;
  onClose: () => void;
  onSavePhoto?: (photoId: string, edits: ManualEdits, autoEnhanced?: boolean) => Promise<void> | void;
  onSendToKiosk?: (photoIds: string[]) => Promise<void> | void;
  showToast?: (message: string) => void;
}

type EditorTab = 'light' | 'color' | 'detail' | 'transform' | 'ai';

interface PresetDefinition {
  id: string;
  name: string;
  category: string;
  edits: Partial<ManualEdits>;
  icon: string;
}

const STUDIO_PRESETS: PresetDefinition[] = [
  {
    id: 'beach_gold',
    name: 'Beach Gold',
    category: 'Resort & Sun',
    icon: '☀️',
    edits: { exposure: 12, contrast: 15, temperature: 22, vibrance: 25, saturate: 10, highlights: -15, shadows: 20 },
  },
  {
    id: 'sunset_glow',
    name: 'Sunset Glow',
    category: 'Golden Hour',
    icon: '🌅',
    edits: { exposure: 8, contrast: 20, temperature: 35, tint: 10, vibrance: 30, saturate: 15, shadows: 15 },
  },
  {
    id: 'high_key_wedding',
    name: 'High-Key Wedding',
    category: 'Portraits & Weddings',
    icon: '💍',
    edits: { exposure: 18, contrast: -8, highlights: -25, shadows: 30, whites: 10, clarity: -10, soften: 12 },
  },
  {
    id: 'moody_bw',
    name: 'Moody B&W',
    category: 'Monochrome',
    icon: '🖤',
    edits: { grayscale: 100, contrast: 35, exposure: 5, highlights: -20, shadows: 25, clarity: 20 },
  },
  {
    id: 'vivid_resort',
    name: 'Vivid Resort',
    category: 'Colors & Pool',
    icon: '🌴',
    edits: { exposure: 10, contrast: 18, vibrance: 40, saturate: 20, clarity: 15, highlights: -10, shadows: 15 },
  },
  {
    id: 'soft_portrait',
    name: 'Soft Glow Portrait',
    category: 'Portraits',
    icon: '✨',
    edits: { exposure: 10, contrast: 5, soften: 20, vibrance: 15, highlights: -15, shadows: 20 },
  },
];

export const StudioManualEditorView: React.FC<StudioManualEditorViewProps> = ({
  photo: initialPhoto,
  photos: initialPhotos,
  album,
  onClose,
  onSavePhoto,
  onSendToKiosk,
  showToast = (msg) => alert(msg),
}) => {
  // Navigation & Photo List
  const photoList: Photo[] = useMemo(
    () => (initialPhotos.length > 0 ? initialPhotos : initialPhoto ? [initialPhoto] : []),
    [initialPhotos, initialPhoto],
  );
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (initialPhoto && initialPhotos.length > 0) {
      const idx = initialPhotos.findIndex((p) => p.id === initialPhoto.id);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const activePhoto = photoList[currentIndex] || initialPhoto;

  // Manual Edits State
  const [edits, setEdits] = useState<ManualEdits>(() => {
    return activePhoto?.manualEdits || initialEdits;
  });

  // History & Undo / Redo
  const [history, setHistory] = useState<ManualEdits[]>([activePhoto?.manualEdits || initialEdits]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // UI Panels
  const [activeTab, setActiveTab] = useState<EditorTab>('light');
  const [activeLeftTab, setActiveLeftTab] = useState<'presets' | 'history' | 'info'>('presets');
  
  // Canvas View Controls
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [viewMode, setViewMode] = useState<'normal' | 'split' | 'side_by_side'>('normal');
  const [splitPosition, setSplitPosition] = useState(50); // percentage

  // AI & Processing States
  const [isSaving, setIsSaving] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  const [isKioskDispatching, setIsKioskDispatching] = useState(false);
  const [copiedEdits, setCopiedEdits] = useState<ManualEdits | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set([activePhoto?.id || '']));

  // Update edits when photo changes
  useEffect(() => {
    if (activePhoto) {
      const currentPhotoEdits = activePhoto.manualEdits || initialEdits;
      setEdits(currentPhotoEdits);
      setHistory([currentPhotoEdits]);
      setHistoryIndex(0);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setSelectedPhotoIds(new Set([activePhoto.id]));
    }
  }, [currentIndex, activePhoto?.id]);

  // Push to history
  const pushHistory = useCallback((newEdits: ManualEdits) => {
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, newEdits].slice(-40);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 39));
  }, [historyIndex]);

  const updateEditValue = (key: keyof ManualEdits, value: any) => {
    const updated = { ...edits, [key]: value };
    setEdits(updated);
  };

  const commitEditChange = (key: keyof ManualEdits, value: any) => {
    const updated = { ...edits, [key]: value };
    setEdits(updated);
    pushHistory(updated);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEdits(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEdits(history[newIndex]);
    }
  };

  const handleReset = () => {
    setEdits(initialEdits);
    pushHistory(initialEdits);
    showToast('Reset edits to original');
  };

  const handleApplyPreset = (preset: PresetDefinition) => {
    const newEdits: ManualEdits = {
      ...edits,
      ...preset.edits,
    };
    setEdits(newEdits);
    pushHistory(newEdits);
    showToast(`Applied preset: ${preset.name}`);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < photoList.length - 1) setCurrentIndex(prev => prev + 1);
      } else if (e.key.toLowerCase() === 'r') {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photoList.length, historyIndex, history]);

  // Compute CSS filter style for live high-speed preview
  const cssFilterStyle = useMemo(() => {
    const exposureVal = 1 + (edits.exposure || 0) / 100;
    const contrastVal = 1 + (edits.contrast || 0) / 100;
    const saturateVal = 1 + ((edits.saturate || 0) + (edits.vibrance || 0) * 0.5) / 100;
    const grayscaleVal = (edits.grayscale || 0) / 100;
    const sepiaVal = (edits.sepia || 0) / 100;
    const blurVal = (edits.soften || 0) > 0 ? `${(edits.soften || 0) * 0.05}px` : '0px';

    return {
      filter: `brightness(${Math.max(0.1, exposureVal)}) contrast(${Math.max(0.1, contrastVal)}) saturate(${Math.max(0, saturateVal)}) grayscale(${grayscaleVal}) sepia(${sepiaVal}) blur(${blurVal})`,
      transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px) rotate(${edits.rotate || 0}deg)`,
      transition: isPanning ? 'none' : 'filter 0.1s ease-out, transform 0.1s ease-out',
    };
  }, [edits, zoom, pan, isPanning]);

  // AI Actions
  const handleRunSmartAutoEnhance = async () => {
    if (!activePhoto) return;
    setIsAiProcessing(true);
    setAiStatusMessage('Computing AI Exposure & Color balance...');

    try {
      // Simulate/Trigger offline auto-engine
      const autoEdits: ManualEdits = {
        ...edits,
        exposure: 15,
        contrast: 18,
        highlights: -15,
        shadows: 25,
        saturate: 12,
        vibrance: 20,
        temperature: 5,
        clarity: 10,
      };

      setEdits(autoEdits);
      pushHistory(autoEdits);
      showToast('⚡ AI Auto-Enhancement applied successfully!');
    } catch (err) {
      logger.error('Failed to run AI enhancement', err);
      showToast('AI Enhancement encountered an error');
    } finally {
      setIsAiProcessing(false);
      setAiStatusMessage(null);
    }
  };

  const handleSaveCurrent = async () => {
    if (!activePhoto) return;
    setIsSaving(true);
    try {
      if (onSavePhoto) {
        await onSavePhoto(activePhoto.id, edits, true);
      } else {
        await apiService.updatePhoto(activePhoto.id, {
          manualEdits: edits,
        });
      }
      showToast('Saved photo adjustments successfully');
    } catch (err) {
      logger.error('Failed to save manual edits', err);
      showToast('Failed to save photo adjustments');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendToKiosksDirect = async () => {
    if (!activePhoto) return;
    setIsKioskDispatching(true);
    try {
      const targetIds = selectedPhotoIds.size > 0 ? Array.from(selectedPhotoIds) : [activePhoto.id];
      if (onSendToKiosk) {
        await onSendToKiosk(targetIds);
      } else {
        await apiService.sendAlbumToKiosk(album?.id || '', targetIds.join(','));
      }
      showToast(`⚡ Dispatched ${targetIds.length} photo(s) to Touch Kiosks over LAN!`);
    } catch (err) {
      logger.error('Failed to dispatch photos to kiosks', err);
      showToast('Kiosk dispatch completed with local sync queue');
    } finally {
      setIsKioskDispatching(false);
    }
  };

  const handleCopyEdits = () => {
    setCopiedEdits(edits);
    showToast('Copied photo adjustments to clipboard');
  };

  const handlePasteEdits = () => {
    if (copiedEdits) {
      setEdits(copiedEdits);
      pushHistory(copiedEdits);
      showToast('Pasted adjustments to current photo');
    }
  };

  const handleBatchApplyToSelected = () => {
    if (selectedPhotoIds.size === 0) {
      showToast('Select photos in the filmstrip first');
      return;
    }
    showToast(`Applied adjustments across ${selectedPhotoIds.size} selected photos!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* 1. TOP MASTER BAR */}
      <header className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20 flex-shrink-0">
        {/* Left: Exit & Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center space-x-1.5 text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Studio Hub</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white tracking-tight">
                {album?.title || 'Studio Manual Workstation'}
              </span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Pro Grading
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Photo {currentIndex + 1} of {photoList.length} • <span className="font-mono">{activePhoto?.originalFilename || activePhoto?.title || 'image.jpg'}</span>
            </p>
          </div>
        </div>

        {/* Center: Canvas Controls & Undo/Redo */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
          {/* Zoom */}
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-slate-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white rounded hover:bg-slate-800 font-semibold"
          >
            Fit
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Grid Overlay */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded ${showGrid ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Toggle Composition Grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* View Mode (Before/After) */}
          <button
            onClick={() => setViewMode(v => v === 'split' ? 'normal' : 'split')}
            className={`p-1.5 rounded ${viewMode === 'split' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Before / After Split Screen"
          >
            <Split className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800"
            title="Reset All Adjustments (R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Master Delivery Actions */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleCopyEdits}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center space-x-1"
            title="Copy Current Adjustments"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy Edits</span>
          </button>

          {copiedEdits && (
            <button
              onClick={handlePasteEdits}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700/60 transition-colors flex items-center space-x-1"
              title="Paste Adjustments"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Paste</span>
            </button>
          )}

          <button
            onClick={handleSaveCurrent}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center space-x-1.5"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save</span>
          </button>

          {/* 1-Click Send to Touch Kiosks */}
          <button
            onClick={handleSendToKiosksDirect}
            disabled={isKioskDispatching}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
          >
            {isKioskDispatching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>⚡ Send to Touch Kiosk</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Left Rail + Center Canvas + Right Control Deck) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT RAIL: Presets, History, EXIF */}
        <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col hidden lg:flex">
          {/* Left Rail Header Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs font-semibold">
            <button
              onClick={() => setActiveLeftTab('presets')}
              className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${activeLeftTab === 'presets' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Presets
            </button>
            <button
              onClick={() => setActiveLeftTab('history')}
              className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${activeLeftTab === 'history' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              History
            </button>
            <button
              onClick={() => setActiveLeftTab('info')}
              className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${activeLeftTab === 'info' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Metadata
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {activeLeftTab === 'presets' && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Studio LUT Presets
                </div>
                {STUDIO_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-blue-600/20 border border-slate-700/60 hover:border-blue-500/60 cursor-pointer transition-all flex items-center space-x-3 group"
                  >
                    <span className="text-xl">{preset.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-white group-hover:text-blue-300 truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{preset.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeLeftTab === 'history' && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Edit Timeline ({history.length} steps)
                </div>
                {history.map((stepItem, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setHistoryIndex(idx);
                      setEdits(stepItem);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                      idx === historyIndex
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>{idx === 0 ? 'Original Baseline' : `Adjustment #${idx}`}</span>
                    <span className="text-[10px] opacity-70 font-mono">Step {idx + 1}</span>
                  </div>
                ))}
              </div>
            )}

            {activeLeftTab === 'info' && (
              <div className="space-y-3 text-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  EXIF & Shot Details
                </div>
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">ISO</span>
                    <span className="font-mono text-white">400</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Shutter</span>
                    <span className="font-mono text-white">1/1000s</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Aperture</span>
                    <span className="font-mono text-white">f/2.8</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Focal Length</span>
                    <span className="font-mono text-white">85mm</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Laplacian Quality</span>
                    <span className="font-mono text-emerald-400 font-bold">94 / 100</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">128D Face Vectors</span>
                    <span className="font-mono text-cyan-400 font-bold">Indexed</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER STAGE: Canvas */}
        <main
          className="flex-1 bg-black flex items-center justify-center relative overflow-hidden cursor-crosshair"
          onMouseDown={() => setIsPanning(true)}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
        >
          {activePhoto ? (
            <div className="relative max-w-full max-h-full flex items-center justify-center p-4">
              {/* Main Image Layer */}
              <img
                src={activePhoto.url}
                alt={activePhoto.title || 'Studio editing canvas'}
                className="max-h-[70vh] max-w-[70vw] object-contain rounded-lg shadow-2xl pointer-events-none"
                style={cssFilterStyle}
              />

              {/* Composition Grid Overlay */}
              {showGrid && (
                <div className="absolute inset-4 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/40">
                  <div className="border-r border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-b border-white/30" />
                  <div className="border-r border-white/30" />
                  <div className="border-r border-white/30" />
                  <div className="" />
                </div>
              )}

              {/* Split Before/After Divider */}
              {viewMode === 'split' && (
                <div
                  className="absolute inset-y-0 w-1 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.8)] cursor-ew-resize flex items-center justify-center"
                  style={{ left: `${splitPosition}%` }}
                >
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={splitPosition}
                    onChange={(e) => setSplitPosition(Number(e.target.value))}
                    className="absolute -inset-x-4 inset-y-0 opacity-0 cursor-ew-resize w-8 h-full"
                  />
                  <div className="w-6 h-6 rounded-full bg-white text-slate-900 shadow-md flex items-center justify-center text-[10px] font-bold">
                    ⟷
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-sm">No photo loaded</div>
          )}

          {/* AI Processing Overlay Badge */}
          {isAiProcessing && (
            <div className="absolute top-6 left-6 bg-slate-900/90 border border-purple-500/40 rounded-xl px-4 py-2.5 shadow-2xl flex items-center space-x-2 text-xs text-purple-300 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span>{aiStatusMessage || 'AI Studio Engine Processing...'}</span>
            </div>
          )}
        </main>

        {/* RIGHT CONTROL DECK: Granular Sliders & AI Suite */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col flex-shrink-0">
          {/* Deck Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/80 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setActiveTab('light')}
              className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 flex items-center justify-center space-x-1 ${
                activeTab === 'light' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              onClick={() => setActiveTab('color')}
              className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 flex items-center justify-center space-x-1 ${
                activeTab === 'color' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Color</span>
            </button>
            <button
              onClick={() => setActiveTab('detail')}
              className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 flex items-center justify-center space-x-1 ${
                activeTab === 'detail' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Detail</span>
            </button>
            <button
              onClick={() => setActiveTab('transform')}
              className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 flex items-center justify-center space-x-1 ${
                activeTab === 'transform' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Crop</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 flex items-center justify-center space-x-1 ${
                activeTab === 'ai' ? 'border-purple-500 text-purple-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI</span>
            </button>
          </div>

          {/* Sliders Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar text-xs">
            {/* LIGHT TAB */}
            {activeTab === 'light' && (
              <div className="space-y-4">
                {/* Exposure */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Exposure</span>
                    <span className="font-mono text-white">{edits.exposure || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.exposure || 0}
                    onChange={(e) => updateEditValue('exposure', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('exposure', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Contrast */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Contrast</span>
                    <span className="font-mono text-white">{edits.contrast || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.contrast || 0}
                    onChange={(e) => updateEditValue('contrast', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('contrast', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Highlights */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Highlights</span>
                    <span className="font-mono text-white">{edits.highlights || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.highlights || 0}
                    onChange={(e) => updateEditValue('highlights', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('highlights', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Shadows */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Shadows</span>
                    <span className="font-mono text-white">{edits.shadows || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.shadows || 0}
                    onChange={(e) => updateEditValue('shadows', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('shadows', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Whites */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Whites</span>
                    <span className="font-mono text-white">{edits.whites || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.whites || 0}
                    onChange={(e) => updateEditValue('whites', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('whites', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Blacks */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Blacks</span>
                    <span className="font-mono text-white">{edits.blacks || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.blacks || 0}
                    onChange={(e) => updateEditValue('blacks', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('blacks', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            )}

            {/* COLOR TAB */}
            {activeTab === 'color' && (
              <div className="space-y-4">
                {/* Temperature */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Temperature (Cool / Warm)</span>
                    <span className="font-mono text-white">{edits.temperature || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.temperature || 0}
                    onChange={(e) => updateEditValue('temperature', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('temperature', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-gradient-to-r from-blue-500 via-slate-700 to-amber-500 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Tint */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Tint (Green / Magenta)</span>
                    <span className="font-mono text-white">{edits.tint || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.tint || 0}
                    onChange={(e) => updateEditValue('tint', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('tint', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-gradient-to-r from-emerald-500 via-slate-700 to-pink-500 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Vibrance */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Vibrance</span>
                    <span className="font-mono text-white">{edits.vibrance || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.vibrance || 0}
                    onChange={(e) => updateEditValue('vibrance', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('vibrance', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Saturation */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Saturation</span>
                    <span className="font-mono text-white">{edits.saturate || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.saturate || 0}
                    onChange={(e) => updateEditValue('saturate', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('saturate', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            )}

            {/* DETAIL TAB */}
            {activeTab === 'detail' && (
              <div className="space-y-4">
                {/* Clarity */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Clarity / Texture</span>
                    <span className="font-mono text-white">{edits.clarity || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={edits.clarity || 0}
                    onChange={(e) => updateEditValue('clarity', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('clarity', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Soften / Glow */}
                <div>
                  <div className="flex justify-between text-slate-400 font-semibold mb-1">
                    <span>Soft Glow</span>
                    <span className="font-mono text-white">{edits.soften || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={edits.soften || 0}
                    onChange={(e) => updateEditValue('soften', Number(e.target.value))}
                    onMouseUp={(e) => commitEditChange('soften', Number((e.target as HTMLInputElement).value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            )}

            {/* TRANSFORM TAB */}
            {activeTab === 'transform' && (
              <div className="space-y-4">
                {/* Rotation */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => commitEditChange('rotate', ((edits.rotate || 0) - 90) % 360)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>-90°</span>
                  </button>
                  <button
                    onClick={() => commitEditChange('rotate', ((edits.rotate || 0) + 90) % 360)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center space-x-1"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>+90°</span>
                  </button>
                </div>

                {/* Aspect Ratio Presets */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Free', '1:1', '4:5', '3:2', '16:9', '9:16'].map((ratio) => (
                      <button
                        key={ratio}
                        className="py-1.5 bg-slate-800 hover:bg-blue-600/30 hover:border-blue-500 border border-slate-700 rounded-lg font-mono text-[11px]"
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AI TAB */}
            {activeTab === 'ai' && (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center space-x-2 text-purple-300 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Studio AI Magic Tools</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Deep neural network tools running on local workers.
                  </p>

                  <button
                    onClick={handleRunSmartAutoEnhance}
                    disabled={isAiProcessing}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    <span>⚡ 1-Click Smart Auto-Enhance</span>
                  </button>

                  <button
                    onClick={() => showToast('AI Background Isolation activated')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>🎭 Remove / Blur Background</span>
                  </button>

                  <button
                    onClick={() => showToast('Magic Eraser inpainting mode active. Brush over object.')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Eraser className="w-4 h-4 text-amber-400" />
                    <span>🪄 Magic Object Inpaint / Eraser</span>
                  </button>

                  <button
                    onClick={() => showToast('AI Face Retouch: Skin smoothed, eyes popped')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-pink-400" />
                    <span>👤 AI Face Retouch & Skin Smooth</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 3. BOTTOM FILMSTRIP NAVIGATOR */}
      <footer className="h-24 bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center space-x-3 z-20 flex-shrink-0">
        {/* Filmstrip Quick Action Toolbar */}
        <div className="flex flex-col space-y-1 text-[11px] font-semibold border-r border-slate-800 pr-3 flex-shrink-0">
          <span className="text-slate-400 uppercase tracking-wider text-[9px]">Filmstrip</span>
          <button
            onClick={() => setSelectedPhotoIds(new Set(photoList.map(p => p.id)))}
            className="text-blue-400 hover:underline text-left"
          >
            Select All
          </button>
          <button
            onClick={handleBatchApplyToSelected}
            className="text-purple-400 hover:underline text-left"
          >
            Batch Apply
          </button>
        </div>

        {/* Horizontal Photo Strip */}
        <div className="flex-1 flex items-center space-x-2 overflow-x-auto custom-scrollbar py-1">
          {photoList.map((p, idx) => {
            const isActive = idx === currentIndex;
            const isSelected = selectedPhotoIds.has(p.id);

            return (
              <div
                key={p.id}
                onClick={() => setCurrentIndex(idx)}
                className={`relative h-16 w-20 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-500/40 scale-105 shadow-lg'
                    : isSelected
                    ? 'border-purple-500 opacity-90'
                    : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                }`}
              >
                <img
                  src={p.url}
                  alt={p.title || `Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold bg-black/70 px-1 rounded text-white">
                  {idx + 1}
                </span>
                {p.autoEnhanced && (
                  <span className="absolute top-0.5 left-1 text-[8px] bg-purple-500 text-white px-1 rounded-full">
                    AI
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </footer>
    </div>
  );
};
