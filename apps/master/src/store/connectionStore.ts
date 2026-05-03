import { create } from 'zustand';

export type RealtimeStatus = 'connected' | 'reconnecting' | 'disconnected';

interface ConnectionState {
  status: RealtimeStatus;
  lastHeartbeat: number | null;
  errorCount: number;
  setStatus: (status: RealtimeStatus) => void;
  recordHeartbeat: () => void;
  incrementError: () => void;
  resetErrors: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  lastHeartbeat: null,
  errorCount: 0,
  setStatus: (status) => set({ status }),
  recordHeartbeat: () => set({ lastHeartbeat: Date.now(), status: 'connected' }),
  incrementError: () => set((state) => ({ errorCount: state.errorCount + 1, status: 'disconnected' })),
  resetErrors: () => set({ errorCount: 0 }),
}));
