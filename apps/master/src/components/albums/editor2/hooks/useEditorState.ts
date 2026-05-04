import { useReducer, useCallback, useMemo } from "react";
import { Photo, ManualEdits } from "@/types";
import { INITIAL_EDITS } from "@/utils/styleUtils";
import { ZoomPanState } from "./useZoomPan";

const MAX_HISTORY = 50;

/**
 * Evicts history entries for non-visible, non-active photos to free memory.
 * Keeps the active photo and visibleIds photos; removes all others.
 */
function evictLRUHistories(
  histories: Record<string, { past: ManualEdits[]; future: ManualEdits[] }>,
  activePhotoId: string,
  visibleIds: Set<string>,
  _maxHistory: number,
): Record<string, { past: ManualEdits[]; future: ManualEdits[] }> {
  const result = { ...histories };
  for (const photoId of Object.keys(result)) {
    if (photoId !== activePhotoId && !visibleIds.has(photoId)) {
      delete result[photoId];
    }
  }
  return result;
}

/**
 * Returns the per-photo history depth appropriate for the current album size.
 * Keeps memory bounded: 200 photos × 20 entries × ~30 fields ≈ manageable RAM.
 */
function getHistoryCap(totalPhotos: number): number {
  if (totalPhotos > 100) return 10;
  if (totalPhotos > 50) return 20;
  return MAX_HISTORY;
}

// --- Types ---

export interface EditorState {
  activePhotoId: string | null;
  photos: Photo[]; // The source of truth for the session
  // We track edits separately to allow "dirty" checking against original
  // Key: photoId, Value: Current working edits
  edits: Record<string, ManualEdits>;
  // Key: photoId, Value: { past: [], future: [] }
  histories: Record<string, { past: ManualEdits[]; future: ManualEdits[] }>;
  isDirty: boolean; // Computed or manual
  dirtyPhotoIds: Set<string>; // Tracks which photos need saving
  activeTool: "adjust" | "crop" | "retouch";
  selectedPhotoIds: Set<string>; // Batch selection
  copiedEdits: ManualEdits | null; // For copy/paste
  // Zoom state persistence per photo
  zoomStates: Record<string, Pick<ZoomPanState, 'scale' | 'offsetX' | 'offsetY'>>;
  // Settings
  persistZoomPerPhoto: boolean;
}

type Action =
  | { type: "SET_PHOTOS"; payload: Photo[] }
  | { type: "SET_ACTIVE_PHOTO"; payload: string }
  | { type: "SET_ACTIVE_TOOL"; payload: "adjust" | "crop" | "retouch" }
  | { type: "UPDATE_EDIT"; payload: Partial<ManualEdits> }
  | { type: "SET_EDITS"; payload: { photoId: string; edits: ManualEdits } } // For replace/presets
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SAVE_SUCCESS"; payload: string[] } // Clean dirty for these IDs
  | { type: "RESET_EDITS"; payload: string } // Reset specific photo to initial
  | { type: "SELECT_ALL" }
  | { type: "DESELECT_ALL" }
  | { type: "TOGGLE_SELECTION"; payload: string }
  | { type: "COPY_EDITS" }
  | { type: "PASTE_EDITS" }
  | { type: "RESTORE_DRAFT"; payload: Record<string, ManualEdits> }
  | { type: "RESET_ACTIVE_EDIT" }
  | { type: "SET_ZOOM_STATE"; payload: { photoId: string; zoom: Pick<ZoomPanState, 'scale' | 'offsetX' | 'offsetY'> } }
  | { type: "CLEAR_ZOOM_STATE"; payload: string }
  | { type: "SET_PERSIST_ZOOM"; payload: boolean };

// --- Reducer ---

const initialState: EditorState = {
  activePhotoId: null,
  photos: [],
  edits: {},
  histories: {},
  isDirty: false,
  dirtyPhotoIds: new Set(),
  activeTool: "adjust",
  selectedPhotoIds: new Set(),
  copiedEdits: null,
  zoomStates: {},
  persistZoomPerPhoto: true, // Default to preserving zoom
};

function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "RESTORE_DRAFT": {
      const newEdits = { ...state.edits, ...action.payload };
      const newDirtyIds = new Set(state.dirtyPhotoIds);
      Object.keys(action.payload).forEach((id) => newDirtyIds.add(id));

      return {
        ...state,
        edits: newEdits,
        dirtyPhotoIds: newDirtyIds,
        isDirty: true,
      };
    }

    case "SET_PHOTOS": {
      const newPhotoIds = new Set(action.payload.map((p) => p.id));
      const newEdits = { ...state.edits };
      const newHistories = { ...state.histories };

      // LRU eviction: drop history for photos no longer in the loaded set
      // to prevent unbounded memory growth when users browse large libraries.
      Object.keys(newHistories).forEach((id) => {
        if (!newPhotoIds.has(id)) {
          delete newHistories[id];
        }
      });

      action.payload.forEach((p) => {
        if (!newEdits[p.id]) {
          newEdits[p.id] = p.manualEdits || { ...INITIAL_EDITS };
          newHistories[p.id] = { past: [], future: [] };
        } else if (!state.dirtyPhotoIds.has(p.id)) {
          newEdits[p.id] = p.manualEdits || { ...INITIAL_EDITS };
          newHistories[p.id] = { past: [], future: [] };
        }
      });

      // P2-P3 Fix: Clear zoomStates on SET_PHOTOS (loading new album)
      return {
        ...state,
        photos: action.payload,
        edits: newEdits,
        histories: newHistories,
        // Clear persisted zoom states when a new album/photo set loads.
        // Stale zoom for photos from other albums wastes memory and can
        // produce confusing initial positions if photo IDs happen to collide.
        zoomStates: {},
      };
    }

    case "SET_ACTIVE_PHOTO":
      if (state.activePhotoId === action.payload) return state;
      return {
        ...state,
        activePhotoId: action.payload,
      };

    case "SET_ACTIVE_TOOL":
      return {
        ...state,
        activeTool: action.payload,
      };

    case "UPDATE_EDIT": {
      if (!state.activePhotoId) return state;
      const currentEdits = state.edits[state.activePhotoId] || {
        ...INITIAL_EDITS,
      };
      const newEdits = { ...currentEdits, ...action.payload };
      const currentHistory = state.histories[state.activePhotoId] || {
        past: [],
        future: [],
      };

      // P1-A4 Fix: Enforce dynamic history cap
      const maxHistory = getHistoryCap(state.photos.length);
      const newPast = [...currentHistory.past, currentEdits];
      
      // Evict oldest entries if over cap
      const trimmedPast = newPast.length > maxHistory 
        ? newPast.slice(-maxHistory) 
        : newPast;

      // P1-A4 Fix: LRU eviction for non-visible photos
      const visibleIds = new Set(state.photos.slice(0, 10).map(p => p.id)); // Assume first 10 visible
      const newHistories = evictLRUHistories(state.histories, state.activePhotoId ?? '', visibleIds, maxHistory);
      newHistories[state.activePhotoId] = {
        past: trimmedPast,
        future: [],
      };

      return {
        ...state,
        edits: {
          ...state.edits,
          [state.activePhotoId]: newEdits,
        },
        dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(state.activePhotoId),
        isDirty: true,
        histories: {
          ...state.histories,
          [state.activePhotoId]: {
            past: [...currentHistory.past, currentEdits].slice(-getHistoryCap(state.photos.length)),
            future: [],
          },
        },
      };
    }

    case "SET_EDITS": {
      const { photoId, edits } = action.payload;
      const currentEdits = state.edits[photoId] || { ...INITIAL_EDITS };
      const currentHistory = state.histories[photoId] || {
        past: [],
        future: [],
      };

      // P1-A4 Fix: Enforce dynamic history cap
      const maxHistory = getHistoryCap(state.photos.length);
      const newPast = [...currentHistory.past, currentEdits];
      
      // Evict oldest entries if over cap
      const trimmedPast = newPast.length > maxHistory 
        ? newPast.slice(-maxHistory) 
        : newPast;

      // P1-A4 Fix: LRU eviction for non-visible photos
      const visibleIds = new Set(state.photos.slice(0, 10).map(p => p.id));
      const newHistories = evictLRUHistories(state.histories, state.activePhotoId ?? '', visibleIds, maxHistory);
      newHistories[photoId] = {
        past: trimmedPast,
        future: [],
      };

      return {
        ...state,
        edits: {
          ...state.edits,
          [photoId]: edits,
        },
        dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(photoId),
        isDirty: true,
        histories: {
          ...state.histories,
          [photoId]: {
            past: [...currentHistory.past, currentEdits].slice(-getHistoryCap(state.photos.length)),
            future: [],
          },
        },
      };
    }

    case "UNDO": {
      if (!state.activePhotoId) return state;
      const currentHistory = state.histories[state.activePhotoId];
      if (!currentHistory || currentHistory.past.length === 0) return state;

      const previous = currentHistory.past[currentHistory.past.length - 1];
      const newPast = currentHistory.past.slice(0, -1);
      const current = state.edits[state.activePhotoId];

      return {
        ...state,
        edits: {
          ...state.edits,
          [state.activePhotoId]: previous,
        },
        histories: {
          ...state.histories,
          [state.activePhotoId]: {
            past: newPast,
            future: [current, ...currentHistory.future],
          },
        },
        dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(state.activePhotoId),
        isDirty: true,
      };
    }

    case "REDO": {
      if (!state.activePhotoId) return state;
      const currentHistory = state.histories[state.activePhotoId];
      if (!currentHistory || currentHistory.future.length === 0) return state;

      const next = currentHistory.future[0];
      const newFuture = currentHistory.future.slice(1);
      const current = state.edits[state.activePhotoId];

      return {
        ...state,
        edits: {
          ...state.edits,
          [state.activePhotoId]: next,
        },
        histories: {
          ...state.histories,
          [state.activePhotoId]: {
            past: [...currentHistory.past, current].slice(-MAX_HISTORY),
            future: newFuture,
          },
        },
        dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(state.activePhotoId),
        isDirty: true,
      };
    }

    case "SAVE_SUCCESS": {
      const savedIds = new Set(action.payload);
      const newDirtyIds = new Set(
        [...state.dirtyPhotoIds].filter((id) => !savedIds.has(id)),
      );
      return {
        ...state,
        dirtyPhotoIds: newDirtyIds,
        isDirty: newDirtyIds.size > 0,
      };
    }

    case "RESET_EDITS": {
      const photoId = action.payload;
      const currentEdits = state.edits[photoId] || { ...INITIAL_EDITS };
      const currentHistory = state.histories[photoId] || {
        past: [],
        future: [],
      };

      return {
        ...state,
        edits: {
          ...state.edits,
          [photoId]: { ...INITIAL_EDITS },
        },
        dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(photoId),
        isDirty: true,
        histories: {
          ...state.histories,
          [photoId]: {
            past: [...currentHistory.past, currentEdits].slice(-MAX_HISTORY),
            future: [],
          },
        },
      };
    }

    case "SELECT_ALL":
      return {
        ...state,
        selectedPhotoIds: new Set(state.photos.map((p) => p.id)),
      };

    case "DESELECT_ALL":
      return {
        ...state,
        selectedPhotoIds: new Set(),
      };

    case "TOGGLE_SELECTION": {
      const newSelection = new Set(state.selectedPhotoIds);
      if (newSelection.has(action.payload)) {
        newSelection.delete(action.payload);
      } else {
        newSelection.add(action.payload);
      }
      return {
        ...state,
        selectedPhotoIds: newSelection,
      };
    }

    case "COPY_EDITS": {
      const currentEdits = state.activePhotoId
        ? state.edits[state.activePhotoId]
        : null;
      if (!currentEdits) return state;
      return {
        ...state,
        copiedEdits: { ...currentEdits },
      };
    }

    case "PASTE_EDITS": {
      if (!state.copiedEdits) return state;

      const newEdits = { ...state.edits };
      const newDirtyPhotoIds = new Set(state.dirtyPhotoIds);
      const editsToPaste = { ...state.copiedEdits };

      // If we have a selection, paste to all selected
      if (state.selectedPhotoIds.size > 0) {
        state.selectedPhotoIds.forEach((id) => {
          newEdits[id] = { ...editsToPaste };
          newDirtyPhotoIds.add(id);
        });
      } else if (state.activePhotoId) {
        // Otherwise paste to active photo
        newEdits[state.activePhotoId] = { ...editsToPaste };
        newDirtyPhotoIds.add(state.activePhotoId);
      } else {
        return state;
      }

      return {
        ...state,
        edits: newEdits,
        dirtyPhotoIds: newDirtyPhotoIds,
        isDirty: true,
      };
    }

    case "RESET_ACTIVE_EDIT": {
      if (!state.activePhotoId) return state;
      const currentEdits = state.edits[state.activePhotoId] || {
        ...INITIAL_EDITS,
      };
      const currentHistory = state.histories[state.activePhotoId] || {
        past: [],
        future: [],
      };

      return {
        ...state,
        edits: {
          ...state.edits,
          [state.activePhotoId]: { ...INITIAL_EDITS },
        },
        dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(state.activePhotoId),
        isDirty: true,
        histories: {
          ...state.histories,
          [state.activePhotoId]: {
            past: [...currentHistory.past, currentEdits].slice(-MAX_HISTORY),
            future: [],
          },
        },
      };
    }

    case "SET_ZOOM_STATE": {
      const { photoId, zoom } = action.payload;
      return {
        ...state,
        zoomStates: {
          ...state.zoomStates,
          [photoId]: zoom,
        },
      };
    }

    case "CLEAR_ZOOM_STATE": {
      const newZoomStates = { ...state.zoomStates };
      delete newZoomStates[action.payload];
      return {
        ...state,
        zoomStates: newZoomStates,
      };
    }

    case "SET_PERSIST_ZOOM": {
      return {
        ...state,
        persistZoomPerPhoto: action.payload,
      };
    }

    default:
      return state;
  }
}

// --- Hook ---

export function useEditorState(initialPhotos: Photo[] = []) {
  const [state, dispatch] = useReducer(editorReducer, {
    ...initialState,
    photos: initialPhotos,
    edits: initialPhotos.reduce(
      (acc, p) => {
        acc[p.id] = p.manualEdits || { ...INITIAL_EDITS };
        return acc;
      },
      {} as Record<string, ManualEdits>,
    ),
    histories: initialPhotos.reduce(
      (acc, p) => {
        acc[p.id] = { past: [], future: [] };
        return acc;
      },
      {} as Record<string, { past: ManualEdits[]; future: ManualEdits[] }>,
    ),
  });

  const activePhoto = state.activePhotoId
    ? state.photos.find((p) => p.id === state.activePhotoId)
    : null;

  const activeEdits = state.activePhotoId
    ? state.edits[state.activePhotoId]
    : null;

  const activeHistory = state.activePhotoId
    ? state.histories[state.activePhotoId] || { past: [], future: [] }
    : { past: [], future: [] };

  // Actions
  const setPhotos = useCallback((photos: Photo[]) => {
    dispatch({ type: "SET_PHOTOS", payload: photos });
  }, []);

  const setActivePhoto = useCallback((id: string) => {
    dispatch({ type: "SET_ACTIVE_PHOTO", payload: id });
  }, []);

  const setZoomState = useCallback((photoId: string, zoom: Pick<ZoomPanState, 'scale' | 'offsetX' | 'offsetY'>) => {
    dispatch({ type: "SET_ZOOM_STATE", payload: { photoId, zoom } });
  }, []);

  const clearZoomState = useCallback((photoId: string) => {
    dispatch({ type: "CLEAR_ZOOM_STATE", payload: photoId });
  }, []);

  const setPersistZoom = useCallback((persist: boolean) => {
    dispatch({ type: "SET_PERSIST_ZOOM", payload: persist });
  }, []);

  const setActiveTool = useCallback((tool: "adjust" | "crop" | "retouch") => {
    dispatch({ type: "SET_ACTIVE_TOOL", payload: tool });
  }, []);

  const updateEdit = useCallback((updates: Partial<ManualEdits>) => {
    dispatch({ type: "UPDATE_EDIT", payload: updates });
  }, []);

  const setEdits = useCallback((photoId: string, edits: ManualEdits) => {
    dispatch({ type: "SET_EDITS", payload: { photoId, edits } });
  }, []);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  const resetEdits = useCallback((id: string) => {
    dispatch({ type: "RESET_EDITS", payload: id });
  }, []);

  const markSaved = useCallback((ids: string[]) => {
    dispatch({ type: "SAVE_SUCCESS", payload: ids });
  }, []);

  const selectAll = useCallback(() => dispatch({ type: "SELECT_ALL" }), []);
  const deselectAll = useCallback(() => dispatch({ type: "DESELECT_ALL" }), []);
  const toggleSelection = useCallback(
    (id: string) => dispatch({ type: "TOGGLE_SELECTION", payload: id }),
    [],
  );
  const copyEdits = useCallback(() => dispatch({ type: "COPY_EDITS" }), []);
  const pasteEdits = useCallback(() => dispatch({ type: "PASTE_EDITS" }), []);
  const resetActiveEdit = useCallback(
    () => dispatch({ type: "RESET_ACTIVE_EDIT" }),
    [],
  );

  const restoreDraft = useCallback(
    (edits: Record<string, ManualEdits>) =>
      dispatch({ type: "RESTORE_DRAFT", payload: edits }),
    [dispatch],
  );

  const actions = useMemo(
    () => ({
      setPhotos,
      setActivePhoto,
      setActiveTool,
      updateEdit,
      setEdits,
      undo,
      redo,
      resetEdits,
      markSaved,
      selectAll,
      deselectAll,
      toggleSelection,
      copyEdits,
      pasteEdits,
      resetActiveEdit,
      restoreDraft,
      setZoomState,
      clearZoomState,
      setPersistZoom,
    }),
    [
      setPhotos,
      setActivePhoto,
      setActiveTool,
      updateEdit,
      setEdits,
      undo,
      redo,
      resetEdits,
      markSaved,
      selectAll,
      deselectAll,
      toggleSelection,
      copyEdits,
      pasteEdits,
      resetActiveEdit,
      restoreDraft,
      setZoomState,
      clearZoomState,
      setPersistZoom,
    ],
  );

  // Get persisted zoom for active photo
  const activePhotoZoom = state.activePhotoId && state.persistZoomPerPhoto
    ? state.zoomStates[state.activePhotoId]
    : null;

  return {
    state,
    activePhoto,
    activeEdits,
    activePhotoZoom,
    actions,
    canUndo: activeHistory.past.length > 0,
    canRedo: activeHistory.future.length > 0,
    /** Convenience alias for the active photo's undo/redo history. */
    history: activeHistory,
  };
}
