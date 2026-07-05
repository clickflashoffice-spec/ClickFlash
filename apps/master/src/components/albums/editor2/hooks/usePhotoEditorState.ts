import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Photo, ManualEdits } from "../../../../types";
import { initialEdits } from "../../../../constants/photoConstants";
import { logger } from "../../../../utils/logger";
import { exportManager } from "../utils/ExportManager";

export type TabType = "transform" | "crop" | "retouch" | "light" | "color" | "effects";

interface UsePhotoEditorStateProps {
  photo: Photo;
  isOpen: boolean;
  onClose: () => void;
  onSave: (photoId: string, edits: ManualEdits) => Promise<void> | void;
}

export const usePhotoEditorState = ({
  photo,
  isOpen,
  onClose,
  onSave,
}: UsePhotoEditorStateProps) => {
  // --- State Management ---
  const [edits, setEdits] = useState<ManualEdits>(initialEdits);
  const [originalEdits, setOriginalEdits] = useState<ManualEdits>(initialEdits);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [history, setHistory] = useState<ManualEdits[]>([initialEdits]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>("light");
  const [showGrid, setShowGrid] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Crop Tool State
  const [isCropping, setIsCropping] = useState(false);
  const [cropAspectRatio, setCropAspectRatio] = useState<number | undefined>(undefined);
  const [customW, setCustomW] = useState<number | "">(4);
  const [customH, setCustomH] = useState<number | "">(3);

  // Retouch Tool State
  const [isRetouching, setIsRetouching] = useState(false);
  const [retouchBrushSize, setRetouchBrushSize] = useState(20);
  const [retouchStep, setRetouchStep] = useState<"target" | "source" | "idle">("idle");
  const [retouchTarget, setRetouchTarget] = useState<{ x: number; y: number } | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState(false);

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

      // Reset tools
      setIsCropping(false);
      setCropAspectRatio(undefined);
      setIsRetouching(false);
      setRetouchBrushSize(20);
      setRetouchStep("idle");
      setRetouchTarget(null);
      setActiveTab("light");

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
    [historyIndex]
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
    if (e.ctrlKey || zoom > 1) {
      e.preventDefault();
      e.stopPropagation();
      const direction = e.deltaY < 0 ? "in" : "out";
      handleZoom(direction);
    }
  }, [zoom, handleZoom]);

  // Crop Handlers
  const handleCropStart = useCallback(() => setIsCropping(true), []);

  const handleCropApply = useCallback((crop: ManualEdits["crop"]) => {
    setEdits((prev: ManualEdits) => {
      const newEdits = { ...prev, crop };
      saveToHistory(newEdits);
      return newEdits;
    });
    setIsCropping(false);
  }, [saveToHistory]);

  const handleCropCancel = useCallback(() => setIsCropping(false), []);

  const handleRetouchDone = useCallback(() => {
    setIsRetouching(false);
    setRetouchTarget(null);
    setRetouchStep("idle");
    setActiveTab("light");
  }, []);

  // Retouch Handlers
  const handleRetouchClick = useCallback((x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) return;

    if (retouchStep === "target") {
      setRetouchTarget({ x, y });
      setRetouchStep("source");
    } else if (retouchStep === "source" && retouchTarget) {
      const existing = edits.retouchActions || [];
      const capped = existing.length >= 200 ? existing.slice(-199) : existing;
      
      const newAction = {
        id: crypto.randomUUID(),
        type: "heal" as const,
        x: retouchTarget.x,
        y: retouchTarget.y,
        radius: retouchBrushSize,
        sourceX: x,
        sourceY: y,
        timestamp: Date.now(),
      };

      setEdits((prev: ManualEdits) => {
        const newEdits = {
          ...prev,
          retouchActions: [...capped, newAction],
        };
        saveToHistory(newEdits);
        return newEdits;
      });

      setRetouchTarget(null);
      setRetouchStep("target");
    }
  }, [edits.retouchActions, retouchBrushSize, retouchStep, retouchTarget, saveToHistory]);

  // Download Handler using exportManager
  const handleDownload = useCallback(async () => {
    if (!imageRef.current) return;
    setIsExporting(true);
    try {
      const result = await exportManager.export(imageRef.current, edits, {
        format: "image/jpeg",
        quality: 0.95,
      });
      exportManager.download(result);
    } catch (err) {
      logger.error("PhotoEditModal: Failed to download image", err);
    } finally {
      setIsExporting(false);
    }
  }, [edits]);

  // Panning Logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  }, [zoom, pan.x, pan.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const newX = e.clientX - panStartRef.current.x;
    const newY = e.clientY - panStartRef.current.y;
    setPan({ x: newX, y: newY });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Tab auto-coordination
  useEffect(() => {
    if (activeTab === "retouch") {
      setIsRetouching(true);
      setRetouchStep("target");
    } else {
      setIsRetouching(false);
      setRetouchStep("idle");
      setRetouchTarget(null);
    }

    if (activeTab === "crop") {
      setIsCropping(true);
    } else {
      setIsCropping(false);
    }
  }, [activeTab]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
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
        } else if (e.key === "0") {
          e.preventDefault();
          handleZoom("reset");
        } else if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleZoom("in");
        } else if (e.key === "-") {
          e.preventDefault();
          handleZoom("out");
        }
      } else {
        if (e.key === "1") setActiveTab("transform");
        if (e.key === "2") setActiveTab("light");
        if (e.key === "3") setActiveTab("color");
        if (e.key === "4") setActiveTab("effects");
        if (e.key === "5") setActiveTab("crop");
        if (e.key === "6") setActiveTab("retouch");
        if (e.key === "b" || e.key === "B")
          setShowBeforeAfter((prev: boolean) => !prev);
        if (e.key === "g" || e.key === "G")
          setShowGrid((prev: boolean) => !prev);

        if (activeTab === "retouch") {
          if (e.key === "[") {
            setRetouchBrushSize((prev) => Math.max(5, prev - 5));
          } else if (e.key === "]") {
            setRetouchBrushSize((prev) => Math.min(100, prev + 5));
          }
        }

        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          if (zoom > 1) {
            e.preventDefault();
            const step = 20;
            setPan((prev) => {
              let dx = 0;
              let dy = 0;
              if (e.key === "ArrowLeft") dx = step;
              if (e.key === "ArrowRight") dx = -step;
              if (e.key === "ArrowUp") dy = step;
              if (e.key === "ArrowDown") dy = -step;
              return { x: prev.x + dx, y: prev.y + dy };
            });
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOpen, handleUndo, handleRedo, onClose, zoom, activeTab, handleZoom]);

  // Save & Reset
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(photo.id, edits);
      onClose();
    } catch (error) {
      logger.error("PhotoEditModal: Failed to save", error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, photo, edits, onClose]);

  const handleReset = useCallback(() => {
    setEdits(initialEdits);
    saveToHistory(initialEdits);
  }, [saveToHistory]);

  // Style Generation
  const photoStyle = useMemo(() => {
    const {
      exposure = 0,
      contrast = 0,
      highlights = 0,
      shadows = 0,
      saturate = 0,
      vibrance = 0,
      grayscale = 0,
      sepia = 0,
      invert = 0,
      hueRotate = 0,
      temperature = 0,
      whites = 0,
      blacks = 0,
      soften = 0,
      rotate = 0,
      straighten = 0,
      perspectiveX = 0,
      perspectiveY = 0,
      clarity = 0,
      dropShadow = 0,
    } = edits;

    const whitesAdjust = whites / 200;
    const blacksAdjust = blacks / 200;
    const brightness =
      1 +
      exposure / 100 +
      highlights / 200 +
      shadows / 400 +
      whitesAdjust -
      blacksAdjust;
    const contrastVal =
      1 + contrast / 100 + highlights / 500 - shadows / 500 + clarity / 200;

    const vibranceAmount = vibrance / 100;
    const saturateAmount = 1 + saturate / 100;
    const combinedSaturate =
      vibranceAmount !== 0
        ? saturateAmount +
          (vibranceAmount > 0 ? vibranceAmount * 0.5 : vibranceAmount * 0.25)
        : saturateAmount;

    const filters = [
      `brightness(${brightness})`,
      `contrast(${contrastVal})`,
      `saturate(${combinedSaturate})`,
    ];

    if (temperature !== 0)
      filters.push(`sepia(${Math.abs(temperature) * 0.5}%)`);

    filters.push(
      `grayscale(${grayscale}%)`,
      `sepia(${sepia}%)`,
      `invert(${invert}%)`,
      `hue-rotate(${hueRotate}deg)`,
      `blur(${soften}px)`
    );

    if (dropShadow > 0)
      filters.push(`drop-shadow(0 4px ${dropShadow}px rgba(0,0,0,0.5))`);

    const angle = rotate + straighten;
    let transformStr = "";

    if (straighten !== 0) {
      const rad = Math.abs((straighten * Math.PI) / 180);
      const scale = 1 / (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)));
      transformStr = `rotate(${angle}deg) scale(${scale})`;
    } else if (rotate !== 0) {
      transformStr = `rotate(${angle}deg)`;
    }

    if (perspectiveX !== 0 || perspectiveY !== 0) {
      const pVal = 1000 + Math.abs(perspectiveX) * 10;
      const tStr = `perspective(${pVal}px) rotateX(${perspectiveY * 0.1}deg) rotateY(${perspectiveX * 0.1}deg)`;
      transformStr = tStr + (transformStr ? " " + transformStr : "");
    }

    const finalTransform =
      `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) ${transformStr || ""}`.trim();

    return {
      filter: filters.join(" "),
      transform: finalTransform,
      transition: isPanning
        ? "none"
        : "filter 0.2s ease-out, transform 0.2s ease-out",
      willChange: "transform",
    };
  }, [edits, zoom, pan, isPanning]);

  // Original Photo Logic for Before/After
  const originalPhotoStyle = useMemo(() => {
    const {
      exposure = 0,
      contrast = 0,
      highlights = 0,
      shadows = 0,
      whites = 0,
      blacks = 0,
      rotate = 0,
      straighten = 0,
      perspectiveX = 0,
      perspectiveY = 0,
      clarity = 0,
    } = originalEdits;

    const whitesAdjust = whites / 200;
    const blacksAdjust = blacks / 200;
    const brightness =
      1 +
      exposure / 100 +
      highlights / 200 +
      shadows / 400 +
      whitesAdjust -
      blacksAdjust;
    const contrastVal =
      1 + contrast / 100 + highlights / 500 - shadows / 500 + clarity / 200;

    const filters = [
      `brightness(${brightness})`,
      `contrast(${contrastVal})`,
      "saturate(1)",
    ];

    const angle = rotate + straighten;
    let transformStr = "";
    if (straighten !== 0) {
      const rad = Math.abs((straighten * Math.PI) / 180);
      const scale = 1 / (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)));
      transformStr = `rotate(${angle}deg) scale(${scale})`;
    } else if (rotate !== 0) {
      transformStr = `rotate(${angle}deg)`;
    }

    if (perspectiveX !== 0 || perspectiveY !== 0) {
      const pVal = 1000 + Math.abs(perspectiveX) * 10;
      const tStr = `perspective(${pVal}px) rotateX(${perspectiveY * 0.1}deg) rotateY(${perspectiveX * 0.1}deg)`;
      transformStr = tStr + (transformStr ? " " + transformStr : "");
    }

    const finalTransform =
      `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) ${transformStr || ""}`.trim();

    return {
      filter: filters.join(" "),
      transform: finalTransform,
      transition: isPanning
        ? "none"
        : "filter 0.2s ease-out, transform 0.2s ease-out",
    };
  }, [originalEdits, zoom, pan, isPanning]);

  return {
    edits,
    originalEdits,
    previewUrl,
    history,
    historyIndex,
    activeTab,
    showGrid,
    showBeforeAfter,
    isSaving,
    isCropping,
    cropAspectRatio,
    customW,
    customH,
    isRetouching,
    retouchBrushSize,
    retouchStep,
    retouchTarget,
    isExporting,
    zoom,
    pan,
    isPanning,
    viewerRef,
    imageRef,
    setEdits,
    setActiveTab,
    setShowGrid,
    setShowBeforeAfter,
    setCropAspectRatio,
    setCustomW,
    setCustomH,
    setRetouchBrushSize,
    handleEditChange,
    handleUndo,
    handleRedo,
    handleReset,
    handleSave,
    handleDownload,
    handleZoom,
    handleWheel,
    handleCropStart,
    handleCropApply,
    handleCropCancel,
    handleRetouchDone,
    handleRetouchClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    photoStyle,
    originalPhotoStyle,
  };
};
