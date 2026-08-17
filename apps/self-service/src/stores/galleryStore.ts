import { create } from 'zustand';

interface GalleryState {
  searchQuery: string;
  sortBy: 'newest' | 'price_low' | 'price_high';
  locationFilter: string | null;
  setSearchQuery: (q: string) => void;
  setSortBy: (sort: 'newest' | 'price_low' | 'price_high') => void;
  setLocationFilter: (loc: string | null) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  searchQuery: '',
  sortBy: 'newest',
  locationFilter: null,
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSortBy: (s) => set({ sortBy: s }),
  setLocationFilter: (l) => set({ locationFilter: l }),
}));
