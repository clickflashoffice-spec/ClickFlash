import { useReducer, useCallback, useMemo } from "react";

// --- Types ---

export interface SelectionState {
  selectedPhotoIds: Set<string>;
  selectedCount: number; // Derived: selectedPhotoIds.size
}

export interface SelectionActions {
  selectAll: (allPhotoIds: string[]) => void;
  deselectAll: () => void;
  toggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
}

type SelectionAction =
  | { type: "SELECT_ALL"; payload: string[] }
  | { type: "DESELECT_ALL" }
  | { type: "TOGGLE_SELECTION"; payload: string };

// --- Reducer ---

const initialState: SelectionState = {
  selectedPhotoIds: new Set(),
  selectedCount: 0,
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
      };
    }

    default:
      return state;
  }
}

// --- Hook ---

export function useSelectionState(): [SelectionState, SelectionActions] {
  const [state, dispatch] = useReducer(selectionReducer, initialState);

  // Derived state
  const selectedCount = state.selectedPhotoIds.size;

  // Actions
  const selectAll = useCallback((allPhotoIds: string[]) => {
    dispatch({ type: "SELECT_ALL", payload: allPhotoIds });
  }, []);

  const deselectAll = useCallback(() => {
    dispatch({ type: "DESELECT_ALL" });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_SELECTION", payload: id });
  }, []);

  // Helper to check if a photo is selected
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
    }),
    [selectAll, deselectAll, toggleSelection, isSelected],
  );

  // Return state with derived selectedCount attached
  const stateWithDerived = useMemo(
    () => ({
      ...state,
      selectedCount,
    }),
    [state, selectedCount],
  );

  return [stateWithDerived, actions];
}
