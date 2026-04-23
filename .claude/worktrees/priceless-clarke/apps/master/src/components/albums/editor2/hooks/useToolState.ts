import { useReducer, useCallback, useMemo } from "react";
import { ManualEdits } from "@/types";

// --- Types ---

export type EditorTool = "adjust" | "crop" | "retouch";

export interface ToolState {
  activeTool: EditorTool;
  copiedEdits: ManualEdits | null;
}

export interface ToolActions {
  setActiveTool: (tool: EditorTool) => void;
  copyEdits: (edits: ManualEdits) => void;
  clearCopiedEdits: () => void;
}

type ToolAction =
  | { type: "SET_ACTIVE_TOOL"; payload: EditorTool }
  | { type: "COPY_EDITS"; payload: ManualEdits }
  | { type: "CLEAR_COPIED" };

// --- Reducer ---

const initialState: ToolState = {
  activeTool: "adjust",
  copiedEdits: null,
};

function toolReducer(state: ToolState, action: ToolAction): ToolState {
  switch (action.type) {
    case "SET_ACTIVE_TOOL":
      return {
        ...state,
        activeTool: action.payload,
      };

    case "COPY_EDITS":
      return {
        ...state,
        copiedEdits: { ...action.payload },
      };

    case "CLEAR_COPIED":
      return {
        ...state,
        copiedEdits: null,
      };

    default:
      return state;
  }
}

// --- Hook ---

export function useToolState(): [ToolState, ToolActions] {
  const [state, dispatch] = useReducer(toolReducer, initialState);

  // Actions
  const setActiveTool = useCallback((tool: EditorTool) => {
    dispatch({ type: "SET_ACTIVE_TOOL", payload: tool });
  }, []);

  const copyEdits = useCallback((edits: ManualEdits) => {
    dispatch({ type: "COPY_EDITS", payload: edits });
  }, []);

  const clearCopiedEdits = useCallback(() => {
    dispatch({ type: "CLEAR_COPIED" });
  }, []);

  const actions = useMemo<ToolActions>(
    () => ({
      setActiveTool,
      copyEdits,
      clearCopiedEdits,
    }),
    [setActiveTool, copyEdits, clearCopiedEdits],
  );

  return [state, actions];
}
