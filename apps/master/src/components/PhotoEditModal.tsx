import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Photo, ManualEdits } from "../types";
import { logger } from "../utils/logger";
import styles from "./PhotoEditModal.module.css";
import { initialEdits } from "../constants/photoConstants";
import Filmstrip from "./albums/components/Filmstrip";
import { SliderControl as SharedSlider } from "./albums/editor2/controls/SliderControl";
import { GridOverlay as EditorGrid } from "./albums/editor2/canvas/GridOverlay";
import { useImageSpace } from "../hooks/useImageSpace";
import { Photo as SharedPhoto } from "@clickflash/ui";
import {
  Layers,
  Sun,
  Palette,
  Sparkles,
  Undo2,
  Redo2,
  RotateCcw,
  X,
  Maximize,
} from "lucide-react";

interface PhotoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: Photo;
  photos: Photo[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onSave: (photoId: string, edits: ManualEdits) => Promise<void> | void;
  albumId?: string;
}

type TabType = "transform" | "light" | "color" | "effects";

const PhotoEditModal: React.FC<PhotoEditModalProps> = ({
  isOpen,
  onClose,
  photo,
  photos,
  currentIndex,
  onNavigate,
  onSave,
}) => {
  // --- State Management ---
  const [edits, setEdits] = useState<ManualEdits>(initialEdits);
  const [originalEdits, setOriginalEdits] = useState<ManualEdits>(initialEdits);
  const [_previewUrl, setPreviewUrl] = useState<string>("");
  const [history, setHistory] = useState<ManualEdits[]>([initialEdits]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("light");
  const [showGrid, setShowGrid] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Refs
  const historyTimeoutRef = useRef<number | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const MAX_HISTORY = 50;

  // --- Hooks & Logic ---

  useImageSpace({
    containerRef: viewerRef,
    imageRef,
    edits,
    zoom,
  });

  // Initialize
  useEffect(() => {
    if (photo && isOpen) {
      const photoEdits = photo.manualEdits
        ? { ...initialEdits, ...photo.manualEdits }
        : initialEdits;
      setEdits(photoEdits);
      setOriginalEdits(photoEdits);
      setPreviewUrl(photo.previewUrl || photo.url || "");
      setHistory([photoEdits]);
      setHistoryIndex(0);
      setShowGrid(photoEdits.straighten !== 0);
      setShowBeforeAfter(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });

      // Lock body scroll
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [photo, isOpen]);

  // Grid Auto-toggle
  useEffect(() => {
    if (edits.straighten !== 0 && !showGrid) {
      setShowGrid(true);
    }
  }, [edits.straighten, showGrid]);

  // History Management
  const saveToHistory = useCallback(
    (newEdits: ManualEdits) => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }

      historyTimeoutRef.current = window.setTimeout(() => {
        setHistory((prevHistory: ManualEdits[]) => {
          const newHistory = prevHistory.slice(0, historyIndex + 1);
          newHistory.push(newEdits);
          if (newHistory.length > MAX_HISTORY) {
            newHistory.shift();
          } else {
            setHistoryIndex(newHistory.length - 1);
          }
          return newHistory;
        });
      }, 300);
    },
    [historyIndex],
  );

  const handleEditChange = useCallback((updates: Partial<ManualEdits>) => {
    setEdits((prev: ManualEdits) => {
      const newEdits = { ...prev, ...updates };
      saveToHistory(newEdits);
      return newEdits;
    });
  }, [saveToHistory]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEdits(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEdits(history[newIndex]);
    }
  }, [history, historyIndex]);

  // Zoom Logic
  const handleZoom = useCallback((direction: "in" | "out" | "reset") => {
    if (direction === "reset") {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const delta = direction === "in" ? 0.2 : -0.2;
    setZoom((prev: number) => {
      const next = Math.max(1, Math.min(4, prev + delta));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Always intercept wheel events in the viewer to prevent scrolling controls
    if (e.ctrlKey || zoom > 1) {
      e.preventDefault();
      e.stopPropagation();
      const direction = e.deltaY < 0 ? "in" : "out";
      handleZoom(direction);
    }
  }, [zoom, handleZoom]);

  // Panning Logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const newX = e.clientX - panStartRef.current.x;
    const newY = e.clientY - panStartRef.current.y;
    setPan({ x: newX, y: newY });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      // Ignore if in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          e.shiftKey ? handleRedo() : handleUndo();
        } else if (e.key === "y") {
          e.preventDefault();
          handleRedo();
        }
      } else {
        if (e.key === "1") setActiveTab("transform");
        if (e.key === "2") setActiveTab("light");
        if (e.key === "3") setActiveTab("color");
        if (e.key === "4") setActiveTab("effects");
        if (e.key === "b" || e.key === "B")
          setShowBeforeAfter((prev: boolean) => !prev);
        if (e.key === "g" || e.key === "G")
          setShowGrid((prev: boolean) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOpen, handleUndo, handleRedo, onClose]);

  // Save & Reset
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(photo.id, edits);
      onClose();
    } catch (error) {
      logger.error("PhotoEditModal: Failed to save", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEdits(initialEdits);
    saveToHistory(initialEdits);
  };

  // Helpers
  const isControlModified = (key: keyof ManualEdits) =>
    edits[key] !== originalEdits[key];
  const getModifiedCount = (keys: (keyof ManualEdits)[]) =>
    keys.filter((key) => isControlModified(key)).length;


  if (!isOpen || !photo) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Top Bar - Professional Toolbar */}
      <div className="flex items-center justify-between px-6 h-16 bg-slate-900 border-b border-white/5 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-blue-500">
              <Layers className="h-5 w-5" />
            </span>
            <h2 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
              <span className="text-slate-500">Orders</span>
              <span className="text-slate-700">/</span>
              <span>Photo Editor</span>
            </h2>
          </div>

          <div className="h-6 w-px bg-white/10"></div>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-300 truncate max-w-[200px]">
              {photo.title || "Untitled Image"}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {zoom > 1 ? `${Math.round(zoom * 100)}%` : "FIT TO SCREEN"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setShowBeforeAfter(false)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!showBeforeAfter ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
            >
              Edit
            </button>
            <button
              onClick={() => setShowBeforeAfter(true)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${showBeforeAfter ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
            >
              Compare
            </button>
          </div>

          <div className="h-6 w-px bg-white/10 mx-2"></div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all border border-white/5 hover:border-red-500/30"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Application Content Area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Workspace (Canvas) */}
        <div
          ref={viewerRef}
          className={`flex-1 flex flex-col min-w-0 bg-black relative overflow-hidden ${zoom > 1 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>

          {/* Main Stage */}
          {showBeforeAfter ? (
            <div className="flex w-full h-full gap-2 p-6 pointer-events-none">
              {/* Before Panel */}
              <div className="flex-1 relative bg-slate-900/40 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden">
                <div className="absolute top-6 left-6 z-10 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border border-white/5">
                  Original
                </div>
                <div className="w-full h-full p-4 pointer-events-none opacity-80">
                  <SharedPhoto
                    photo={{ ...photo, photographerId: photo.photographerId || 0 } as any}
                    manualEdits={originalEdits}
                    showWatermark={false}
                    extraTransform={`translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`}
                    imageClassName={`${styles.photoPreview} ${styles.beforeAfterPanel}`}
                  />
                </div>
              </div>
              {/* After Panel */}
              <div className="flex-1 relative bg-slate-900/20 rounded-3xl border border-blue-500/20 flex items-center justify-center overflow-hidden">
                <div className="absolute top-6 left-6 z-10 bg-blue-600/80 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  Edited
                </div>
                <div className="w-full h-full p-4 pointer-events-none">
                  <SharedPhoto
                    photo={{ ...photo, photographerId: photo.photographerId || 0 } as any}
                    manualEdits={edits}
                    showWatermark={false}
                    extraTransform={`translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`}
                    imageClassName={`${styles.photoPreview} ${styles.beforeAfterPanel}`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8">
              <div className="w-full h-full relative" ref={imageRef}>
                <SharedPhoto
                  photo={{ ...photo, photographerId: photo.photographerId || 0 } as any}
                  manualEdits={edits}
                  showWatermark={false}
                  extraTransform={`translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`}
                  imageClassName={`${styles.photoPreview} ${styles.mainPreviewShadow}`}
                />
              </div>
              <EditorGrid visible={showGrid} />
            </div>
          )}

          {/* Floating Zoom Controls (Bottom Right of Canvas Area) */}
          {!showBeforeAfter && (
            <div className="absolute bottom-10 right-10 pointer-events-auto flex items-center gap-1 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 z-30 shadow-2xl">
              <button
                onClick={() => handleZoom("out")}
                className="p-2.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                title="Zoom Out"
              >
                <Maximize className="w-4 h-4 rotate-180" />
              </button>
              <div className="px-3 min-w-[60px] text-center">
                <span
                  className="text-[10px] font-black text-slate-300 font-mono tracking-tighter cursor-pointer hover:text-white"
                  onClick={() => handleZoom("reset")}
                >
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <button
                onClick={() => handleZoom("in")}
                className="p-2.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                title="Zoom In"
              >
                <Maximize className="w-4 h-4 font-black" />
              </button>
            </div>
          )}
        </div>

        {/* Docked Sidebar - Professional Toolset */}
        <div className="w-80 flex-shrink-0 bg-slate-900 border-l border-white/5 flex flex-col overflow-hidden z-20">
          {/* Tabs / Controls Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex p-1 bg-black/40 m-3 rounded-2xl border border-white/5">
              {(["transform", "light", "color", "effects"] as const).map(
                (tab) => {
                  const isActive = activeTab === tab;
                  const modifiedCount =
                    tab === "transform"
                      ? getModifiedCount([
                          "rotate",
                          "straighten",
                          "perspectiveX",
                          "perspectiveY",
                        ])
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
                      : tab === "light"
                        ? Sun
                        : tab === "color"
                          ? Palette
                          : Sparkles;

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl transition-all relative group/tab ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <Icon
                          className={`h-4 w-4 transition-transform ${isActive ? "scale-110" : "group-hover/tab:scale-110"}`}
                        />
                        <span className="hidden md:block">{tab}</span>
                      </div>
                      {modifiedCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] border border-blue-500" />
                      )}
                    </button>
                  );
                },
              )}
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
                    disabled={historyIndex >= history.length - 1}
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
      </div>

      {/* Bottom Filmstrip */}
      <div
        className={`transition-all duration-500 origin-bottom ${showBeforeAfter ? "h-0 opacity-0" : "h-28 opacity-100"}`}
      >
        <div className="h-full bg-slate-900 border-t border-white/5 relative z-20 px-4">
          <Filmstrip
            photos={photos}
            activeIndex={currentIndex}
            onPhotoClick={onNavigate}
            selectedIds={new Set()}
            onSelectToggle={() => {}}
            onMultiSelect={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

export default PhotoEditModal;
