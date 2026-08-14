import { create } from 'zustand';
import { Photo, ManualEdits } from '@/types';
import { INITIAL_EDITS } from '@/utils/styleUtils';
import { ZoomPanState } from '../hooks/useZoomPan';

const MAX_HISTORY = 50;

function getHistoryCap(totalPhotos: number): number {
  if (totalPhotos > 100) return 10;
  if (totalPhotos > 50) return 20;
  return MAX_HISTORY;
}

function evictLRUHistories(
  histories: Record<string, { past: ManualEdits[]; future: ManualEdits[] }>,
  activePhotoId: string,
  visibleIds: Set<string>,
  _maxHistory: number
): Record<string, { past: ManualEdits[]; future: ManualEdits[] }> {
  const result = { ...histories };
  for (const photoId of Object.keys(result)) {
    if (photoId !== activePhotoId && !visibleIds.has(photoId)) {
      delete result[photoId];
    }
  }
  return result;
}

export interface EditorState {
  activePhotoId: string | null;
  photos: Photo[];
  edits: Record<string, ManualEdits>;
  histories: Record<string, { past: ManualEdits[]; future: ManualEdits[] }>;
  isDirty: boolean;
  dirtyPhotoIds: Set<string>;
  activeTool: 'adjust' | 'crop' | 'retouch';
  selectedPhotoIds: Set<string>;
  copiedEdits: ManualEdits | null;
  zoomStates: Record<string, Pick<ZoomPanState, 'scale' | 'offsetX' | 'offsetY'>>;
  persistZoomPerPhoto: boolean;

  // Actions
  setPhotos: (photos: Photo[]) => void;
  setActivePhoto: (id: string) => void;
  setActiveTool: (tool: 'adjust' | 'crop' | 'retouch') => void;
  updateEdit: (updates: Partial<ManualEdits>) => void;
  setEdits: (photoId: string, edits: ManualEdits) => void;
  undo: () => void;
  redo: () => void;
  resetEdits: (id: string) => void;
  markSaved: (ids: string[]) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelection: (id: string) => void;
  copyEdits: () => void;
  pasteEdits: () => void;
  resetActiveEdit: () => void;
  restoreDraft: (edits: Record<string, ManualEdits>) => void;
  setZoomState: (photoId: string, zoom: Pick<ZoomPanState, 'scale' | 'offsetX' | 'offsetY'>) => void;
  clearZoomState: (photoId: string) => void;
  setPersistZoom: (persist: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activePhotoId: null,
  photos: [],
  edits: {},
  histories: {},
  isDirty: false,
  dirtyPhotoIds: new Set(),
  activeTool: 'adjust',
  selectedPhotoIds: new Set(),
  copiedEdits: null,
  zoomStates: {},
  persistZoomPerPhoto: true,

  setPhotos: (photos) => set((state) => {
    const newPhotoIds = new Set(photos.map((p) => p.id));
    const newEdits = { ...state.edits };
    const newHistories = { ...state.histories };

    Object.keys(newHistories).forEach((id) => {
      if (!newPhotoIds.has(id)) {
        delete newHistories[id];
      }
    });

    photos.forEach((p) => {
      if (!newEdits[p.id] || !state.dirtyPhotoIds.has(p.id)) {
        newEdits[p.id] = p.manualEdits || { ...INITIAL_EDITS };
        newHistories[p.id] = { past: [], future: [] };
      }
    });

    return {
      photos,
      edits: newEdits,
      histories: newHistories,
      zoomStates: {},
    };
  }),

  setActivePhoto: (id) => set((state) => {
    if (state.activePhotoId === id) return state;
    return { activePhotoId: id };
  }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  updateEdit: (updates) => set((state) => {
    if (!state.activePhotoId) return state;
    const currentEdits = state.edits[state.activePhotoId] || { ...INITIAL_EDITS };
    const newEdits = { ...currentEdits, ...updates };
    const currentHistory = state.histories[state.activePhotoId] || { past: [], future: [] };

    const maxHistory = getHistoryCap(state.photos.length);
    const newPast = [...currentHistory.past, currentEdits];
    const trimmedPast = newPast.length > maxHistory ? newPast.slice(-maxHistory) : newPast;

    const visibleIds = new Set(state.photos.slice(0, 10).map((p) => p.id));
    const newHistories = evictLRUHistories(state.histories, state.activePhotoId, visibleIds, maxHistory);
    
    newHistories[state.activePhotoId] = {
      past: trimmedPast,
      future: [],
    };

    const newDirtyIds = new Set(state.dirtyPhotoIds);
    newDirtyIds.add(state.activePhotoId);

    return {
      edits: { ...state.edits, [state.activePhotoId]: newEdits },
      dirtyPhotoIds: newDirtyIds,
      isDirty: true,
      histories: newHistories,
    };
  }),

  setEdits: (photoId, edits) => set((state) => {
    const currentEdits = state.edits[photoId] || { ...INITIAL_EDITS };
    const currentHistory = state.histories[photoId] || { past: [], future: [] };

    const maxHistory = getHistoryCap(state.photos.length);
    const newPast = [...currentHistory.past, currentEdits];
    const trimmedPast = newPast.length > maxHistory ? newPast.slice(-maxHistory) : newPast;

    const visibleIds = new Set(state.photos.slice(0, 10).map((p) => p.id));
    const newHistories = evictLRUHistories(state.histories, state.activePhotoId ?? '', visibleIds, maxHistory);
    
    newHistories[photoId] = {
      past: trimmedPast,
      future: [],
    };

    const newDirtyIds = new Set(state.dirtyPhotoIds);
    newDirtyIds.add(photoId);

    return {
      edits: { ...state.edits, [photoId]: edits },
      dirtyPhotoIds: newDirtyIds,
      isDirty: true,
      histories: newHistories,
    };
  }),

  undo: () => set((state) => {
    if (!state.activePhotoId) return state;
    const currentHistory = state.histories[state.activePhotoId];
    if (!currentHistory || currentHistory.past.length === 0) return state;

    const previous = currentHistory.past[currentHistory.past.length - 1];
    const newPast = currentHistory.past.slice(0, -1);
    const current = state.edits[state.activePhotoId];

    const newDirtyIds = new Set(state.dirtyPhotoIds);
    newDirtyIds.add(state.activePhotoId);

    return {
      edits: { ...state.edits, [state.activePhotoId]: previous },
      histories: {
        ...state.histories,
        [state.activePhotoId]: {
          past: newPast,
          future: [current, ...currentHistory.future],
        },
      },
      dirtyPhotoIds: newDirtyIds,
      isDirty: true,
    };
  }),

  redo: () => set((state) => {
    if (!state.activePhotoId) return state;
    const currentHistory = state.histories[state.activePhotoId];
    if (!currentHistory || currentHistory.future.length === 0) return state;

    const next = currentHistory.future[0];
    const newFuture = currentHistory.future.slice(1);
    const current = state.edits[state.activePhotoId];

    const newDirtyIds = new Set(state.dirtyPhotoIds);
    newDirtyIds.add(state.activePhotoId);

    return {
      edits: { ...state.edits, [state.activePhotoId]: next },
      histories: {
        ...state.histories,
        [state.activePhotoId]: {
          past: [...currentHistory.past, current].slice(-MAX_HISTORY),
          future: newFuture,
        },
      },
      dirtyPhotoIds: newDirtyIds,
      isDirty: true,
    };
  }),

  resetEdits: (id) => set((state) => {
    const currentEdits = state.edits[id] || { ...INITIAL_EDITS };
    const currentHistory = state.histories[id] || { past: [], future: [] };

    const newDirtyIds = new Set(state.dirtyPhotoIds);
    newDirtyIds.add(id);

    return {
      edits: { ...state.edits, [id]: { ...INITIAL_EDITS } },
      histories: {
        ...state.histories,
        [id]: {
          past: [...currentHistory.past, currentEdits].slice(-MAX_HISTORY),
          future: [],
        },
      },
      dirtyPhotoIds: newDirtyIds,
      isDirty: true,
    };
  }),

  markSaved: (ids) => set((state) => {
    const savedIds = new Set(ids);
    const newDirtyIds = new Set([...state.dirtyPhotoIds].filter((id) => !savedIds.has(id)));
    return {
      dirtyPhotoIds: newDirtyIds,
      isDirty: newDirtyIds.size > 0,
    };
  }),

  selectAll: () => set((state) => ({
    selectedPhotoIds: new Set(state.photos.map((p) => p.id)),
  })),

  deselectAll: () => set({ selectedPhotoIds: new Set() }),

  toggleSelection: (id) => set((state) => {
    const newSelection = new Set(state.selectedPhotoIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    return { selectedPhotoIds: newSelection };
  }),

  copyEdits: () => set((state) => {
    const currentEdits = state.activePhotoId ? state.edits[state.activePhotoId] : null;
    if (!currentEdits) return state;
    return { copiedEdits: { ...currentEdits } };
  }),

  pasteEdits: () => set((state) => {
    if (!state.copiedEdits) return state;

    const newEdits = { ...state.edits };
    const newDirtyIds = new Set(state.dirtyPhotoIds);
    const editsToPaste = { ...state.copiedEdits };

    if (state.selectedPhotoIds.size > 0) {
      state.selectedPhotoIds.forEach((id) => {
        newEdits[id] = { ...editsToPaste };
        newDirtyIds.add(id);
      });
    } else if (state.activePhotoId) {
      newEdits[state.activePhotoId] = { ...editsToPaste };
      newDirtyIds.add(state.activePhotoId);
    } else {
      return state;
    }

    return {
      edits: newEdits,
      dirtyPhotoIds: newDirtyIds,
      isDirty: true,
    };
  }),

  resetActiveEdit: () => set((state) => {
    if (!state.activePhotoId) return state;
    const currentEdits = state.edits[state.activePhotoId] || { ...INITIAL_EDITS };
    const currentHistory = state.histories[state.activePhotoId] || { past: [], future: [] };

    const newDirtyIds = new Set(state.dirtyPhotoIds);
    newDirtyIds.add(state.activePhotoId);

    return {
      edits: { ...state.edits, [state.activePhotoId]: { ...INITIAL_EDITS } },
      histories: {
        ...state.histories,
        [state.activePhotoId]: {
          past: [...currentHistory.past, currentEdits].slice(-MAX_HISTORY),
          future: [],
        },
      },
      dirtyPhotoIds: newDirtyIds,
      isDirty: true,
    };
  }),

  restoreDraft: (edits) => set((state) => {
    const newEdits = { ...state.edits, ...edits };
    const newDirtyIds = new Set(state.dirtyPhotoIds);
    Object.keys(edits).forEach((id) => newDirtyIds.add(id));

    return {
      edits: newEdits,
      dirtyPhotoIds: newDirtyIds,
      isDirty: true,
    };
  }),

  setZoomState: (photoId, zoom) => set((state) => ({
    zoomStates: { ...state.zoomStates, [photoId]: zoom },
  })),

  clearZoomState: (photoId) => set((state) => {
    const newZoomStates = { ...state.zoomStates };
    delete newZoomStates[photoId];
    return { zoomStates: newZoomStates };
  }),

  setPersistZoom: (persist) => set({ persistZoomPerPhoto: persist }),

}));
