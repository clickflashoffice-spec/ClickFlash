import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UploadBatchItem, PhotographerSession, PhotographerStats } from '@clickflash/types';

export type { UploadBatchItem, PhotographerSession, PhotographerStats };

interface PhotographerStoreState {
  session: PhotographerSession | null;
  batch: UploadBatchItem[];
  stats: PhotographerStats;
  isUploading: boolean;
  setSession: (session: PhotographerSession | null) => void;
  updateEventDetails: (eventName: string, accessCode: string, wristbandId?: string) => void;
  addFilesToBatch: (newItems: UploadBatchItem[]) => void;
  updateBatchItem: (id: string, updates: Partial<UploadBatchItem>) => void;
  toggleKeeper: (id: string) => void;
  removeBatchItem: (id: string) => void;
  clearCompletedBatch: () => void;
  setIsUploading: (uploading: boolean) => void;
  setStats: (stats: Partial<PhotographerStats>) => void;
}

export const usePhotographerStore = create<PhotographerStoreState>()(
  persist(
    (set) => ({
      session: {
        photographerId: 'photog_freelance_01',
        photographerName: 'Alex Rivera (Freelance Pro)',
        token: 'mock_jwt_photog_session',
        activeEventName: 'Sunset VIP Coaster & Waterslide',
        activeAccessCode: 'SUNSET2026',
      },
      batch: [],
      stats: {
        totalUploaded: 1420,
        totalKeepers: 1180,
        guestViews: 840,
        completedOrders: 194,
        earnedCommissionsCents: 87300, // $873.00
        payoutStatus: 'connected',
      },
      isUploading: false,
      setSession: (session) => set({ session }),
      updateEventDetails: (eventName, accessCode, wristbandId) => set((state) => ({
        session: state.session ? {
          ...state.session,
          activeEventName: eventName,
          activeAccessCode: accessCode,
          activeWristbandId: wristbandId
        } : null
      })),
      addFilesToBatch: (newItems) => set((state) => ({
        batch: [...state.batch, ...newItems]
      })),
      updateBatchItem: (id, updates) => set((state) => ({
        batch: state.batch.map(item => item.id === id ? { ...item, ...updates } : item)
      })),
      toggleKeeper: (id) => set((state) => ({
        batch: state.batch.map(item => item.id === id ? { ...item, isKeeper: !item.isKeeper } : item)
      })),
      removeBatchItem: (id) => set((state) => ({
        batch: state.batch.filter(item => item.id !== id)
      })),
      clearCompletedBatch: () => set((state) => ({
        batch: state.batch.filter(item => item.status !== 'completed')
      })),
      setIsUploading: (uploading) => set({ isUploading: uploading }),
      setStats: (updates) => set((state) => ({
        stats: { ...state.stats, ...updates }
      }))
    }),
    {
      name: 'clickflash-photog-store',
    }
  )
);
