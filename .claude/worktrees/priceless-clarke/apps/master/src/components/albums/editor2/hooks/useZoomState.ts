import { useReducer, useCallback, useMemo } from "react";
import { ZoomPanState } from "./useZoomPan";

// --- Types ---

export interface ZoomState {
  zoomStates: Record<
    string,
    Pick<ZoomPanState, "scale" | "offsetX" | "offsetY">
  >;
  persistZoomPerPhoto: boolean;
}

export interface ZoomActions {
  setZoomState: (
    photoId: string,
    zoom: Pick<ZoomPanState, "scale" | "offsetX" | "offsetY">,
  ) => void;
  clearZoomState: (photoId: string) => void;
  setPersistZoom: (persist: boolean) => void;
  getZoomState: (
    photoId: string,
  ) => Pick<ZoomPanState, "scale" | "offsetX" | "offsetY"> | null;
}

type ZoomAction =
  | {
      type: "SET_ZOOM_STATE";
      payload: {
        photoId: string;
        zoom: Pick<ZoomPanState, "scale" | "offsetX" | "offsetY">;
      };
    }
  | { type: "CLEAR_ZOOM_STATE"; payload: string }
  | { type: "SET_PERSIST_ZOOM"; payload: boolean };

// --- Reducer ---

const initialState: ZoomState = {
  zoomStates: {},
  persistZoomPerPhoto: true,
};

function zoomReducer(state: ZoomState, action: ZoomAction): ZoomState {
  switch (action.type) {
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

    case "SET_PERSIST_ZOOM":
      return {
        ...state,
        persistZoomPerPhoto: action.payload,
      };

    default:
      return state;
  }
}

// --- Hook ---

export function useZoomState(): [ZoomState, ZoomActions] {
  const [state, dispatch] = useReducer(zoomReducer, initialState);

  // Actions
  const setZoomState = useCallback(
    (
      photoId: string,
      zoom: Pick<ZoomPanState, "scale" | "offsetX" | "offsetY">,
    ) => {
      dispatch({ type: "SET_ZOOM_STATE", payload: { photoId, zoom } });
    },
    [],
  );

  const clearZoomState = useCallback((photoId: string) => {
    dispatch({ type: "CLEAR_ZOOM_STATE", payload: photoId });
  }, []);

  const setPersistZoom = useCallback((persist: boolean) => {
    dispatch({ type: "SET_PERSIST_ZOOM", payload: persist });
  }, []);

  // Helper to get zoom state for a specific photo
  const getZoomState = useCallback(
    (
      photoId: string,
    ): Pick<ZoomPanState, "scale" | "offsetX" | "offsetY"> | null => {
      return state.zoomStates[photoId] ?? null;
    },
    [state.zoomStates],
  );

  const actions = useMemo<ZoomActions>(
    () => ({
      setZoomState,
      clearZoomState,
      setPersistZoom,
      getZoomState,
    }),
    [setZoomState, clearZoomState, setPersistZoom, getZoomState],
  );

  return [state, actions];
}
