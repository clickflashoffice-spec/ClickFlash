import { createContext, useContext, useMemo, ReactNode } from "react";
import { Photo, ManualEdits } from "@/types";
import { usePhotoState } from "./usePhotoState";
import { useEditsState } from "./useEditsState";
import { useSelectionState } from "./useSelectionState";
import { useToolState } from "./useToolState";
import { useZoomState } from "./useZoomState";

// --- Composed Types ---

export interface EditorContextValue {
  // Photo state
  photos: Photo[];
  activePhotoId: string | null;
  activePhoto: Photo | null;
  setPhotos: (photos: Photo[]) => void;
  setActivePhoto: (id: string) => void;
  updatePhoto: (id: string, updates: Partial<Photo>) => void;

  // Edits state
  edits: Record<string, ManualEdits>;
  activeEdits: ManualEdits | null;
  activeHistory: { past: ManualEdits[]; future: ManualEdits[] };
  isDirty: boolean;
  dirtyPhotoIds: Set<string>;
  updateEdit: (updates: Partial<ManualEdits>) => void;
  setEdits: (photoId: string, edits: ManualEdits) => void;
  resetEdits: (photoId: string) => void;
  resetActiveEdit: () => void;
  undo: () => void;
  redo: () => void;
  markSaved: (ids: string[]) => void;
  restoreDraft: (edits: Record<string, ManualEdits>) => void;
  initializePhotoEdits: (photoId: string, initialEdits?: ManualEdits) => void;

  // Selection state
  selectedPhotoIds: Set<string>;
  selectedCount: number;
  selectAll: (allPhotoIds: string[]) => void;
  deselectAll: () => void;
  toggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;

  // Tool state
  activeTool: "adjust" | "crop" | "retouch";
  copiedEdits: ManualEdits | null;
  setActiveTool: (tool: "adjust" | "crop" | "retouch") => void;
  copyEdits: () => void;
  pasteEdits: () => void;

  // Zoom state
  zoomStates: Record<
    string,
    { scale: number; offsetX: number; offsetY: number }
  >;
  persistZoomPerPhoto: boolean;
  setZoomState: (
    photoId: string,
    zoom: { scale: number; offsetX: number; offsetY: number },
  ) => void;
  clearZoomState: (photoId: string) => void;
  setPersistZoom: (persist: boolean) => void;
  getZoomState: (
    photoId: string,
  ) => { scale: number; offsetX: number; offsetY: number } | null;
}

// --- Context ---

const EditorContext = createContext<EditorContextValue | null>(null);

// --- Provider ---

interface EditorProviderProps {
  children: ReactNode;
  initialPhotos?: Photo[];
}

export function EditorProvider({
  children,
  initialPhotos = [],
}: EditorProviderProps) {
  // Photo state
  const [photoState, photoActions] = usePhotoState(initialPhotos);

  // Edits state (needs activePhotoId from photoState)
  const [editsState, editsActions] = useEditsState();

  // Selection state
  const [selectionState, selectionActions] = useSelectionState();

  // Tool state
  const [toolState, toolActions] = useToolState();

  // Zoom state
  const [zoomState, zoomActions] = useZoomState();

  // Compose context value
  const contextValue = useMemo<EditorContextValue>(() => {
    const activePhotoId = photoState.activePhotoId;
    const activeEdits = editsActions.getActiveEdits(activePhotoId);
    const activeHistory = editsActions.getActiveHistory(activePhotoId);

    // Copy edits action needs to grab from edits state
    const copyEdits = () => {
      if (activeEdits) {
        toolActions.copyEdits(activeEdits);
      }
    };

    // Paste edits needs to apply to selection or active photo
    const pasteEdits = () => {
      if (!toolState.copiedEdits) return;

      const editsToPaste = toolState.copiedEdits;

      if (selectionState.selectedPhotoIds.size > 0) {
        // Paste to all selected photos
        selectionState.selectedPhotoIds.forEach((id) => {
          editsActions.setEdits(id, { ...editsToPaste });
        });
      } else if (activePhotoId) {
        // Paste to active photo
        editsActions.setEdits(activePhotoId, { ...editsToPaste });
      }
    };

    return {
      // Photo state
      photos: photoState.photos,
      activePhotoId,
      activePhoto: photoState.activePhoto,
      setPhotos: photoActions.setPhotos,
      setActivePhoto: photoActions.setActivePhoto,
      updatePhoto: photoActions.updatePhoto,

      // Edits state
      edits: editsState.edits,
      activeEdits,
      activeHistory,
      isDirty: editsState.isDirty,
      dirtyPhotoIds: editsState.dirtyPhotoIds,
      updateEdit: (updates) => editsActions.updateEdit(activePhotoId, updates),
      setEdits: editsActions.setEdits,
      resetEdits: editsActions.resetEdits,
      resetActiveEdit: () => editsActions.resetActiveEdit(activePhotoId),
      undo: () => editsActions.undo(activePhotoId),
      redo: () => editsActions.redo(activePhotoId),
      markSaved: editsActions.markSaved,
      restoreDraft: editsActions.restoreDraft,
      initializePhotoEdits: editsActions.initializePhotoEdits,

      // Selection state
      selectedPhotoIds: selectionState.selectedPhotoIds,
      selectedCount: selectionState.selectedCount,
      selectAll: selectionActions.selectAll,
      deselectAll: selectionActions.deselectAll,
      toggleSelection: selectionActions.toggleSelection,
      isSelected: selectionActions.isSelected,

      // Tool state
      activeTool: toolState.activeTool,
      copiedEdits: toolState.copiedEdits,
      setActiveTool: toolActions.setActiveTool,
      copyEdits,
      pasteEdits,

      // Zoom state
      zoomStates: zoomState.zoomStates,
      persistZoomPerPhoto: zoomState.persistZoomPerPhoto,
      setZoomState: zoomActions.setZoomState,
      clearZoomState: zoomActions.clearZoomState,
      setPersistZoom: zoomActions.setPersistZoom,
      getZoomState: zoomActions.getZoomState,
    };
  }, [
    photoState,
    photoActions,
    editsState,
    editsActions,
    selectionState,
    selectionActions,
    toolState,
    toolActions,
    zoomState,
    zoomActions,
  ]);

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
}

// --- Consumer Hook ---

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}

// --- Convenience Hooks (for specific domains) ---

export function useEditorPhoto() {
  const context = useEditor();
  return useMemo(
    () => ({
      photos: context.photos,
      activePhotoId: context.activePhotoId,
      activePhoto: context.activePhoto,
      setPhotos: context.setPhotos,
      setActivePhoto: context.setActivePhoto,
      updatePhoto: context.updatePhoto,
    }),
    [context],
  );
}

export function useEditorEdits() {
  const context = useEditor();
  return useMemo(
    () => ({
      edits: context.edits,
      activeEdits: context.activeEdits,
      activeHistory: context.activeHistory,
      isDirty: context.isDirty,
      dirtyPhotoIds: context.dirtyPhotoIds,
      updateEdit: context.updateEdit,
      setEdits: context.setEdits,
      resetEdits: context.resetEdits,
      resetActiveEdit: context.resetActiveEdit,
      undo: context.undo,
      redo: context.redo,
      markSaved: context.markSaved,
      restoreDraft: context.restoreDraft,
      initializePhotoEdits: context.initializePhotoEdits,
    }),
    [context],
  );
}

export function useEditorSelection() {
  const context = useEditor();
  return useMemo(
    () => ({
      selectedPhotoIds: context.selectedPhotoIds,
      selectedCount: context.selectedCount,
      selectAll: context.selectAll,
      deselectAll: context.deselectAll,
      toggleSelection: context.toggleSelection,
      isSelected: context.isSelected,
    }),
    [context],
  );
}

export function useEditorTool() {
  const context = useEditor();
  return useMemo(
    () => ({
      activeTool: context.activeTool,
      copiedEdits: context.copiedEdits,
      setActiveTool: context.setActiveTool,
      copyEdits: context.copyEdits,
      pasteEdits: context.pasteEdits,
    }),
    [context],
  );
}

export function useEditorZoom() {
  const context = useEditor();
  return useMemo(
    () => ({
      zoomStates: context.zoomStates,
      persistZoomPerPhoto: context.persistZoomPerPhoto,
      setZoomState: context.setZoomState,
      clearZoomState: context.clearZoomState,
      setPersistZoom: context.setPersistZoom,
      getZoomState: context.getZoomState,
    }),
    [context],
  );
}
