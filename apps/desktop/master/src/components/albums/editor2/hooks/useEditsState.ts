import { useReducer, useCallback, useMemo } from "react";
import { ManualEdits } from "@/types";
import { INITIAL_EDITS } from "@/utils/styleUtils";

// --- Types ---

export interface EditsState {
  edits: Record<string, ManualEdits>;
  histories: Record<string, { past: ManualEdits[]; future: ManualEdits[] }>;
  isDirty: boolean;
  dirtyPhotoIds: Set<string>;
}

export interface EditsActions {
  updateEdit: (
    activePhotoId: string | null,
    updates: Partial<ManualEdits>,
  ) => void;
  setEdits: (photoId: string, edits: ManualEdits) => void;
  resetEdits: (photoId: string) => void;
  resetActiveEdit: (activePhotoId: string | null) => void;
  undo: (activePhotoId: string | null) => void;
  redo: (activePhotoId: string | null) => void;
  markSaved: (ids: string[]) => void;
  restoreDraft: (edits: Record<string, ManualEdits>) => void;
  initializePhotoEdits: (photoId: string, initialEdits?: ManualEdits) => void;
  getActiveEdits: (activePhotoId: string | null) => ManualEdits | null;
  getActiveHistory: (activePhotoId: string | null) => {
    past: ManualEdits[];
    future: ManualEdits[];
  };
}

type EditsAction =
  | {
      type: "UPDATE_EDIT";
      payload: { activePhotoId: string; updates: Partial<ManualEdits> };
    }
  | { type: "SET_EDITS"; payload: { photoId: string; edits: ManualEdits } }
  | { type: "UNDO"; payload: { activePhotoId: string } }
  | { type: "REDO"; payload: { activePhotoId: string } }
  | { type: "SAVE_SUCCESS"; payload: string[] }
  | { type: "RESET_EDITS"; payload: { photoId: string } }
  | { type: "RESET_ACTIVE_EDIT"; payload: { activePhotoId: string } }
  | { type: "RESTORE_DRAFT"; payload: Record<string, ManualEdits> }
  | {
      type: "INIT_PHOTO_EDITS";
      payload: { photoId: string; edits?: ManualEdits };
    };

// --- Reducer ---

const initialState: EditsState = {
  edits: {},
  histories: {},
  isDirty: false,
  dirtyPhotoIds: new Set(),
};

function editsReducer(state: EditsState, action: EditsAction): EditsState {
  switch (action.type) {
    case "UPDATE_EDIT": {
      const { activePhotoId, updates } = action.payload;
      const currentEdits = state.edits[activePhotoId] || { ...INITIAL_EDITS };
      const newEdits = { ...currentEdits, ...updates };
      const currentHistory = state.histories[activePhotoId] || {
        past: [],
        future: [],
      };

      return {
        ...state,
        edits: {
          ...state.edits,
          [activePhotoId]: newEdits,
        },
        dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(activePhotoId),
        isDirty: true,
        histories: {
          ...state.histories,
          [activePhotoId]: {
            past: [...currentHistory.past, currentEdits],
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
            past: [...currentHistory.past, currentEdits],
            future: [],
          },
        },
      };
    }

    case "UNDO": {
      const { activePhotoId } = action.payload;
      const currentHistory = state.histories[activePhotoId];
      if (!currentHistory || currentHistory.past.length === 0) return state;

      const previous = currentHistory.past[currentHistory.past.length - 1];
      const newPast = currentHistory.past.slice(0, -1);
      const current = state.edits[activePhotoId];

      return {
        ...state,
        edits: {
          ...state.edits,
          [activePhotoId]: previous,
        },
        histories: {
          ...state.histories,
          [activePhotoId]: {
            past: newPast,
            future: [current, ...currentHistory.future],
          },
        },
        dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(activePhotoId),
        isDirty: true,
      };
    }

    case "REDO": {
      const { activePhotoId } = action.payload;
      const currentHistory = state.histories[activePhotoId];
      if (!currentHistory || currentHistory.future.length === 0) return state;

      const next = currentHistory.future[0];
      const newFuture = currentHistory.future.slice(1);
      const current = state.edits[activePhotoId];

      return {
        ...state,
        edits: {
          ...state.edits,
          [activePhotoId]: next,
        },
        histories: {
          ...state.histories,
          [activePhotoId]: {
            past: [...currentHistory.past, current],
            future: newFuture,
          },
        },
        dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(activePhotoId),
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
      const { photoId } = action.payload;
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
            past: [...currentHistory.past, currentEdits],
            future: [],
          },
        },
      };
    }

    case "RESET_ACTIVE_EDIT": {
      const { activePhotoId } = action.payload;
      if (!activePhotoId) return state;
      const currentEdits = state.edits[activePhotoId] || {
        ...INITIAL_EDITS,
      };
      const currentHistory = state.histories[activePhotoId] || {
        past: [],
        future: [],
      };

      return {
        ...state,
        edits: {
          ...state.edits,
          [activePhotoId]: { ...INITIAL_EDITS },
        },
        dirtyPhotoIds: new Set(state.dirtyPhotoIds).add(activePhotoId),
        isDirty: true,
        histories: {
          ...state.histories,
          [activePhotoId]: {
            past: [...currentHistory.past, currentEdits],
            future: [],
          },
        },
      };
    }

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

    case "INIT_PHOTO_EDITS": {
      const { photoId, edits } = action.payload;
      if (state.edits[photoId]) return state; // Already initialized

      return {
        ...state,
        edits: {
          ...state.edits,
          [photoId]: edits || { ...INITIAL_EDITS },
        },
        histories: {
          ...state.histories,
          [photoId]: { past: [], future: [] },
        },
      };
    }

    default:
      return state;
  }
}

// --- Hook ---

export function useEditsState(): [EditsState, EditsActions] {
  const [state, dispatch] = useReducer(editsReducer, initialState);

  // Actions
  const updateEdit = useCallback(
    (activePhotoId: string | null, updates: Partial<ManualEdits>) => {
      if (!activePhotoId) return;
      dispatch({ type: "UPDATE_EDIT", payload: { activePhotoId, updates } });
    },
    [],
  );

  const setEdits = useCallback((photoId: string, edits: ManualEdits) => {
    dispatch({ type: "SET_EDITS", payload: { photoId, edits } });
  }, []);

  const resetEdits = useCallback((photoId: string) => {
    dispatch({ type: "RESET_EDITS", payload: { photoId } });
  }, []);

  const resetActiveEdit = useCallback((activePhotoId: string | null) => {
    if (!activePhotoId) return;
    dispatch({ type: "RESET_ACTIVE_EDIT", payload: { activePhotoId } });
  }, []);

  const undo = useCallback((activePhotoId: string | null) => {
    if (!activePhotoId) return;
    dispatch({ type: "UNDO", payload: { activePhotoId } });
  }, []);

  const redo = useCallback((activePhotoId: string | null) => {
    if (!activePhotoId) return;
    dispatch({ type: "REDO", payload: { activePhotoId } });
  }, []);

  const markSaved = useCallback((ids: string[]) => {
    dispatch({ type: "SAVE_SUCCESS", payload: ids });
  }, []);

  const restoreDraft = useCallback((edits: Record<string, ManualEdits>) => {
    dispatch({ type: "RESTORE_DRAFT", payload: edits });
  }, []);

  const initializePhotoEdits = useCallback(
    (photoId: string, initialEdits?: ManualEdits) => {
      dispatch({
        type: "INIT_PHOTO_EDITS",
        payload: { photoId, edits: initialEdits },
      });
    },
    [],
  );

  // Helper to get active edits
  const getActiveEdits = useCallback(
    (activePhotoId: string | null): ManualEdits | null => {
      if (!activePhotoId) return null;
      return state.edits[activePhotoId] ?? null;
    },
    [state.edits],
  );

  // Helper to get active history
  const getActiveHistory = useCallback(
    (
      activePhotoId: string | null,
    ): { past: ManualEdits[]; future: ManualEdits[] } => {
      if (!activePhotoId) return { past: [], future: [] };
      return state.histories[activePhotoId] || { past: [], future: [] };
    },
    [state.histories],
  );

  const actions = useMemo<EditsActions>(
    () => ({
      updateEdit,
      setEdits,
      resetEdits,
      resetActiveEdit,
      undo,
      redo,
      markSaved,
      restoreDraft,
      initializePhotoEdits,
      getActiveEdits,
      getActiveHistory,
    }),
    [
      updateEdit,
      setEdits,
      resetEdits,
      resetActiveEdit,
      undo,
      redo,
      markSaved,
      restoreDraft,
      initializePhotoEdits,
      getActiveEdits,
      getActiveHistory,
    ],
  );

  return [state, actions];
}
