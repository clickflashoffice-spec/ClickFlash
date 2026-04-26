import { useReducer, useCallback, useMemo } from "react";

// --- Types ---

export interface SelectionState {
  selectedPhotoIds: Set<string>;
  selectedCount: number;
  lastSelectedId: string | null;
  anchorId: string | null;
}

export interface SelectionActions {
  selectAll: (allPhotoIds: string[]) => void;
  deselectAll: () => void;
  toggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
  selectRange: (targetId: string, allPhotoIds: string[]) => void;
  setAnchor: (id: string) => void;
  getAnchor: () => string | null;
}

type SelectionAction =
  | { type: "SELECT_ALL"; payload: string[] }
  | { type: "DESELECT_ALL" }
  | { type: "TOGGLE_SELECTION"; payload: string }
  | { type: "SELECT_RANGE"; payload: { targetId: string; allPhotoIds: string[] } }
  | { type: "SET_ANCHOR"; payload: string }
  | { type: "CLEAR_ANCHOR" };

// --- Reducer ---

const initialState: SelectionState = {
  selectedPhotoIds: new Set(),
  selectedCount: 0,
  lastSelectedId: null,
  anchorId: null,
};

function selectionReducer(
  state: SelectionState,
  action: SelectionAction,
): SelectionState {
  switch (action.type) {
    case "SELECT_ALL": {
      const newSet = new Set(action.payload);
      return {
        ...state,
        selectedPhotoIds: newSet,
        selectedCount: newSet.size,
      };
    }

    case "DESELECT_ALL":
      return {
        ...state,
        selectedPhotoIds: new Set(),
        selectedCount: 0,
        lastSelectedId: null,
        anchorId: null,
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
        selectedCount: newSelection.size,
        lastSelectedId: action.payload,
      };
    }

    case "SELECT_RANGE": {
      const { targetId, allPhotoIds } = action.payload;
      const anchorId = state.anchorId || state.lastSelectedId;
      
      if (!anchorId) {
        const newSelection = new Set(state.selectedPhotoIds);
        newSelection.add(targetId);
        return {
          ...state,
          selectedPhotoIds: newSelection,
          selectedCount: newSelection.size,
          lastSelectedId: targetId,
          anchorId: targetId,
        };
      }

      const anchorIndex = allPhotoIds.indexOf(anchorId);
      const targetIndex = allPhotoIds.indexOf(targetId);
      
      if (anchorIndex === -1 || targetIndex === -1) {
        return state;
      }

      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      const rangeIds = allPhotoIds.slice(start, end + 1);

      const newSelection = new Set(state.selectedPhotoIds);
      rangeIds.forEach(id => newSelection.add(id));

      return {
        ...state,
        selectedPhotoIds: newSelection,
        selectedCount: newSelection.size,
        lastSelectedId: targetId,
      };
    }

    case "SET_ANCHOR":
      return {
        ...state,
        anchorId: action.payload,
      };

    case "CLEAR_ANCHOR":
      return {
        ...state,
        anchorId: null,
      };

    default:
      return state;
  }
}

// --- Hook ---

export function useSelectionState(): [SelectionState, SelectionActions] {
  const [state, dispatch] = useReducer(selectionReducer, initialState);

  const selectedCount = state.selectedPhotoIds.size;

  const selectAll = useCallback((allPhotoIds: string[]) => {
    dispatch({ type: "SELECT_ALL", payload: allPhotoIds });
  }, []);

  const deselectAll = useCallback(() => {
    dispatch({ type: "DESELECT_ALL" });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_SELECTION", payload: id });
  }, []);

  const selectRange = useCallback((targetId: string, allPhotoIds: string[]) => {
    dispatch({ type: "SELECT_RANGE", payload: { targetId, allPhotoIds } });
  }, []);

  const setAnchor = useCallback((id: string) => {
    dispatch({ type: "SET_ANCHOR", payload: id });
  }, []);

  const getAnchor = useCallback(() => state.anchorId, [state.anchorId]);

  const isSelected = useCallback(
    (id: string) => state.selectedPhotoIds.has(id),
    [state.selectedPhotoIds],
  );

  const actions = useMemo<SelectionActions>(
    () => ({
      selectAll,
      deselectAll,
      toggleSelection,
      isSelected,
      selectRange,
      setAnchor,
      getAnchor,
    }),
    [selectAll, deselectAll, toggleSelection, isSelected, selectRange, setAnchor, getAnchor],
  );

  const stateWithDerived = useMemo(
    () => ({
      ...state,
      selectedCount,
    }),
    [state, selectedCount],
  );

  return [stateWithDerived, actions];
}
