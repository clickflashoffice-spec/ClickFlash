import { useReducer, useCallback, useMemo } from "react";
import { Photo } from "@/types";

// --- Types ---

export interface PhotoState {
  photos: Photo[];
  activePhotoId: string | null;
  activePhoto: Photo | null; // Derived: photos.find(p => p.id === activePhotoId) || null
}

export interface PhotoActions {
  setPhotos: (photos: Photo[]) => void;
  setActivePhoto: (id: string) => void;
}

type PhotoAction =
  | { type: "SET_PHOTOS"; payload: Photo[] }
  | { type: "SET_ACTIVE_PHOTO"; payload: string };

// --- Reducer ---

const initialState: PhotoState = {
  photos: [],
  activePhotoId: null,
  activePhoto: null, // Derived, starts null
};

function photoReducer(state: PhotoState, action: PhotoAction): PhotoState {
  switch (action.type) {
    case "SET_PHOTOS": {
      // When setting photos, clear active if not in new list
      const newPhotoIds = action.payload.map((p) => p.id);
      const activePhotoId = state.activePhotoId
        ? newPhotoIds.includes(state.activePhotoId)
          ? state.activePhotoId
          : (action.payload[0]?.id ?? null)
        : (action.payload[0]?.id ?? null);
      const activePhoto = activePhotoId
        ? (action.payload.find((p) => p.id === activePhotoId) ?? null)
        : null;

      return {
        photos: action.payload,
        activePhotoId,
        activePhoto,
      };
    }

    case "SET_ACTIVE_PHOTO": {
      if (state.activePhotoId === action.payload) return state;
      const newActivePhoto = action.payload
        ? (state.photos.find((p) => p.id === action.payload) ?? null)
        : null;
      return {
        ...state,
        activePhotoId: action.payload,
        activePhoto: newActivePhoto,
      };
    }

    default:
      return state;
  }
}

// --- Hook ---

export function usePhotoState(
  initialPhotos: Photo[] = [],
): [PhotoState, PhotoActions] {
  const [state, dispatch] = useReducer(photoReducer, {
    ...initialState,
    photos: initialPhotos,
    // Set initial active photo to first photo if available
    activePhotoId: initialPhotos[0]?.id ?? null,
  });

  // Derived state
  const activePhoto = useMemo(() => {
    return state.activePhotoId
      ? (state.photos.find((p) => p.id === state.activePhotoId) ?? null)
      : null;
  }, [state.photos, state.activePhotoId]);

  // Actions
  const setPhotos = useCallback((photos: Photo[]) => {
    dispatch({ type: "SET_PHOTOS", payload: photos });
  }, []);

  const setActivePhoto = useCallback((id: string) => {
    dispatch({ type: "SET_ACTIVE_PHOTO", payload: id });
  }, []);

  const actions = useMemo<PhotoActions>(
    () => ({
      setPhotos,
      setActivePhoto,
    }),
    [setPhotos, setActivePhoto],
  );

  // Return state with derived activePhoto attached for convenience
  const stateWithDerived = useMemo(
    () => ({
      ...state,
      activePhoto,
    }),
    [state, activePhoto],
  );

  return [stateWithDerived, actions];
}

export type {
  PhotoState as EditorPhotoState,
  PhotoActions as EditorPhotoActions,
};
