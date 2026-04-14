import React, {
  useEffect,
  useCallback,
  useState,
  Suspense,
  lazy,
  useRef,
  memo,
} from "react";
import { ErrorBoundary } from "../../common/ErrorBoundary";

import { usePhotoData } from "./hooks/usePhotoData";
import { usePhotographers } from "../../../hooks/usePhotographers";
import { useEditorState } from "./hooks/useEditorState";
import { EditorLayout } from "./layout/EditorLayout";
import { SidebarControls, EditorTab } from "./controls/SidebarControls";
import { EditorCanvas } from "./canvas/EditorCanvas";
import { apiService } from "@/services/apiService";
import { albumService } from "@/services/api/albumService";
import { logger } from "@/utils/logger";
import { KioskSelectionModal } from "./KioskSelectionModal";
import { Filmstrip } from "./components/Filmstrip";
import { EditorSkeleton } from "@/components/common/EditorSkeleton";
import { useAIEditor } from "./hooks/useAIEditor";
import { useEditorTools } from "./hooks/useEditorTools";
import { useKioskEditor } from "./hooks/useKioskEditor";
import { SaveStateMachine } from "@/components/common/SaveStateMachine";
import { useSessionTiming } from "../../../hooks/useSessionTiming";
import { exportManager } from "./utils/ExportManager";
import { INITIAL_EDITS } from "@/utils/styleUtils";
import {
  Loader2,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize,
  Target,
} from "lucide-react";
import Spinner from "../../common/Spinner";
import type { ZoomPanState as ZoomPanStateType } from "./hooks/useZoomPan";

const AlbumAnalytics = lazy(() => import("../components/AlbumAnalytics"));

interface AlbumEditorProps {
  albumId: string;
  onBack: () => void;
  showToast: (message: string) => void;
}

const AlbumEditorComponent: React.FC<AlbumEditorProps> = ({
  albumId,
  onBack,
  showToast,
}) => {
  // 1. Fetch Data
  const { photos, album, isLoading, error, retryCount, refresh } =
    usePhotoData(albumId);

  // 2. Initialize State
  const {
    state,
    activePhoto,
    activeEdits,
    activePhotoZoom,
    actions,
    canUndo,
    canRedo,
  } = useEditorState();

  // Track current zoom for toolbar display
  const [currentZoom, setCurrentZoom] = useState<ZoomPanStateType | null>(null);
  const zoomDisplayRef = useRef<HTMLDivElement>(null);
  const [saveStatus, setSaveStatus] = useState<
    "IDLE" | "SAVING" | "SUCCESS" | "ERROR"
  >("IDLE");
  const [isExporting, setIsExporting] = useState(false);
  // Before/After toggle: when true, the canvas shows the unedited original.
  const [showOriginal, setShowOriginal] = useState(false);

  // 3. Editor UI State
  const [activeTab, setActiveTab] = useState<EditorTab>("adjust");

  // Tab change handler - exit tool modes when switching tabs
  const handleTabChange = useCallback((tab: EditorTab) => {
    setActiveTab(tab);
  }, []);

  // 4. Custom Hooks for Features
  const {
    isEnhancing,
    isAnalyzing,
    isApplyingCulling,
    handlers: aiHandlers,
  } = useAIEditor({
    albumId,
    refresh,
    showToast,
    updateEdit: actions.updateEdit,
  });

  const {
    isCropping,
    isRetouching,
    isStraightening,
    cropAspectRatio,
    retouchBrushSize,
    retouchStep,
    retouchTarget,
    setIsCropping,
    setIsRetouching,
    setRetouchStep,
    handlers: toolHandlers,
  } = useEditorTools({
    activePhotoId: state.activePhotoId,
    activeEdits,
    updateEdit: actions.updateEdit,
    showToast,
    onTabChange: handleTabChange,
  });

  const {
    isKioskModalOpen,
    availableKiosks,
    selectedKioskIds,
    isSendingToKiosk,
    setIsKioskModalOpen,
    setSelectedKioskIds,
    handlers: kioskHandlers,
  } = useKioskEditor({
    albumId,
    showToast,
  });

  const { data: photographers = [] } = usePhotographers();
  const currentPhotographers = photographers.filter((p) => !p.disabled);
  const activePhotographer = photographers.find(
    (p) => p.id === album?.photographerId,
  );

  const { startSession, endSession } = useSessionTiming(activePhotographer?.id);

  useEffect(() => {
    // Note: In Master App, photographerId is stored on the album
    if (album?.photographerId) {
      startSession();
      return () => {
        endSession();
      };
    }
  }, [album?.photographerId, startSession, endSession]);

  // Sync photos from data source to state when loaded (only if state is empty)
  useEffect(() => {
    if (photos.length > 0 && state.photos.length === 0) {
      actions.setPhotos(photos);
      // Default to first photo if none active
      if (!state.activePhotoId) {
        actions.setActivePhoto(photos[0].id);
      }
    }
  }, [photos, actions, state.photos.length, state.activePhotoId]);

  // Handle zoom changes from canvas
  const handleZoomChange = useCallback(
    (zoom: ZoomPanStateType) => {
      setCurrentZoom(zoom);
      // Persist zoom state if enabled
      if (state.persistZoomPerPhoto && state.activePhotoId) {
        actions.setZoomState(state.activePhotoId, {
          scale: zoom.scale,
          offsetX: zoom.offsetX,
          offsetY: zoom.offsetY,
        });
      }
    },
    [state.persistZoomPerPhoto, state.activePhotoId, actions],
  );

  // Fix: Only reset tab when photo actually changes AND no tool is currently active
  // Prevents silent crop/retouch cancel on photo navigation
  useEffect(() => {
    if (!isCropping && !isRetouching) {
      setActiveTab("adjust");
    }
  }, [state.activePhotoId]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally excludes tool state

  // 5. Autosave & Restore logic
  useEffect(() => {
    if (photos.length > 0 && !state.isDirty) {
      const saved = localStorage.getItem(`CF_DRAFT_${albumId}`);
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          // Only restore if draft is for this album and is relatively fresh (24h)
          const isFresh =
            Date.now() - (draft.timestamp || 0) < 24 * 60 * 60 * 1000;
          if (draft.albumId === albumId && isFresh && draft.edits) {
            console.log(`[Editor] Restoring draft for album ${albumId}`);
            actions.restoreDraft(draft.edits);
            showToast("Restored unsaved changes from previous session");
          }
        } catch (e) {
          console.error("Failed to restore draft", e);
        }
      }
    }
  }, [albumId, photos.length, actions, state.isDirty, showToast]);

  // Keep a ref to always-current edits so the autosave timer sees the latest
  // values without needing `state.edits` in the dependency array (which would
  // re-schedule the debounce on every single keystroke / slider movement).
  const latestEditsRef = useRef(state.edits);
  useEffect(() => {
    latestEditsRef.current = state.edits;
  });

  useEffect(() => {
    if (!state.isDirty || saveStatus === "SAVING") return;

    // Re-schedule only when the set of dirty photos changes, not on every edit.
    const timer = setTimeout(() => {
      try {
        const draftData = {
          albumId,
          edits: latestEditsRef.current,
          timestamp: Date.now(),
        };
        localStorage.setItem(`CF_DRAFT_${albumId}`, JSON.stringify(draftData));
      } catch (e) {
        // QuotaExceededError — clear old drafts and retry once
        console.warn("[Editor] localStorage quota exceeded, clearing old drafts");
        Object.keys(localStorage).filter(k => k.startsWith("CF_DRAFT_")).forEach(k => localStorage.removeItem(k));
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [state.dirtyPhotoIds, state.isDirty, albumId, saveStatus]);

  // Reset save button when user makes new edits after a successful save
  useEffect(() => {
    if (state.isDirty && saveStatus === "SUCCESS") {
      setSaveStatus("IDLE");
    }
  }, [state.isDirty, saveStatus]);

  // 4. Handlers
  const handleSave = useCallback(async () => {
    if (!state.isDirty || saveStatus === "SAVING") {
      return;
    }

    const dirtyPhotos = state.photos
      .filter((p) => state.dirtyPhotoIds.has(p.id))
      .map((p) => ({
        id: p.id,
        manualEdits: state.edits[p.id],
      }));

    if (dirtyPhotos.length === 0) return;

    try {
      setSaveStatus("SAVING");
      const totalToSave = dirtyPhotos.length;
      showToast(`Saving ${totalToSave} photo${totalToSave > 1 ? "s" : ""}...`);

      const result = await apiService.batchSavePhotos(dirtyPhotos);

      if (result.failureCount > 0) {
        showToast(
          `Saved ${result.successCount} photos, ${result.failureCount} failed.`,
        );
        setSaveStatus("ERROR");
      } else {
        showToast(`Successfully saved all ${result.successCount} photos!`);
        setSaveStatus("SUCCESS");
        // Clear autosave draft on successful manual save
        localStorage.removeItem(`CF_DRAFT_${albumId}`);
      }

      // Mark state as saved
      const savedIds = result.items.map((i: { id: string }) => i.id);
      actions.markSaved(savedIds);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isConflict = msg.includes('EDIT_CONFLICT') || msg.includes('conflict');
      if (isConflict) {
        showToast("Edit conflict — another session saved this photo. Reload to get the latest changes.");
      } else {
        logger.error("Failed to save", error);
        showToast("Failed to save changes.");
      }
      setSaveStatus("ERROR");
    } finally {
      setTimeout(() => setSaveStatus("IDLE"), 3000);
    }
  }, [
    state.isDirty,
    state.photos,
    state.dirtyPhotoIds,
    state.edits,
    actions,
    showToast,
    saveStatus,
    albumId,
  ]);

  const handleBatchExport = useCallback(async () => {
    if (isExporting) return;

    // Use selected photos if any, otherwise all photos
    const photosToExport =
      state.selectedPhotoIds.size > 0
        ? state.photos.filter((p) => state.selectedPhotoIds.has(p.id))
        : state.photos;

    if (photosToExport.length === 0) {
      showToast("No photos to export.");
      return;
    }

    try {
      // Phase P4: Native Directory Picker via Electron IPC
      let targetDir = "";
      const electron = (window as { electron?: { ipcRenderer?: { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> }; invoke?: (channel: string, ...args: unknown[]) => Promise<unknown> } }).electron;
      if (electron?.ipcRenderer?.invoke) {
        const selectedDir = await electron.ipcRenderer.invoke("dialog:openDirectory") as string | null;
        if (!selectedDir) return; // User canceled
        // Validate: must be absolute path, no traversal
        if (/\.\.[/\\]/.test(selectedDir)) {
          showToast("Invalid export directory.");
          return;
        }
        targetDir = selectedDir;
      } else if (electron?.invoke) {
        const selectedDir = await electron.invoke("dialog:openDirectory") as string | null;
        if (!selectedDir) return;
        if (/\.\.[/\\]/.test(selectedDir)) {
          showToast("Invalid export directory.");
          return;
        }
        targetDir = selectedDir;
      } else {
        // Fallback or dev-mode override
        targetDir = `C:/ClickFlash_Exports/${album?.title || albumId}_${Date.now()}`;
      }

      setIsExporting(true);
      showToast(`Exporting ${photosToExport.length} photos to: ${targetDir}`);

      const items = photosToExport.map((p) => {
        // Safe filename extraction — strip path traversal and query strings
        let basename = `${p.id}.jpg`;
        try {
          const url = new URL(p.url || "", "http://localhost");
          const lastSegment = url.pathname.split("/").pop() || "";
          // Strip anything that isn't alphanumeric, dash, underscore, or dot
          const sanitized = lastSegment.replace(/[^a-zA-Z0-9._-]/g, "_");
          if (sanitized && sanitized.length > 0 && sanitized.length < 255) {
            basename = sanitized;
          }
        } catch { /* use fallback */ }

        return {
          photoId: p.id,
          edits: state.edits[p.id] || {},
          filename: basename,
        };
      });

      const result = await exportManager.backendBatchExport(items, targetDir);

      if (result.success) {
        showToast(`✓ Exported ${result.exportedCount} photos to: ${targetDir}`);
      } else {
        showToast(`Export failed: ${result.errors.join(", ")}`);
      }
    } catch (error: any) {
      logger.error("Batch export failed", error);
      showToast(`Failed to export: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [
    isExporting,
    state.selectedPhotoIds,
    state.photos,
    state.edits,
    album,
    albumId,
    showToast,
  ]);

  const handleInternalTabChange = useCallback(
    (tab: EditorTab) => {
      handleTabChange(tab);

      // Auto-enter tool modes when switching tabs
      if (tab === "crop" && !isCropping) {
        setIsCropping(true);
      }

      if (tab === "retouch" && !isRetouching) {
        setIsRetouching(true);
        setRetouchStep("target");
      }
    },
    [
      handleTabChange,
      isCropping,
      isRetouching,
      setIsCropping,
      setIsRetouching,
      setRetouchStep,
    ],
  );

  // Handlers mapped from hooks are used directly in component

  // Navigation Handlers
  const handleNext = useCallback(() => {
    const index = state.photos.findIndex((p) => p.id === state.activePhotoId);
    if (index !== -1 && index < state.photos.length - 1) {
      actions.setActivePhoto(state.photos[index + 1].id);
    }
  }, [state.photos, state.activePhotoId, actions]);

  const handlePrev = useCallback(() => {
    const index = state.photos.findIndex((p) => p.id === state.activePhotoId);
    if (index > 0) {
      actions.setActivePhoto(state.photos[index - 1].id);
    }
  }, [state.photos, state.activePhotoId, actions]);

  // Keyboard Shortcuts for Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only navigate if not typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();

      // Batch & System shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          handleSave();
        }
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            actions.redo();
            showToast("Redo");
          } else {
            actions.undo();
            showToast("Undo");
          }
        }
        if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          actions.redo();
          showToast("Redo");
        }
        if (e.key.toLowerCase() === "c") {
          e.preventDefault();
          actions.copyEdits();
          showToast("✓ Edits copied to clipboard");
        }
        if (e.key.toLowerCase() === "v") {
          e.preventDefault();
          const count = state.selectedPhotoIds.size;
          actions.pasteEdits();
          showToast(
            `✓ Applied edits to ${count > 0 ? count : "current"} photo${count > 1 ? "s" : ""}`,
          );
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // Fix: include all used functions to prevent stale closures
  }, [
    handleNext,
    handlePrev,
    handleSave,
    actions,
    showToast,
    state.selectedPhotoIds,
  ]);

  const NavigationButtons = (
    <React.Fragment>
      <button
        onClick={handlePrev}
        disabled={
          state.photos.findIndex((p) => p.id === state.activePhotoId) <= 0
        }
        className="w-12 h-12 flex items-center justify-center bg-white/80 hover:bg-white text-gray-800 rounded-full backdrop-blur-md border border-gray-200 shadow-lg transition-all pointer-events-auto disabled:opacity-30 disabled:cursor-not-allowed group"
        title="Previous (Left Arrow)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <button
        onClick={handleNext}
        disabled={
          state.photos.findIndex((p) => p.id === state.activePhotoId) ===
          state.photos.length - 1
        }
        className="w-12 h-12 flex items-center justify-center bg-white/80 hover:bg-white text-gray-800 rounded-full backdrop-blur-md border border-gray-200 shadow-lg transition-all pointer-events-auto disabled:opacity-30 disabled:cursor-not-allowed group"
        title="Next (Right Arrow)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 group-hover:translate-x-0.5 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </React.Fragment>
  );

  // Toolbar
  const Toolbar = (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <button
          data-testid="back-button"
          onClick={() => {
            if (state.isDirty) {
              if (
                window.confirm(
                  "You have unsaved changes. Are you sure you want to go back?",
                )
              ) {
                onBack();
              }
            } else {
              onBack();
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            state.isDirty
              ? "text-amber-600 hover:text-amber-700 bg-amber-50"
              : "text-gray-600 hover:text-gray-900"
          }`}
          title={state.isDirty ? "Unsaved changes" : "Back to albums"}
        >
          <span>&larr; Back</span>
          {state.isDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
        <div className="h-6 w-px bg-gray-200" />
        <span data-testid="album-title" className="text-gray-900 font-semibold">
          {album?.title || "Loading..."}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Zoom Toolbar Indicator */}
        {currentZoom && (
          <div
            ref={zoomDisplayRef}
            className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1"
          >
            <button
              onClick={() => {
                /* Zoom out handled by canvas */
              }}
              disabled={currentZoom.scale <= 0.1}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-xs font-medium text-gray-700 min-w-[40px] text-center">
              {Math.round(currentZoom.scale * 100)}%
            </span>
            <button
              onClick={() => {
                /* Zoom in handled by canvas */
              }}
              disabled={currentZoom.scale >= 5}
              className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button
              onClick={() => {
                /* Fit to screen */
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Fit to Screen (F)"
            >
              <Maximize className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                /* Actual pixels */
              }}
              className={`p-1 hover:bg-gray-200 rounded ${currentZoom.scale === 1 ? "text-blue-600" : ""}`}
              title="Actual Pixels (1:1)"
            >
              <Target className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="h-6 w-px bg-gray-200" />
        {/* Before / After comparison toggle */}
        <button
          data-testid="before-after-button"
          onMouseDown={() => setShowOriginal(true)}
          onMouseUp={() => setShowOriginal(false)}
          onMouseLeave={() => setShowOriginal(false)}
          onTouchStart={() => setShowOriginal(true)}
          onTouchEnd={() => setShowOriginal(false)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors select-none ${
            showOriginal
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          title="Hold to view original (before edits)"
          aria-pressed={showOriginal}
          aria-label="Before/After comparison"
        >
          {showOriginal ? "Before" : "B/A"}
        </button>
        <div className="h-6 w-px bg-gray-200" />
        <button
          data-testid="undo-button"
          onClick={() => actions.undo()}
          disabled={!canUndo}
          title={canUndo ? `Undo (Ctrl+Z)` : "Nothing to undo"}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-200 transition-colors"
        >
          ↩ Undo
        </button>
        <button
          data-testid="redo-button"
          onClick={() => actions.redo()}
          disabled={!canRedo}
          title={canRedo ? `Redo (Ctrl+Y)` : "Nothing to redo"}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-200 transition-colors"
        >
          ↪ Redo
        </button>
        <SaveStateMachine
          status={saveStatus}
          onSave={handleSave}
          disabled={!state.isDirty}
        />
        <button
          data-testid="export-button"
          onClick={handleBatchExport}
          disabled={isExporting}
          className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded flex items-center gap-2 transition-colors disabled:opacity-50"
          title="Export processed photos to a local folder (Law 14)"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isExporting ? "Exporting..." : "Batch Export"}
        </button>
        <div className="h-6 w-px bg-gray-200 ml-2" />
        <button
          data-testid="send-to-kiosk-button"
          onClick={kioskHandlers.handleOpenKioskModal}
          disabled={isSendingToKiosk}
          className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <span>{isSendingToKiosk ? "⏳" : "🖥️"}</span>
          {isSendingToKiosk ? "Sending..." : "Send to Kiosk"}
        </button>
      </div>
    </div>
  );

  const handleSetCover = useCallback(async (photo: import("@/types").Photo) => {
    if (!album) return;
    const coverUrl = photo.thumbnailUrl || photo.previewUrl || photo.url;
    const result = await albumService.updateAlbum(album.id, { coverPhotoUrl: coverUrl });
    if (result.success) {
      showToast("Album cover updated!");
    } else {
      showToast(`Failed to set cover: ${result.error ?? "Unknown error"}`);
    }
  }, [album, showToast]);

  // Filmstrip component call
  const renderFilmstrip = (
    <Filmstrip
      photos={state.photos}
      activePhotoId={state.activePhotoId}
      selectedPhotoIds={state.selectedPhotoIds}
      dirtyPhotoIds={state.dirtyPhotoIds}
      edits={state.edits}
      onSetActivePhoto={actions.setActivePhoto}
      onToggleSelection={actions.toggleSelection}
      onSelectAll={actions.selectAll}
      onDeselectAll={actions.deselectAll}
      onSetCover={handleSetCover}
    />
  );

  // Sidebar with all the new functionality
  const Sidebar = activeEdits ? (
    <SidebarControls
      key={state.activePhotoId ?? "no-photo"}
      edits={activeEdits}
      onUpdate={actions.updateEdit}
      activeTab={activeTab}
      onTabChange={handleInternalTabChange}
      // Crop props
      isCropping={isCropping}
      onCropStart={toolHandlers.handleCropStart}
      cropAspectRatio={cropAspectRatio}
      onCropAspectRatioChange={toolHandlers.handleCropAspectRatioChange}
      // Retouch props
      retouchBrushSize={retouchBrushSize}
      onRetouchBrushSizeChange={toolHandlers.handleRetouchBrushSizeChange}
      onRetouchDone={toolHandlers.handleRetouchDone}
      isRetouchingProcessing={false}
      // AI props
      onAutoEnhance={() => aiHandlers.handleAutoEnhance(activePhoto || null)}
      isEnhancing={isEnhancing}
      onAnalyzeAlbum={aiHandlers.handleAnalyzeAlbum}
      isAnalyzing={isAnalyzing}
      onApplyCulling={aiHandlers.handleApplyCulling}
      isApplyingCulling={isApplyingCulling}
      cullingStats={{
        total: state.photos.length,
        selected: state.photos.filter((p) => p.cullingStatus === "Selected")
          .length,
        rejected: state.photos.filter((p) => p.cullingStatus === "Rejected")
          .length,
      }}
      // Straighten
      onStraightenStart={toolHandlers.handleStraightenStart}
      onStraightenEnd={toolHandlers.handleStraightenEnd}
      // Batch
      onCopyEdits={() => {
        actions.copyEdits();
        showToast("✓ Edits copied to clipboard");
      }}
      onPasteEdits={() => {
        const count = state.selectedPhotoIds.size;
        actions.pasteEdits();
        showToast(`✓ Applied edits to ${count} photo${count > 1 ? "s" : ""}`);
      }}
      hasCopiedEdits={!!state.copiedEdits}
      selectedCount={state.selectedPhotoIds.size}
      isStraightening={isStraightening}
      // Undo/Redo for FilterPanel
      onUndo={actions.undo}
      onRedo={actions.redo}
      canUndo={canUndo}
      canRedo={canRedo}
      onResetActiveEdit={actions.resetActiveEdit}
      activePhotoUrl={activePhoto?.thumbnailUrl}
    />
  ) : (
    <div className="p-4 text-gray-500 text-center">Select a photo to edit</div>
  );

  if (isLoading && photos.length === 0) {
    return <EditorSkeleton />;
  }

  if (error && photos.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Failed to Load Album
          </h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mb-4">
              Retried {retryCount} time{retryCount > 1 ? "s" : ""}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={refresh}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 relative" data-testid="album-editor">
      {/* Save Status Layer */}
      {saveStatus === "SAVING" && (
        <div data-testid="saving-overlay" className="absolute inset-0 z-40 pointer-events-none flex items-end justify-center pb-20">
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-3 shadow-2xl backdrop-blur-md flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-gray-900 text-sm font-medium">
              Saving changes...
            </span>
          </div>
        </div>
      )}
      <EditorLayout
        toolbar={Toolbar}
        sidebar={Sidebar}
        canvas={
          <div className="w-full h-full relative">
            <div
              className={`absolute inset-0 ${activeTab === "analytics" ? "hidden" : "block"}`}
            >
              <ErrorBoundary
                fallback={
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                    <span className="text-4xl">⚠️</span>
                    <p className="font-semibold text-gray-700">
                      Could not render this photo.
                    </p>
                    <p className="text-sm">
                      Try selecting another photo or refreshing the editor.
                    </p>
                  </div>
                }
              >
                <EditorCanvas
                  photo={activePhoto || null}
                  edits={showOriginal ? INITIAL_EDITS : (activeEdits || undefined)}
                  isCropping={isCropping}
                  cropAspectRatio={cropAspectRatio}
                  onCropApply={toolHandlers.handleCropApply}
                  onCropCancel={toolHandlers.handleCropCancel}
                  isRetouching={isRetouching}
                  isStraightening={isStraightening}
                  retouchBrushSize={retouchBrushSize}
                  retouchStep={retouchStep}
                  retouchTarget={retouchTarget}
                  onRetouchClick={toolHandlers.handleRetouchClick}
                  persistedZoom={activePhotoZoom}
                  onZoomChange={handleZoomChange}
                />
              </ErrorBoundary>
            </div>
            <div
              className={`absolute inset-0 overflow-y-auto bg-gray-50 p-8 custom-scrollbar ${activeTab === "analytics" ? "block" : "hidden"}`}
            >
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <Spinner />
                  </div>
                }
              >
                <ErrorBoundary
                  fallback={
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                      <span className="text-4xl">📊</span>
                      <p className="font-semibold text-gray-700">
                        Analytics temporarily unavailable
                      </p>
                      <p className="text-sm">
                        No analytics data for this album yet.
                      </p>
                    </div>
                  }
                >
                  <AlbumAnalytics albumId={albumId} />
                </ErrorBoundary>
              </Suspense>
            </div>
          </div>
        }
        filmstrip={
          <div className={activeTab === "analytics" ? "hidden" : "block"}>
            {renderFilmstrip}
          </div>
        }
        navigation={activeTab !== "analytics" ? NavigationButtons : undefined}
      />

      {/* Modal Layer */}
      <KioskSelectionModal
        isOpen={isKioskModalOpen}
        kiosks={availableKiosks}
        selectedKioskIds={selectedKioskIds}
        selectedPhotoCount={state.photos.length}
        onToggleKiosk={kioskHandlers.handleToggleKiosk}
        onSelectAll={() =>
          setSelectedKioskIds(new Set(availableKiosks.map((k) => k.id)))
        }
        onClearAll={() => setSelectedKioskIds(new Set())}
        onConfirm={kioskHandlers.handleKioskConfirm}
        onCancel={() => setIsKioskModalOpen(false)}
      />
    </div>
  );
};

// Memoize the entire editor to prevent unnecessary re-renders
export const AlbumEditor = memo(AlbumEditorComponent, (prev, next) => {
  // Only re-render if albumId changes
  return prev.albumId === next.albumId;
});

AlbumEditor.displayName = "AlbumEditor";

export default AlbumEditor;
