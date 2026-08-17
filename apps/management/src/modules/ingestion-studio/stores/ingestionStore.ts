import { create } from 'zustand';
import { GradeResult, IngestionSession } from '../types';

interface IngestionState {
  activeTab: 'ingest' | 'sessions' | 'analytics';
  setActiveTab: (tab: 'ingest' | 'sessions' | 'analytics') => void;
  files: File[];
  addFiles: (newFiles: File[]) => void;
  clearFiles: () => void;
  gradingResults: GradeResult[];
  setGradingResults: (results: GradeResult[]) => void;
  updateGradeResult: (id: string, overrideStatus: 'keeper' | 'reject' | 'borderline') => void;
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;
}

export const useIngestionStore = create<IngestionState>((set) => ({
  activeTab: 'ingest',
  setActiveTab: (tab) => set({ activeTab: tab }),
  files: [],
  addFiles: (newFiles) => set((state) => ({ files: [...state.files, ...newFiles] })),
  clearFiles: () => set({ files: [], gradingResults: [], uploadProgress: 0 }),
  gradingResults: [],
  setGradingResults: (results) => set({ gradingResults: results }),
  updateGradeResult: (id, overrideStatus) => set((state) => ({
    gradingResults: state.gradingResults.map(r => r.id === id ? { ...r, status: overrideStatus } : r)
  })),
  uploadProgress: 0,
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
}));
